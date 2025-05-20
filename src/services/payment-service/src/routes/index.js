import express from 'express';
import { body, param } from 'express-validator';
import * as paymentController from '../controllers/payment.controller.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all payments
router.get('/', 
  authenticate,
  paymentController.getAllPayments
);

// Create a new payment
router.post('/',
  authenticate,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    body('description').isString().optional(),
    body('recipientId').isString().notEmpty().withMessage('Recipient ID is required'),
  ],
  validateRequest,
  paymentController.createPayment
);

// Get payment by ID
router.get('/:id',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Payment ID is required'),
  ],
  validateRequest,
  paymentController.getPaymentById
);

// Update payment status
router.put('/:id/status',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Payment ID is required'),
    body('status').isIn(['pending', 'completed', 'failed']).withMessage('Invalid status'),
  ],
  validateRequest,
  paymentController.updatePaymentStatus
);

// Cancel payment
router.delete('/:id',
  authenticate,
  [
    param('id').isString().notEmpty().withMessage('Payment ID is required'),
  ],
  validateRequest,
  paymentController.cancelPayment
);

export default router; 