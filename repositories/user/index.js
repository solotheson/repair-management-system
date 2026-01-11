const bcrypt = require('bcryptjs');
const User = require('../../schemas/user');
const { APP_ROLES } = require('../../config/app');

async function getUserById({ id }) {
  return User.findById(id);
}

async function getUserByEmailOrPhone({ id }) {
  const normalized = (id || '').trim().toLowerCase();
  if (!normalized) return null;
  return User.findOne({
    $or: [{ email: normalized }, { telephone_number: normalized }],
  });
}

async function superadminExists() {
  const count = await User.countDocuments({ role: APP_ROLES.superadmin });
  return count > 0;
}

async function createUser({
  first_name = null,
  last_name = null,
  email,
  telephone_number = null,
  password,
  role = APP_ROLES.user,
}) {
  const password_hash = await bcrypt.hash(password, 10);
  return User.create({
    first_name,
    last_name,
    email,
    telephone_number,
    password_hash,
    role,
    status: 'active',
  });
}

async function verifyPassword({ user, password }) {
  return bcrypt.compare(password, user.password_hash);
}

module.exports = {
  getUserById,
  getUserByEmailOrPhone,
  superadminExists,
  createUser,
  verifyPassword,
};
