import express from 'express';
import { validateRequest } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import {
  createPayment,
  confirmPayment,
  getPaymentStatus,
  initiateRefund,
  handleWebhook
} from '../controllers/payment.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create a new payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - settlementId
 *               - amount
 *               - currency
 *               - paymentMethod
 *             properties:
 *               userId:
 *                 type: string
 *               settlementId:
 *                 type: string
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, bank_transfer]
 */
router.post('/',
  authenticate,
  validateRequest({
    body: {
      userId: 'required|string',
      settlementId: 'required|string',
      amount: 'required|number|min:0.01',
      currency: 'required|string|length:3',
      paymentMethod: 'required|string|in:card,bank_transfer'
    }
  }),
  createPayment
);

/**
 * @swagger
 * /api/payments/{paymentId}/confirm:
 *   post:
 *     summary: Confirm a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/:paymentId/confirm',
  authenticate,
  validateRequest({
    params: {
      paymentId: 'required|string'
    }
  }),
  confirmPayment
);

/**
 * @swagger
 * /api/payments/{paymentId}:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:paymentId',
  authenticate,
  validateRequest({
    params: {
      paymentId: 'required|string'
    }
  }),
  getPaymentStatus
);

/**
 * @swagger
 * /api/payments/{paymentId}/refund:
 *   post:
 *     summary: Initiate a refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - reason
 *             properties:
 *               amount:
 *                 type: number
 *               reason:
 *                 type: string
 */
router.post('/:paymentId/refund',
  authenticate,
  validateRequest({
    params: {
      paymentId: 'required|string'
    },
    body: {
      amount: 'required|number|min:0.01',
      reason: 'required|string'
    }
  }),
  initiateRefund
);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Handle Stripe webhook events
 *     tags: [Payments]
 */
router.post('/webhook', handleWebhook);

export default router; 