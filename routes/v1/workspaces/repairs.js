const express = require('express');
const { body, query } = require('express-validator');
const { requireAuth } = require('../../../middlewares/auth');
const { requireWorkspaceMember } = require('../../../middlewares/workspace');
const { validateRequestPayload } = require('../../../middlewares/validators');
const repairRepository = require('../../../repositories/repair');
const repairActivityRepository = require('../../../repositories/repairActivity');
const { APP_REPAIR_STATUS } = require('../../../config/app');
const beemService = require('../../../services/beem');

const router = express.Router({ mergeParams: true });

router.get(
  '/',
  [
    requireAuth,
    requireWorkspaceMember,
    query('status').optional().isIn(Object.values(APP_REPAIR_STATUS)).withMessage('status_is_invalid'),
    validateRequestPayload,
  ],
  async (req, res) => {
    const repairs = await repairRepository.listRepairs({
      workspace_id: req.params.workspace_id,
      status: req.query.status,
    });
    return res.status(200).send({
      repairs: repairs.map(r => ({
        id: r._id.toString(),
        status: r.status,
        customer: r.customer,
        item: r.item,
        issue_description: r.issue_description,
        received_at: r.received_at,
        completed_at: r.completed_at,
        created_at: r.created_at,
      })),
    });
  }
);

router.post(
  '/',
  [
    requireAuth,
    requireWorkspaceMember,
    body('customer.name').trim().notEmpty().withMessage('customer.name_is_required'),
    body('customer.telephone_number').trim().notEmpty().withMessage('customer.telephone_number_is_required'),
    body('issue_description').trim().notEmpty().withMessage('issue_description_is_required'),
    body('message').trim().optional({ nullable: true }),
    body('item.type').trim().optional({ nullable: true }),
    body('item.brand').trim().optional({ nullable: true }),
    body('item.model').trim().optional({ nullable: true }),
    body('item.serial_number').trim().optional({ nullable: true }),
    validateRequestPayload,
  ],
  async (req, res) => {
    const repair = await repairRepository.createRepair({
      workspace_id: req.params.workspace_id,
      created_by_user_id: req.me.user_id,
      customer: req.body.customer,
      item: req.body.item || {},
      issue_description: req.body.issue_description,
    });

    await repairActivityRepository.addActivity({
      repair_id: repair._id,
      workspace_id: repair.workspace_id,
      actor_user_id: req.me.user_id,
      type: 'created',
      from_status: null,
      to_status: repair.status,
    });

    const message = (req.body.message || '').toString().trim();
    if (message && repair.customer && repair.customer.telephone_number) {
      beemService
        .sendSMS({
          message,
          recipients: [{ recipient_id: repair.customer.telephone_number }],
        })
        .catch((error) => console.error('Beem sendSMS (create repair) failed:', error));
    }

    return res.status(201).send({ repair: { id: repair._id.toString() } });
  }
);

router.post(
  '/:repair_id/complete',
  [
    requireAuth,
    requireWorkspaceMember,
    body('message').trim().optional({ nullable: true }),
    validateRequestPayload,
  ],
  async (req, res) => {
    const repair = await repairRepository.getRepairById({
      id: req.params.repair_id,
      workspace_id: req.params.workspace_id,
    });
    if (!repair) return res.status(404).send({ message: 'repair_not_found' });

    const fromStatus = repair.status;
    await repairRepository.completeRepair({ repair });

    await repairActivityRepository.addActivity({
      repair_id: repair._id,
      workspace_id: repair.workspace_id,
      actor_user_id: req.me.user_id,
      type: 'status_changed',
      from_status: fromStatus,
      to_status: repair.status,
    });

    const message = (req.body.message || '').toString().trim();
    if (message && repair.customer && repair.customer.telephone_number) {
      beemService
        .sendSMS({
          message,
          recipients: [{ recipient_id: repair.customer.telephone_number }],
        })
        .catch((error) => console.error('Beem sendSMS (complete repair) failed:', error));
    }

    return res.status(200).send({
      repair: {
        id: repair._id.toString(),
        status: repair.status,
        completed_at: repair.completed_at,
      },
    });
  }
);

router.post(
  '/:repair_id/message',
  [
    requireAuth,
    requireWorkspaceMember,
    body('message').trim().notEmpty().withMessage('message_is_required'),
    validateRequestPayload,
  ],
  async (req, res) => {
    const repair = await repairRepository.getRepairById({
      id: req.params.repair_id,
      workspace_id: req.params.workspace_id,
    });
    if (!repair) return res.status(404).send({ message: 'repair_not_found' });
    if (!repair.customer || !repair.customer.telephone_number) return res.status(422).send({ message: 'customer_telephone_number_missing' });

    try {
      await beemService.sendSMS({
        message: req.body.message,
        recipients: [{ recipient_id: repair.customer.telephone_number }],
      });
      return res.status(200).send({ ok: true });
    } catch (error) {
      console.error('Beem sendSMS (manual) failed:', error);
      return res.status(502).send({ message: 'sms_send_failed' });
    }
  }
);

router.get('/:repair_id/activity', [requireAuth, requireWorkspaceMember], async (req, res) => {
  const repair = await repairRepository.getRepairById({
    id: req.params.repair_id,
    workspace_id: req.params.workspace_id,
  });
  if (!repair) return res.status(404).send({ message: 'repair_not_found' });

  const activity = await repairActivityRepository.listActivity({ repair_id: repair._id });
  return res.status(200).send({
    activity: activity.map(a => ({
      id: a._id.toString(),
      type: a.type,
      from_status: a.from_status,
      to_status: a.to_status,
      note: a.note,
      created_at: a.created_at,
    })),
  });
});

module.exports = router;
