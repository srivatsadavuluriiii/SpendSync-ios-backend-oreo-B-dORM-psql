/**
 * Payment Service
 *
 * Handles payment processing via Stripe payment gateway
 */
import Stripe from 'stripe';
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
declare function createPaymentIntent(paymentData: PaymentData): Promise<Stripe.PaymentIntent>;
/**
 * Process a payment with card details
 * @param paymentIntentId - ID of the payment intent
 * @param paymentMethod - Payment method details
 * @returns Payment confirmation
 */
declare function processPayment(paymentIntentId: string, paymentMethod: PaymentMethod): Promise<Stripe.PaymentIntent>;
/**
 * Retrieve payment status
 * @param paymentIntentId - ID of the payment intent
 * @returns Payment intent object
 */
declare function getPaymentStatus(paymentIntentId: string): Promise<Stripe.PaymentIntent>;
/**
 * Handle webhook events from Stripe
 * @param event - Stripe webhook event
 * @returns Processed event result
 */
declare function handleWebhookEvent(event: Stripe.Event): Promise<any>;
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
declare function createCustomer(userData: UserData): Promise<Stripe.Customer>;
/**
 * Process webhook request body
 * @param signature - Stripe signature from headers
 * @param body - Raw request body
 * @returns Verified Stripe event
 */
declare function constructWebhookEvent(signature: string, body: string): Stripe.Event;
export { createPaymentIntent, processPayment, getPaymentStatus, handleWebhookEvent, createCustomer, constructWebhookEvent };
