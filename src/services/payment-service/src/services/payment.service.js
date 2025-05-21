import Payment from '../models/payment.model.js';
import StripeService from '../integrations/stripe.service.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { getUserById } from '../services/user.service.js';

export const getAllPayments = async (userId) => {
  return Payment.find({ senderId: userId }).sort({ createdAt: -1 });
};

export const createPayment = async ({ senderId, recipientId, amount, currency, description }) => {
  // Create or get Stripe customer
  let customer = await StripeService.getCustomer(senderId);
  if (!customer) {
    const user = await getUserById(senderId); // You'll need to implement this
    customer = await StripeService.createCustomer(user.email, user.name, { userId: senderId });
  }

  // Create payment record
  const payment = new Payment({
    senderId,
    recipientId,
    amount,
    currency,
    description,
    stripeCustomerId: customer.id,
    status: 'pending'
  });

  // Create payment intent
  const paymentIntent = await StripeService.createPaymentIntent(
    amount,
    currency,
    customer.id
  );

  // Update payment record with payment intent ID
  payment.stripePaymentIntentId = paymentIntent.id;
  await payment.save();

  return {
    paymentId: payment._id,
    clientSecret: paymentIntent.client_secret,
    status: payment.status
  };
};

export const getPaymentById = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }
  return payment;
};

export const updatePaymentStatus = async (paymentId, status) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
    throw new ValidationError('Invalid payment status');
  }

  payment.status = status;
  await payment.save();

  return payment;
};

export const cancelPayment = async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status === 'completed') {
    throw new ValidationError('Cannot cancel a completed payment');
  }

  if (payment.stripePaymentIntentId) {
    await StripeService.cancelPaymentIntent(payment.stripePaymentIntentId);
  }

  payment.status = 'cancelled';
  await payment.save();

  return payment;
}; 