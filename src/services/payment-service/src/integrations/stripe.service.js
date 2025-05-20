import Stripe from 'stripe';
import { ExternalServiceError } from '../utils/errors.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

class StripeService {
  static async getCustomer(userId) {
    try {
      const customers = await stripe.customers.list({
        limit: 1,
        query: `metadata['userId']:'${userId}'`
      });
      return customers.data[0];
    } catch (error) {
      throw new ExternalServiceError(`Failed to get Stripe customer: ${error.message}`, 'stripe');
    }
  }

  static async createCustomer(email, name, metadata = {}) {
    try {
      return await stripe.customers.create({
        email,
        name,
        metadata
      });
    } catch (error) {
      throw new ExternalServiceError(`Failed to create Stripe customer: ${error.message}`, 'stripe');
    }
  }

  static async createPaymentIntent(amount, currency, customerId) {
    try {
      return await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customerId,
        automatic_payment_methods: {
          enabled: true
        }
      });
    } catch (error) {
      throw new ExternalServiceError(`Failed to create payment intent: ${error.message}`, 'stripe');
    }
  }

  static async confirmPaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.confirm(paymentIntentId);
    } catch (error) {
      throw new ExternalServiceError(`Failed to confirm payment intent: ${error.message}`, 'stripe');
    }
  }

  static async cancelPaymentIntent(paymentIntentId) {
    try {
      return await stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      throw new ExternalServiceError(`Failed to cancel payment intent: ${error.message}`, 'stripe');
    }
  }

  static async refundPayment(paymentIntentId, amount = null) {
    try {
      const refundParams = {
        payment_intent: paymentIntentId
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to cents
      }

      return await stripe.refunds.create(refundParams);
    } catch (error) {
      throw new ExternalServiceError(`Failed to refund payment: ${error.message}`, 'stripe');
    }
  }

  static async handleWebhook(signature, rawBody) {
    try {
      return stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      throw new ExternalServiceError(`Failed to verify webhook: ${error.message}`, 'stripe');
    }
  }
}

export default StripeService; 