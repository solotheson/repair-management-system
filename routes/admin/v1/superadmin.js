const express = require('express');
const { body } = require('express-validator');
const userRepository = require('../../../repositories/user');
const { validateRequestPayload } = require('../../../middlewares/validators');
const { APP_ROLES } = require('../../../config/app');

require('dotenv').config();

const router = express.Router();

/**
 * @swagger
 * /repair/admin/v1/superadmin/bootstrap:
 *   post:
 *     tags:
 *       - Admin - Superadmin
 *     summary: Bootstrap first superadmin (one-time)
 *     description: Only works if no superadmin exists yet. Requires X-Bootstrap-Token header matching BOOTSTRAP_TOKEN.
 *     parameters:
 *       - in: header
 *         name: X-Bootstrap-Token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@example.com }
 *               password: { type: string, example: change_me }
 *               first_name: { type: string, nullable: true }
 *               last_name: { type: string, nullable: true }
 *               telephone_number: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     role: { type: string, example: superadmin }
 *                     email: { type: string }
 *       401:
 *         description: Missing/invalid bootstrap token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       409:
 *         description: Superadmin already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardError'
 *       422:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrors'
 */
function requireBootstrapToken(req, res, next) {
  const expected = process.env.BOOTSTRAP_TOKEN;
  if (!expected) return res.status(500).send({ message: 'BOOTSTRAP_TOKEN_not_configured' });

  const provided = (req.headers['x-bootstrap-token'] || '').toString();
  if (!provided) return res.status(401).send({ message: 'missing_bootstrap_token' });
  if (provided !== expected) return res.status(401).send({ message: 'invalid_bootstrap_token' });

  return next();
}

router.post(
  '/bootstrap',
  [
    requireBootstrapToken,
    body('email').trim().toLowerCase().notEmpty().withMessage('email_is_required'),
    body('password').notEmpty().withMessage('password_is_required'),
    body('first_name').trim().optional({ nullable: true }),
    body('last_name').trim().optional({ nullable: true }),
    body('telephone_number').trim().optional({ nullable: true }),
    validateRequestPayload,
  ],
  async (req, res) => {
    const exists = await userRepository.superadminExists();
    if (exists) return res.status(409).send({ message: 'superadmin_already_exists' });

    const { email, password, first_name = null, last_name = null, telephone_number = null } = req.body;
    const user = await userRepository.createUser({
      email,
      password,
      first_name,
      last_name,
      telephone_number,
      role: APP_ROLES.superadmin,
    });

    return res.status(201).send({
      user: {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
      },
    });
  }
);

module.exports = router;
