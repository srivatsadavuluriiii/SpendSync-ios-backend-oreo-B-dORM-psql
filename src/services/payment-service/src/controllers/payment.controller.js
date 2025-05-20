import Payment from '../models/Payment.js';
import StripeService from '../integrations/stripe.service.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import * as paymentService from '../services/payment.service.js';

export const getAllPayments = async (req, res) => {
  try {
    const payments = await paymentService.getAllPayments(req.user.id);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPayment = async (req, res) => {
  try {
    const payment = await paymentService.createPayment({
      ...req.body,
      senderId: req.user.id
    });
    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPaymentById = async (req, res) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const payment = await paymentService.updatePaymentStatus(
      req.params.id,
      req.body.status
    );
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const cancelPayment = async (req, res) => {
  try {
    const payment = await paymentService.cancelPayment(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const confirmPayment = async (req, res) => {
  const { paymentId } = req.params;

  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    const paymentIntent = await StripeService.confirmPaymentIntent(payment.stripePaymentIntentId);
    
    payment.status = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';
    if (paymentIntent.status !== 'succeeded') {
      payment.error = {
        code: paymentIntent.last_payment_error?.code,
        message: paymentIntent.last_payment_error?.message,
        timestamp: new Date()
      };
    }
    await payment.save();

    res.json({
      success: true,
      data: {
        status: payment.status,
        paymentIntent: paymentIntent.id
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getPaymentStatus = async (req, res) => {
  const { paymentId } = req.params;

  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    res.json({
      success: true,
      data: {
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.createdAt,
        error: payment.error
      }
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
};

export const initiateRefund = async (req, res) => {
  const { paymentId } = req.params;
  const { amount, reason } = req.body;

  try {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new ValidationError('Only completed payments can be refunded');
    }

    const refund = await StripeService.refundPayment(payment.stripePaymentIntentId, amount);
    
    await payment.initiateRefund(amount, reason);
    payment.refundDetails.stripeRefundId = refund.id;
    payment.refundDetails.status = refund.status === 'succeeded' ? 'completed' : 'pending';
    await payment.save();

    res.json({
      success: true,
      data: {
        refundId: refund.id,
        status: payment.refundDetails.status
      }
    });
  } catch (error) {
    console.error('Error initiating refund:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  try {
    const event = await StripeService.handleWebhook(signature, req.body);
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}; 