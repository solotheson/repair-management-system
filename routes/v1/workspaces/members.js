const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../../../middlewares/auth');
const { requireWorkspaceMember, requireWorkspaceAdmin } = require('../../../middlewares/workspace');
const { validateRequestPayload } = require('../../../middlewares/validators');
const userRepository = require('../../../repositories/user');
const workspaceMemberRepository = require('../../../repositories/workspaceMember');
const WorkspaceMember = require('../../../schemas/workspace_member');

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /repair/v1/workspaces/{workspace_id}/members:
 *   get:
 *     tags:
 *       - Workspace Members
 *     summary: List members in a workspace
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspace_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Member list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       role: { type: string, example: member }
 *                       status: { type: string, example: active }
 *                       joined_at: { type: string, format: date-time, nullable: true }
 *                       user:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id: { type: string }
 *                           email: { type: string }
 *                           telephone_number: { type: string, nullable: true }
 *                           first_name: { type: string, nullable: true }
 *                           last_name: { type: string, nullable: true }
 *                           role: { type: string }
 *                           status: { type: string }
 *                       created_at: { type: string, format: date-time }
 *       401:
 *         description: Missing/invalid token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UnauthorizedError' }
 *       403:
 *         description: Not a workspace member
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ForbiddenError' }
 */
router.get('/', [requireAuth, requireWorkspaceMember], async (req, res) => {
  const members = await workspaceMemberRepository.listWorkspaceMembers({ workspace_id: req.params.workspace_id });

  const populated = await WorkspaceMember.find({ _id: { $in: members.map(m => m._id) } })
    .populate('user_id', 'email telephone_number first_name last_name role status')
    .sort({ created_at: -1 });

  return res.status(200).send({
    members: populated.map(m => ({
      id: m._id.toString(),
      role: m.role,
      status: m.status,
      joined_at: m.joined_at,
      user: m.user_id
        ? {
            id: m.user_id._id.toString(),
            email: m.user_id.email,
            telephone_number: m.user_id.telephone_number,
            first_name: m.user_id.first_name,
            last_name: m.user_id.last_name,
            role: m.user_id.role,
            status: m.user_id.status,
          }
        : null,
      created_at: m.created_at,
    })),
  });
});

/**
 * @swagger
 * /repair/v1/workspaces/{workspace_id}/members:
 *   post:
 *     tags:
 *       - Workspace Members
 *     summary: Add a member to workspace (creates user if needed)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspace_id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: member@example.com }
 *               password:
 *                 type: string
 *                 description: Required only when creating a brand new user
 *                 nullable: true
 *               first_name: { type: string, nullable: true }
 *               last_name: { type: string, nullable: true }
 *               telephone_number: { type: string, nullable: true }
 *               role: { type: string, enum: [owner, admin, member], example: member }
 *     responses:
 *       201:
 *         description: Member created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 member:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *       200:
 *         description: Member restored from removed state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 member:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *       401:
 *         description: Missing/invalid token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UnauthorizedError' }
 *       403:
 *         description: Requires workspace admin/owner
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ForbiddenError' }
 *       409:
 *         description: Member already exists
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 *       422:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationErrors' }
 */
router.post(
  '/',
  [
    requireAuth,
    requireWorkspaceMember,
    requireWorkspaceAdmin,
    body('email').trim().toLowerCase().notEmpty().withMessage('email_is_required'),
    body('password').optional().isString().withMessage('password_is_invalid'),
    body('first_name').trim().optional({ nullable: true }),
    body('last_name').trim().optional({ nullable: true }),
    body('telephone_number').trim().optional({ nullable: true }),
    body('role').optional().isIn(['owner', 'admin', 'member']).withMessage('role_is_invalid'),
    validateRequestPayload,
  ],
  async (req, res) => {
    const { email, password, first_name = null, last_name = null, telephone_number = null } = req.body;
    const role = req.body.role || 'member';

    let user = await userRepository.getUserByEmailOrPhone({ id: email });
    if (!user) {
      if (!password) return res.status(422).send({ errors: [{ field: 'password', message: 'password_is_required_for_new_user' }] });
      user = await userRepository.createUser({
        email,
        password,
        first_name,
        last_name,
        telephone_number,
      });
    }

    const existing = await workspaceMemberRepository.getWorkspaceMember({
      workspace_id: req.params.workspace_id,
      user_id: user._id,
    });
    if (existing && existing.status !== 'removed') {
      return res.status(409).send({ message: 'member_already_exists' });
    }

    if (existing && existing.status === 'removed') {
      existing.status = 'active';
      existing.role = role;
      existing.joined_at = existing.joined_at || new Date();
      await existing.save();
      return res.status(200).send({ member: { id: existing._id.toString() } });
    }

    const member = await workspaceMemberRepository.createWorkspaceMember({
      workspace_id: req.params.workspace_id,
      user_id: user._id,
      invited_by_user_id: req.me.user_id,
      role,
      status: 'active',
      joined_at: new Date(),
    });

    return res.status(201).send({ member: { id: member._id.toString() } });
  }
);

/**
 * @swagger
 * /repair/v1/workspaces/{workspace_id}/members/{member_id}:
 *   delete:
 *     tags:
 *       - Workspace Members
 *     summary: Remove a workspace member
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspace_id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: member_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       401:
 *         description: Missing/invalid token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UnauthorizedError' }
 *       403:
 *         description: Requires workspace admin/owner
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ForbiddenError' }
 *       404:
 *         description: Member not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 *       422:
 *         description: Cannot remove owner
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 */
router.delete('/:member_id', [requireAuth, requireWorkspaceMember, requireWorkspaceAdmin], async (req, res) => {
  const member = await workspaceMemberRepository.getWorkspaceMemberById({
    id: req.params.member_id,
    workspace_id: req.params.workspace_id,
  });
  if (!member || member.status === 'removed') return res.status(404).send({ message: 'member_not_found' });

  if (member.role === 'owner') return res.status(422).send({ message: 'owner_cannot_be_removed' });

  await workspaceMemberRepository.removeWorkspaceMember({ member });
  return res.status(200).send({ ok: true });
});

module.exports = router;
