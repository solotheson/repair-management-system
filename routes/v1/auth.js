const express = require('express');
const { body } = require('express-validator');
const userRepository = require('../../repositories/user');
const { validateRequestPayload } = require('../../middlewares/validators');
const { signAccessToken } = require('../../services/jwt');
const { requireAuth } = require('../../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * /repair/v1/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login (email or telephone number)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, password]
 *             properties:
 *               id:
 *                 type: string
 *                 description: Email or telephone number
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 example: change_me
 *     responses:
 *       200:
 *         description: Authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     role: { type: string, example: superadmin }
 *                     email: { type: string }
 *                     telephone_number: { type: string, nullable: true }
 *                     first_name: { type: string, nullable: true }
 *                     last_name: { type: string, nullable: true }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: User inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       422:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrors'
 */
router.post(
  '/login',
  [
    body('id').trim().notEmpty().withMessage('id_is_required'),
    body('password').notEmpty().withMessage('password_is_required'),
    validateRequestPayload,
  ],
  async (req, res) => {
    const { id, password } = req.body;

    const user = await userRepository.getUserByEmailOrPhone({ id });
    if (!user) return res.status(401).send({ message: 'invalid_credentials' });
    if (user.status !== 'active') return res.status(403).send({ message: 'user_inactive' });

    const ok = await userRepository.verifyPassword({ user, password });
    if (!ok) return res.status(401).send({ message: 'invalid_credentials' });

    user.last_login_at = new Date();
    await user.save();

    const access_token = signAccessToken({ user });
    return res.status(200).send({
      access_token,
      user: {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        telephone_number: user.telephone_number,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  }
);

/**
 * @swagger
 * /repair/v1/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     role: { type: string }
 *                     email: { type: string }
 *                     telephone_number: { type: string, nullable: true }
 *                     first_name: { type: string, nullable: true }
 *                     last_name: { type: string, nullable: true }
 *       401:
 *         description: Missing/invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
router.get('/me', [requireAuth], async (req, res) => {
  const user = req.user;
  return res.status(200).send({
    user: {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      telephone_number: user.telephone_number,
      first_name: user.first_name,
      last_name: user.last_name,
    },
  });
});

module.exports = router;
