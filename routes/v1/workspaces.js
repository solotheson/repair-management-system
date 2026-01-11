const express = require('express');
const { requireAuth } = require('../../middlewares/auth');
const workspaceMemberRepository = require('../../repositories/workspaceMember');
const Workspace = require('../../schemas/workspace');

const repairsRoutes = require('./workspaces/repairs');
const membersRoutes = require('./workspaces/members');

const router = express.Router();

/**
 * @swagger
 * /repair/v1/workspaces:
 *   get:
 *     tags:
 *       - Workspaces
 *     summary: List workspaces for current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Workspace list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workspaces:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       role: { type: string, nullable: true, example: owner }
 *       401:
 *         description: Missing/invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 */
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
