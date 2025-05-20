/**
 * Create a payment intent for a settlement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function createPaymentIntent(req: Object, res: Object, next: Function): Promise<void>;
/**
 * Process a payment for a settlement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function processPayment(req: Object, res: Object, next: Function): Promise<void>;
/**
 * Check payment status for a settlement
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function checkPaymentStatus(req: Object, res: Object, next: Function): Promise<any>;
/**
 * Handle webhook events from payment provider
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function handleWebhook(req: Object, res: Object, next: Function): Promise<void>;
