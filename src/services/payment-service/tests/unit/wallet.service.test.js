import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as walletService from '../../src/services/wallet.service.js';
import Wallet from '../../src/models/wallet.model.js';
import Transaction from '../../src/models/transaction.model.js';
import { NotFoundError, ValidationError } from '../../src/utils/errors.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Wallet.deleteMany({});
  await Transaction.deleteMany({});
});

describe('Wallet Service', () => {
  describe('getBalance', () => {
    it('should return existing wallet', async () => {
      const wallet = await Wallet.create({
        userId: 'user123',
        balance: 100,
        currency: 'USD'
      });

      const result = await walletService.getBalance('user123');
      expect(result.balance).toBe(100);
      expect(result.currency).toBe('USD');
    });

    it('should create new wallet if not exists', async () => {
      const result = await walletService.getBalance('user123');
      expect(result.balance).toBe(0);
      expect(result.currency).toBe('USD');
    });
  });

  describe('deposit', () => {
    it('should add funds to wallet', async () => {
      const wallet = await Wallet.create({
        userId: 'user123',
        balance: 100,
        currency: 'USD'
      });

      const result = await walletService.deposit({
        userId: 'user123',
        amount: 50,
        currency: 'USD',
        source: 'bank_transfer'
      });

      const updatedWallet = await Wallet.findById(wallet._id);
      expect(updatedWallet.balance).toBe(150);
      expect(result.status).toBe('completed');
      expect(result.type).toBe('deposit');
      expect(result.amount).toBe(50);
    });

    it('should throw ValidationError for negative amount', async () => {
      await expect(walletService.deposit({
        userId: 'user123',
        amount: -50,
        currency: 'USD',
        source: 'bank_transfer'
      }))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('withdraw', () => {
    it('should withdraw funds from wallet', async () => {
      const wallet = await Wallet.create({
        userId: 'user123',
        balance: 100,
        currency: 'USD'
      });

      const result = await walletService.withdraw({
        userId: 'user123',
        amount: 50,
        currency: 'USD',
        destination: 'bank_account'
      });

      const updatedWallet = await Wallet.findById(wallet._id);
      expect(updatedWallet.balance).toBe(50);
      expect(result.status).toBe('completed');
      expect(result.type).toBe('withdrawal');
      expect(result.amount).toBe(50);
    });

    it('should throw ValidationError for insufficient funds', async () => {
      await Wallet.create({
        userId: 'user123',
        balance: 100,
        currency: 'USD'
      });

      await expect(walletService.withdraw({
        userId: 'user123',
        amount: 150,
        currency: 'USD',
        destination: 'bank_account'
      }))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for negative amount', async () => {
      await expect(walletService.withdraw({
        userId: 'user123',
        amount: -50,
        currency: 'USD',
        destination: 'bank_account'
      }))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getTransactions', () => {
    it('should return all transactions for a user', async () => {
      const transactions = [
        {
          userId: 'user123',
          type: 'deposit',
          amount: 100,
          currency: 'USD',
          source: 'bank_transfer',
          status: 'completed'
        },
        {
          userId: 'user123',
          type: 'withdrawal',
          amount: 50,
          currency: 'USD',
          destination: 'bank_account',
          status: 'completed'
        }
      ];

      await Transaction.insertMany(transactions);

      const result = await walletService.getTransactions('user123');
      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(50); // Most recent first
      expect(result[1].amount).toBe(100);
    });

    it('should return empty array when no transactions exist', async () => {
      const result = await walletService.getTransactions('user123');
      expect(result).toHaveLength(0);
    });
  });
}); 