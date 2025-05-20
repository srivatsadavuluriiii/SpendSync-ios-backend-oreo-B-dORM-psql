"use strict";
/**
 * Payment Routes
 *
 * Defines API routes for payment operations
 */
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../../../../shared/middleware');
/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentIntent:
 *       type: object
 *       properties:
 *         clientSecret:
 *           type: string
 *           description: Client secret for Stripe payment intent
 *         settlementId:
 *           type: string
 *           description: ID of the associated settlement
 *         paymentIntentId:
 *           type: string
 *           description: ID of the payment intent
 *         amount:
 *           type: number
 *           description: Amount to be paid
 *         currency:
 *           type: string
 *           description: Currency code (e.g., USD, EUR)
 */
/**
 * @swagger
 * /api/settlements/{settlementId}/payments:
 *   post:
 *     summary: Create a payment intent for a settlement
 *     description: Initiates the payment process for a settlement
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: settlementId
 *         schema:
 *           type: string
 *         required: true
 *         description: Settlement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethod:
 *                 type: string
 *                 enum: [card, bank_transfer, cash, app_balance, other]
 *                 default: card
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PaymentIntent'
 */
router.post('/:settlementId/payments', authenticate, paymentController.createPaymentIntent);
/**
 * @swagger
 * /api/settlements/{settlementId}/payments/process:
 *   post:
 *     summary: Process a payment for a settlement
 *     description: Processes a payment using the specified payment method
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: settlementId
 *         schema:
 *           type: string
 *         required: true
 *         description: Settlement ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 description: ID of the payment method
 *               customerId:
 *                 type: string
 *                 description: ID of the customer (if using saved payment method)
 *     responses:
 *       200:
 *         description: Payment processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     settlementId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                     requiresAction:
 *                       type: boolean
 *                     paymentIntentClientSecret:
 *                       type: string
 */
router.post('/:settlementId/payments/process', authenticate, paymentController.processPayment);
/**
 * @swagger
 * /api/settlements/{settlementId}/payments/status:
 *   get:
 *     summary: Check payment status for a settlement
 *     description: Returns the current status of a payment for a settlement
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: settlementId
 *         schema:
 *           type: string
 *         required: true
 *         description: Settlement ID
 *     responses:
 *       200:
 *         description: Payment status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     settlementId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     paymentStatus:
 *                       type: string
 *                     paymentDetails:
 *                       type: object
 */
router.get('/:settlementId/payments/status', authenticate, paymentController.checkPaymentStatus);
/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Handle webhook events from payment provider
 *     description: Processes webhook callbacks from the payment provider
 *     tags: [Payments]
 *     requestBody:
 *       description: Webhook event payload
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received and processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                 result:
 *                   type: object
 */
router.post('/webhook', paymentController.handleWebhook);
module.exports = router;
