const mongoose = require('mongoose');
const { APP_ROLES } = require('../config/app');

const UserSchema = new mongoose.Schema(
  {
    first_name: { type: String, trim: true, default: null },
    last_name: { type: String, trim: true, default: null },
    email: { type: String, trim: true, lowercase: true, required: true, index: true, unique: true },
    telephone_number: { type: String, trim: true, default: null, index: true, unique: true, sparse: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: Object.values(APP_ROLES), required: true, index: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', index: true },
    last_login_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('User', UserSchema);
