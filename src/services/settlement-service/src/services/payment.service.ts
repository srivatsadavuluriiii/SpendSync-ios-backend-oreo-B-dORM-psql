/**
 * Payment Service
 * 
 * Handles payment processing via Stripe payment gateway
 */

import Stripe from 'stripe';
// @ts-ignore
import { BadRequestError, ServiceError } from '../../../../shared/errors';
import { metrics } from '../config/monitoring.js';

// Use a placeholder API key if not provided in environment
const stripeApiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key';
const stripe = new Stripe(stripeApiKey, {
  apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion
});

interface PaymentData {
  amount: number;
  currency: string;
  description?: string;
  settlementId: string;
  payerId: string;
  receiverId: string;
}

interface PaymentMethod {
  paymentMethodId: string;
  customerId?: string;
}

/**
 * Create a payment intent for a settlement
 * @param paymentData - Payment data object
 * @returns Created payment intent
 */
async function createPaymentIntent(paymentData: PaymentData): Promise<Stripe.PaymentIntent> {
  try {
    const timer = metrics.paymentProcessingHistogram.startTimer({ operation: 'createPaymentIntent' });
    
    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100), // Convert to cents/smallest currency unit
      currency: paymentData.currency.toLowerCase(),
      description: paymentData.description || `Settlement payment #${paymentData.settlementId}`,
      metadata: {
        settlementId: paymentData.settlementId,
        payerId: paymentData.payerId,
        receiverId: paymentData.receiverId
      }
    });
    
    // Track metrics
    metrics.paymentAttemptCounter.inc({ 
      status: 'created',
      currency: paymentData.currency,
      payment_method: 'card'
    });
    
    timer();
    
    return paymentIntent;
  } catch (error: any) {
    // Track failed payment attempt
    metrics.paymentAttemptCounter.inc({ 
      status: 'failed',
      currency: paymentData.currency,
      payment_method: 'card'
    });
    
    console.error('Payment intent creation failed:', error);
    throw new ServiceError('Failed to create payment intent', error);
  }
}

/**
 * Process a payment with card details
 * @param paymentIntentId - ID of the payment intent
 * @param paymentMethod - Payment method details
 * @returns Payment confirmation
 */
async function processPayment(
  paymentIntentId: string, 
  paymentMethod: PaymentMethod
): Promise<Stripe.PaymentIntent> {
  try {
    const timer = metrics.paymentProcessingHistogram.startTimer({ operation: 'processPayment' });
    
    // Attach payment method to customer if needed
    if (paymentMethod.customerId && paymentMethod.paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethod.paymentMethodId, {
        customer: paymentMethod.customerId,
      });
    }
    
    // Confirm the payment
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethod.paymentMethodId,
    });
    
    // Track metrics
    metrics.paymentAttemptCounter.inc({ 
      status: paymentIntent.status, 
      currency: paymentIntent.currency,
      payment_method: 'card'
    });
    
    timer();
    
    return paymentIntent;
  } catch (error: any) {
    // Track failed payment attempt
    metrics.paymentAttemptCounter.inc({ 
      status: 'failed',
      payment_method: 'card',
      currency: 'unknown'
    });
    
    console.error('Payment processing failed:', error);
    throw new ServiceError('Failed to process payment', error);
  }
}

/**
 * Retrieve payment status
 * @param paymentIntentId - ID of the payment intent
 * @returns Payment intent object
 */
async function getPaymentStatus(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error: any) {
    console.error('Failed to retrieve payment status:', error);
    throw new ServiceError('Failed to retrieve payment status', error);
  }
}

/**
 * Handle webhook events from Stripe
 * @param event - Stripe webhook event
 * @returns Processed event result
 */
async function handleWebhookEvent(event: Stripe.Event): Promise<any> {
  try {
    const timer = metrics.paymentProcessingHistogram.startTimer({ operation: 'webhookProcess' });
    let result;
    
    switch (event.type) {
      case 'payment_intent.succeeded':
        result = await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        result = await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      // Handle other webhook events as needed
      default:
        result = { status: 'ignored', eventType: event.type };
    }
    
    timer();
    return result;
  } catch (error: any) {
    console.error('Webhook processing failed:', error);
    throw new ServiceError('Failed to process webhook event', error);
  }
}

/**
 * Handle successful payment
 * @param paymentIntent - Payment intent object from Stripe
 * @returns Processing result
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<any> {
  // Extract settlement ID from metadata
  const settlementId = paymentIntent.metadata?.settlementId;
  
  // Here we would update the settlement status
  // This would typically call your settlement service to mark the payment as complete
  
  return {
    status: 'success',
    paymentIntentId: paymentIntent.id,
    settlementId
  };
}

/**
 * Handle failed payment
 * @param paymentIntent - Payment intent object from Stripe
 * @returns Processing result
 */
async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<any> {
  // Extract settlement ID from metadata
  const settlementId = paymentIntent.metadata?.settlementId;
  
  // Here we would update the settlement with the failure
  // This would typically call your settlement service to mark the payment as failed
  
  return {
    status: 'failed',
    paymentIntentId: paymentIntent.id,
    settlementId,
    error: paymentIntent.last_payment_error
  };
}

interface UserData {
  userId: string;
  email: string;
  name: string;
}

/**
 * Create a Stripe customer
 * @param userData - User data
 * @returns Created customer
 */
async function createCustomer(userData: UserData): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: userData.name,
      metadata: {
        userId: userData.userId
      }
    });
    
    return customer;
  } catch (error: any) {
    console.error('Customer creation failed:', error);
    throw new ServiceError('Failed to create customer', error);
  }
}

/**
 * Process webhook request body
 * @param signature - Stripe signature from headers
 * @param body - Raw request body
 * @returns Verified Stripe event
 */
function constructWebhookEvent(signature: string, body: string): Stripe.Event {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'
  );
}

export {
  createPaymentIntent,
  processPayment,
  getPaymentStatus,
  handleWebhookEvent,
  createCustomer,
  constructWebhookEvent
}; 