const workspaceRepository = require('../repositories/workspace');
const workspaceMemberRepository = require('../repositories/workspaceMember');

async function requireWorkspaceMember(req, res, next) {
  try {
    const { workspace_id } = req.params;
    if (!workspace_id) return res.status(400).send({ message: 'workspace_id_is_required' });

    const workspace = await workspaceRepository.getWorkspaceById({ id: workspace_id });
    if (!workspace) return res.status(404).send({ message: 'workspace_not_found' });
    if (workspace.status !== 'active') return res.status(403).send({ message: 'workspace_inactive' });

    const member = await workspaceMemberRepository.getWorkspaceMember({
      workspace_id,
      user_id: req.me.user_id,
    });
    if (!member || member.status !== 'active') return res.status(403).send({ message: 'not_a_workspace_member' });

    req.workspace = workspace;
    req.workspace_member = member;
    return next();
  } catch (error) {
    console.error('requireWorkspaceMember error:', error);
    return res.status(500).send({ message: 'internal_server_error' });
  }
}

function requireWorkspaceAdmin(req, res, next) {
  if (!req.workspace_member) return res.status(500).send({ message: 'workspace_member_context_missing' });
  if (req.workspace_member.role === 'owner' || req.workspace_member.role === 'admin') return next();
  return res.status(403).send({ message: 'forbidden' });
}

module.exports = { requireWorkspaceMember, requireWorkspaceAdmin };
