const jwt = require('jsonwebtoken');

require('dotenv').config();

function signAccessToken({ user }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET_is_required');

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      user_id: user._id.toString(),
      role: user.role,
    },
    secret,
    { expiresIn }
  );
}

function verifyAccessToken({ token }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET_is_required');
  return jwt.verify(token, secret);
}

module.exports = { signAccessToken, verifyAccessToken };
