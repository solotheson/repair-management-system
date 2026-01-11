const WorkspaceMember = require('../../schemas/workspace_member');

async function getWorkspaceMember({ workspace_id, user_id }) {
  return WorkspaceMember.findOne({ workspace_id, user_id });
}

async function getWorkspaceMemberById({ id, workspace_id }) {
  return WorkspaceMember.findOne({ _id: id, workspace_id });
}

async function listWorkspacesForUser({ user_id }) {
  return WorkspaceMember.find({ user_id, status: 'active' });
}

async function listWorkspaceMembers({ workspace_id }) {
  return WorkspaceMember.find({ workspace_id, status: { $ne: 'removed' } }).sort({ created_at: -1 });
}

async function createWorkspaceMember({
  workspace_id,
  user_id,
  invited_by_user_id = null,
  role = 'member',
  status = 'active',
  joined_at = new Date(),
}) {
  return WorkspaceMember.create({
    workspace_id,
    user_id,
    invited_by_user_id,
    role,
    status,
    joined_at,
  });
}

async function removeWorkspaceMember({ member }) {
  member.status = 'removed';
  await member.save();
  return member;
}

module.exports = {
  getWorkspaceMember,
  getWorkspaceMemberById,
  listWorkspacesForUser,
  listWorkspaceMembers,
  createWorkspaceMember,
  removeWorkspaceMember,
};
