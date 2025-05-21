/**
 * Payment Controller
 *
 * Handles HTTP requests related to payment processing
 */
const { BadRequestError, NotFoundError } = require('../../../../shared/errors');
const settlementService = require('../services/settlement.service');
const paymentService = require('../services/payment.service');
const { metrics, timers } = require('../config/monitoring');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
/**
 * Create a payment intent for a settlement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function createPaymentIntent(req, res, next) {
    try {
        const { settlementId } = req.params;
        const { paymentMethod } = req.body;
        const userId = req.user.id;
        // Get the settlement
        const dbTimer = timers.createDbTimer('findOne', 'settlements');
        const settlement = await settlementService.getSettlementById(settlementId);
        dbTimer();
        if (!settlement) {
            throw new NotFoundError(`Settlement with ID ${settlementId} not found`);
        }
        // Check if the requesting user is the payer
        if (settlement.payerId !== userId) {
            throw new BadRequestError('Only the payer can initiate payment for a settlement');
        }
        // Check if the settlement is in a valid state for payment
        if (settlement.status !== 'pending') {
            throw new BadRequestError(`Cannot process payment for settlement with status: ${settlement.status}`);
        }
        // Create payment data from the settlement
        const paymentData = {
            amount: settlement.amount,
            currency: settlement.currency,
            description: `Settlement payment for group ${settlement.groupId}`,
            settlementId: settlement.id,
            payerId: settlement.payerId,
            receiverId: settlement.receiverId,
        };
        // Create a payment intent
        const paymentIntent = await paymentService.createPaymentIntent(paymentData);
        // Update the settlement with payment information
        const updatedSettlement = await settlementService.updateSettlementPayment(settlementId, {
            paymentStatus: 'awaiting_payment',
            paymentMethod: paymentMethod || 'card',
            paymentIntentId: paymentIntent.id
        });
        res.json({
            success: true,
            data: {
                clientSecret: paymentIntent.client_secret,
                settlementId: settlement.id,
                paymentIntentId: paymentIntent.id,
                amount: settlement.amount,
                currency: settlement.currency
            }
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Process a payment for a settlement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function processPayment(req, res, next) {
    try {
        const { settlementId } = req.params;
        const { paymentMethodId, customerId } = req.body;
        const userId = req.user.id;
        // Get the settlement
        const settlement = await settlementService.getSettlementById(settlementId);
        if (!settlement) {
            throw new NotFoundError(`Settlement with ID ${settlementId} not found`);
        }
        // Check if the requesting user is the payer
        if (settlement.payerId !== userId) {
            throw new BadRequestError('Only the payer can process payment for a settlement');
        }
        // Check if the settlement has a payment intent
        if (!settlement.paymentIntentId) {
            throw new BadRequestError('No payment intent found for this settlement');
        }
        // Update settlement status to processing
        await settlementService.updateSettlementPayment(settlementId, {
            paymentStatus: 'processing',
            status: 'processing',
            processedAt: new Date()
        });
        // Process the payment
        const paymentResult = await paymentService.processPayment(settlement.paymentIntentId, {
            paymentMethodId,
            customerId
        });
        // Update settlement based on payment result
        let settlementUpdate = {};
        if (paymentResult.status === 'succeeded') {
            settlementUpdate = {
                paymentStatus: 'succeeded',
                status: 'completed',
                completedAt: new Date(),
                paymentMetadata: paymentResult
            };
        }
        else if (paymentResult.status === 'requires_action') {
            settlementUpdate = {
                paymentStatus: 'processing',
                paymentMetadata: paymentResult
            };
        }
        else {
            settlementUpdate = {
                paymentStatus: 'failed',
                status: 'failed',
                paymentError: paymentResult.last_payment_error ?
                    paymentResult.last_payment_error.message :
                    'Payment processing failed',
                paymentMetadata: paymentResult
            };
        }
        const updatedSettlement = await settlementService.updateSettlementPayment(settlementId, settlementUpdate);
        res.json({
            success: true,
            data: {
                settlementId: settlement.id,
                status: updatedSettlement.status,
                paymentStatus: updatedSettlement.paymentStatus,
                requiresAction: paymentResult.status === 'requires_action',
                paymentIntentClientSecret: paymentResult.status === 'requires_action' ? paymentResult.client_secret : null
            }
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Check payment status for a settlement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function checkPaymentStatus(req, res, next) {
    try {
        const { settlementId } = req.params;
        // Get the settlement
        const settlement = await settlementService.getSettlementById(settlementId);
        if (!settlement) {
            throw new NotFoundError(`Settlement with ID ${settlementId} not found`);
        }
        // Check if the settlement has a payment intent
        if (!settlement.paymentIntentId) {
            return res.json({
                success: true,
                data: {
                    settlementId: settlement.id,
                    status: settlement.status,
                    paymentStatus: settlement.paymentStatus || 'not_started'
                }
            });
        }
        // Get latest payment status from payment provider
        const paymentIntent = await paymentService.getPaymentStatus(settlement.paymentIntentId);
        // Update settlement if payment status has changed
        if (paymentIntent.status !== settlement.paymentStatus) {
            let settlementUpdate = {
                paymentStatus: paymentIntent.status,
                paymentMetadata: paymentIntent
            };
            // Update settlement status based on payment status
            if (paymentIntent.status === 'succeeded' && settlement.status !== 'completed') {
                settlementUpdate.status = 'completed';
                settlementUpdate.completedAt = new Date();
            }
            else if (paymentIntent.status === 'canceled' && settlement.status !== 'cancelled') {
                settlementUpdate.status = 'cancelled';
            }
            else if (['requires_payment_method', 'requires_capture', 'processing'].includes(paymentIntent.status)) {
                settlementUpdate.status = 'processing';
            }
            await settlementService.updateSettlementPayment(settlementId, settlementUpdate);
        }
        res.json({
            success: true,
            data: {
                settlementId: settlement.id,
                status: settlement.status,
                paymentStatus: paymentIntent.status,
                paymentDetails: {
                    amount: paymentIntent.amount / 100, // Convert from cents
                    currency: paymentIntent.currency,
                    paymentMethodType: paymentIntent.payment_method_types[0],
                    capturedAt: paymentIntent.charges.data[0]?.created ?
                        new Date(paymentIntent.charges.data[0].created * 1000) : null
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Handle webhook events from payment provider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function handleWebhook(req, res, next) {
    try {
        // Verify webhook signature if in production
        let event;
        if (process.env.NODE_ENV === 'production') {
            const signature = req.headers['stripe-signature'];
            try {
                event = stripe.webhooks.constructEvent(req.rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
            }
            catch (error) {
                throw new BadRequestError(`Webhook signature verification failed: ${error.message}`);
            }
        }
        else {
            // For development and testing
            event = req.body;
        }
        // Process the webhook event
        const result = await paymentService.handleWebhookEvent(event);
        res.json({ received: true, result });
    }
    catch (error) {
        next(error);
    }
}
module.exports = {
    createPaymentIntent,
    processPayment,
    checkPaymentStatus,
    handleWebhook
};
export {};
//# sourceMappingURL=payment.controller.js.map