const mongoose = require('mongoose');

const WorkspaceMemberSchema = new mongoose.Schema(
  {
    workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invited_by_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member', index: true },
    status: { type: String, enum: ['active', 'invited', 'removed'], default: 'active', index: true },
    joined_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

WorkspaceMemberSchema.index({ workspace_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('WorkspaceMember', WorkspaceMemberSchema);
