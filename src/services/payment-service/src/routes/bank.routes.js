import express from 'express';
import { body } from 'express-validator';
import * as bankController from '../controllers/bank.controller.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Link bank account
router.post('/link',
  authenticate,
  [
    body('publicToken').isString().notEmpty().withMessage('Plaid public token is required'),
    body('accountId').isString().notEmpty().withMessage('Account ID is required'),
  ],
  validateRequest,
  bankController.linkBankAccount
);

// Get linked bank accounts
router.get('/accounts',
  authenticate,
  bankController.getLinkedAccounts
);

// Remove linked bank account
router.delete('/accounts/:accountId',
  authenticate,
  bankController.unlinkBankAccount
);

// Get bank account balance
router.get('/accounts/:accountId/balance',
  authenticate,
  bankController.getAccountBalance
);

// Get bank account transactions
router.get('/accounts/:accountId/transactions',
  authenticate,
  bankController.getAccountTransactions
);

export default router; 