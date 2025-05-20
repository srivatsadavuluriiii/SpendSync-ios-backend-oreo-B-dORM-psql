import Wallet from '../models/wallet.model.js';
import Transaction from '../models/transaction.model.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { Decimal } from 'decimal.js';

export const getBalance = async (userId) => {
  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0 });
  }
  return wallet;
};

export const deposit = async ({ userId, amount, currency, source }) => {
  if (amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }

  let wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    wallet = await Wallet.create({ userId, balance: 0 });
  }

  const transaction = await Transaction.create({
    userId,
    type: 'deposit',
    amount,
    currency,
    source,
    status: 'pending'
  });

  try {
    // Process the deposit through the payment provider
    // This is a placeholder for the actual implementation
    const success = true;

    if (success) {
      const newBalance = new Decimal(wallet.balance).plus(amount).toNumber();
      wallet.balance = newBalance;
      await wallet.save();

      transaction.status = 'completed';
      await transaction.save();
    } else {
      transaction.status = 'failed';
      await transaction.save();
      throw new Error('Deposit failed');
    }

    return transaction;
  } catch (error) {
    transaction.status = 'failed';
    transaction.error = error.message;
    await transaction.save();
    throw error;
  }
};

export const withdraw = async ({ userId, amount, currency, destination }) => {
  if (amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }

  const wallet = await Wallet.findOne({ userId });
  if (!wallet) {
    throw new NotFoundError('Wallet not found');
  }

  if (wallet.balance < amount) {
    throw new ValidationError('Insufficient funds');
  }

  const transaction = await Transaction.create({
    userId,
    type: 'withdrawal',
    amount,
    currency,
    destination,
    status: 'pending'
  });

  try {
    // Process the withdrawal through the payment provider
    // This is a placeholder for the actual implementation
    const success = true;

    if (success) {
      const newBalance = new Decimal(wallet.balance).minus(amount).toNumber();
      wallet.balance = newBalance;
      await wallet.save();

      transaction.status = 'completed';
      await transaction.save();
    } else {
      transaction.status = 'failed';
      await transaction.save();
      throw new Error('Withdrawal failed');
    }

    return transaction;
  } catch (error) {
    transaction.status = 'failed';
    transaction.error = error.message;
    await transaction.save();
    throw error;
  }
};

export const getTransactions = async (userId) => {
  return Transaction.find({ userId }).sort({ createdAt: -1 });
}; 