const express = require('express');

const router = express.Router();

/**
 * @swagger
 * /repair/v1/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check
 *     responses:
 *       200:
 *         description: Service is up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 */
router.get('/', async (req, res) => {
  return res.status(200).send({ ok: true });
});

module.exports = router;
