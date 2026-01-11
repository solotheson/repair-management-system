const express = require('express');
const { body } = require('express-validator');
const userRepository = require('../../repositories/user');
const { validateRequestPayload } = require('../../middlewares/validators');
const { signAccessToken } = require('../../services/jwt');
const { requireAuth } = require('../../middlewares/auth');

const router = express.Router();

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
