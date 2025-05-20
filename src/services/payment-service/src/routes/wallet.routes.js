import express from 'express';
import { body } from 'express-validator';
import * as walletController from '../controllers/wallet.controller.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Get wallet balance
router.get('/balance',
  authenticate,
  walletController.getBalance
);

// Add funds to wallet
router.post('/deposit',
  authenticate,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    body('source').isString().notEmpty().withMessage('Payment source is required'),
  ],
  validateRequest,
  walletController.deposit
);

// Withdraw funds from wallet
router.post('/withdraw',
  authenticate,
  [
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
    body('destination').isString().notEmpty().withMessage('Withdrawal destination is required'),
  ],
  validateRequest,
  walletController.withdraw
);

// Get transaction history
router.get('/transactions',
  authenticate,
  walletController.getTransactions
);

export default router; 