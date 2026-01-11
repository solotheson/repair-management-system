const express = require('express');
const { body } = require('express-validator');
const { validateRequestPayload } = require('../../../middlewares/validators');
const { requireAuth, requireSuperadmin } = require('../../../middlewares/auth');
const userRepository = require('../../../repositories/user');
const workspaceRepository = require('../../../repositories/workspace');
const workspaceMemberRepository = require('../../../repositories/workspaceMember');

const router = express.Router();

/**
 * @swagger
 * /repair/admin/v1/workspaces:
 *   post:
 *     tags:
 *       - Admin - Workspaces
 *     summary: Create workspace (and owner membership)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, owner]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Main Workshop
 *               owner:
 *                 type: object
 *                 required: [email, password]
 *                 properties:
 *                   email: { type: string, example: owner@example.com }
 *                   password: { type: string, example: change_me }
 *                   first_name: { type: string, nullable: true }
 *                   last_name: { type: string, nullable: true }
 *                   telephone_number: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Workspace created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workspace:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     owner_user_id: { type: string }
 *       401:
 *         description: Missing/invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       403:
 *         description: Not superadmin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenError'
 *       422:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrors'
 */
router.post(
  '/',
  [
    requireAuth,
    requireSuperadmin,
    body('name').trim().notEmpty().withMessage('name_is_required'),
    body('owner.email').trim().toLowerCase().notEmpty().withMessage('owner.email_is_required'),
    body('owner.password').notEmpty().withMessage('owner.password_is_required'),
    body('owner.first_name').trim().optional({ nullable: true }),
    body('owner.last_name').trim().optional({ nullable: true }),
    body('owner.telephone_number').trim().optional({ nullable: true }),
    validateRequestPayload,
  ],
  async (req, res) => {
    const { name, owner } = req.body;

    let ownerUser = await userRepository.getUserByEmailOrPhone({ id: owner.email });
    if (!ownerUser) {
      ownerUser = await userRepository.createUser({
        email: owner.email,
        password: owner.password,
        first_name: owner.first_name || null,
        last_name: owner.last_name || null,
        telephone_number: owner.telephone_number || null,
      });
    }

    const workspace = await workspaceRepository.createWorkspace({
      name,
      created_by_user_id: req.me.user_id,
      owner_user_id: ownerUser._id,
    });

    await workspaceMemberRepository.createWorkspaceMember({
      workspace_id: workspace._id,
      user_id: ownerUser._id,
      invited_by_user_id: req.me.user_id,
      role: 'owner',
      status: 'active',
      joined_at: new Date(),
    });

    return res.status(201).send({
      workspace: {
        id: workspace._id.toString(),
        name: workspace.name,
        owner_user_id: workspace.owner_user_id.toString(),
      },
    });
  }
);

module.exports = router;
