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

/**
 * @swagger
 * /repair/v1/workspaces/{workspace_id}/repairs:
 *   get:
 *     tags:
 *       - Repairs
 *     summary: List repairs in workspace
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspace_id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [in_progress, completed]
 *     responses:
 *       200:
 *         description: Repair list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repairs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       status: { type: string, enum: [in_progress, completed] }
 *                       customer:
 *                         type: object
 *                         properties:
 *                           name: { type: string }
 *                           telephone_number: { type: string }
 *                       item:
 *                         type: object
 *                         properties:
 *                           type: { type: string, nullable: true }
 *                           brand: { type: string, nullable: true }
 *                           model: { type: string, nullable: true }
 *                           serial_number: { type: string, nullable: true }
 *                       issue_description: { type: string }
 *                       received_at: { type: string, format: date-time }
 *                       completed_at: { type: string, format: date-time, nullable: true }
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
 *       422:
 *         description: Validation errors
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ValidationErrors' }
 */
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

/**
 * @swagger
 * /repair/v1/workspaces/{workspace_id}/repairs:
 *   post:
 *     tags:
 *       - Repairs
 *     summary: Create a repair (optionally sends SMS)
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
 *             required: [customer, issue_description]
 *             properties:
 *               customer:
 *                 type: object
 *                 required: [name, telephone_number]
 *                 properties:
 *                   name: { type: string, example: John Doe }
 *                   telephone_number: { type: string, example: "255700000000" }
 *               item:
 *                 type: object
 *                 properties:
 *                   type: { type: string, nullable: true }
 *                   brand: { type: string, nullable: true }
 *                   model: { type: string, nullable: true }
 *                   serial_number: { type: string, nullable: true }
 *               issue_description:
 *                 type: string
 *                 example: Screen not turning on
 *               message:
 *                 type: string
 *                 nullable: true
 *                 description: If provided and BEEM is enabled, sends SMS to customer.telephone_number
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repair:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
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

/**
 * @swagger
 * /repair/v1/workspaces/{workspace_id}/repairs/{repair_id}/complete:
 *   post:
 *     tags:
 *       - Repairs
 *     summary: Mark repair as completed (optionally sends SMS)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspace_id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: repair_id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 nullable: true
 *                 description: If provided and BEEM is enabled, sends SMS to the customer
 *     responses:
 *       200:
 *         description: Completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 repair:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     status: { type: string, example: completed }
 *                     completed_at: { type: string, format: date-time, nullable: true }
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
 *       404:
 *         description: Repair not found
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

/**
 * @swagger
 * /repair/v1/workspaces/{workspace_id}/repairs/{repair_id}/message:
 *   post:
 *     tags:
 *       - Repairs
 *     summary: Send SMS to repair customer (no status change)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspace_id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: repair_id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, example: Your device is ready for pickup. }
 *     responses:
 *       200:
 *         description: Sent (or attempted)
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
 *         description: Not a workspace member
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ForbiddenError' }
 *       404:
 *         description: Repair not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 *       422:
 *         description: Missing customer telephone number or validation errors
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 *       502:
 *         description: SMS provider error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 */
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

/**
 * @swagger
 * /repair/v1/workspaces/{workspace_id}/repairs/{repair_id}/activity:
 *   get:
 *     tags:
 *       - Repairs
 *     summary: List repair activity (history)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspace_id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: repair_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Activity list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       type: { type: string, example: status_changed }
 *                       from_status: { type: string, nullable: true }
 *                       to_status: { type: string, nullable: true }
 *                       note: { type: string, nullable: true }
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
 *       404:
 *         description: Repair not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/StandardError' }
 */
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
