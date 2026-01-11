const express = require('express');
const { body } = require('express-validator');
const { validateRequestPayload } = require('../../../middlewares/validators');
const { requireAuth, requireSuperadmin } = require('../../../middlewares/auth');
const userRepository = require('../../../repositories/user');
const workspaceRepository = require('../../../repositories/workspace');
const workspaceMemberRepository = require('../../../repositories/workspaceMember');

const router = express.Router();

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
