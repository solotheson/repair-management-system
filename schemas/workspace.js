const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true, index: true },
    created_by_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    owner_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

module.exports = mongoose.model('Workspace', WorkspaceSchema);
