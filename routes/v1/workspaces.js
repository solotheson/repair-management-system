const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const workspaceMemberRepository = require('../../repositories/workspaceMember');
const Workspace = require('../../schemas/workspace');

const repairsRoutes = require('./workspaces/repairs');
const membersRoutes = require('./workspaces/members');

const router = express.Router();

router.get('/', [requireAuth], async (req, res) => {
  const memberships = await workspaceMemberRepository.listWorkspacesForUser({ user_id: req.me.user_id });
  const workspaceIds = memberships.map(m => m.workspace_id);
  const workspaces = await Workspace.find({ _id: { $in: workspaceIds }, status: 'active' }).sort({ created_at: -1 });

  const roleByWorkspace = new Map(memberships.map(m => [m.workspace_id.toString(), m.role]));
  return res.status(200).send({
    workspaces: workspaces.map(w => ({
      id: w._id.toString(),
      name: w.name,
      role: roleByWorkspace.get(w._id.toString()) || null,
    })),
  });
});

router.use('/:workspace_id/repairs', repairsRoutes);
router.use('/:workspace_id/members', membersRoutes);

module.exports = router;
