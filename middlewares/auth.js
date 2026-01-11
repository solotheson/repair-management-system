const { verifyAccessToken } = require('../services/jwt');
const userRepository = require('../repositories/user');
const { APP_ROLES } = require('../config/app');

function getBearerToken({ req }) {
  const header = req.headers['authorization'];
  if (!header) return null;
  return header.replace(/^Bearer\s+/i, '').trim();
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken({ req });
    if (!token) return res.status(401).send({ message: 'missing_authorization' });

    const decoded = verifyAccessToken({ token });
    const user = await userRepository.getUserById({ id: decoded.user_id });
    if (!user) return res.status(401).send({ message: 'invalid_token_user_not_found' });
    if (user.status !== 'active') return res.status(403).send({ message: 'user_inactive' });

    req.me = { user_id: user._id.toString(), role: user.role };
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).send({ message: 'invalid_token' });
  }
}

function requireSuperadmin(req, res, next) {
  if (!req.me) return res.status(401).send({ message: 'missing_auth' });
  if (req.me.role !== APP_ROLES.superadmin) return res.status(403).send({ message: 'forbidden' });
  return next();
}

module.exports = { requireAuth, requireSuperadmin };
