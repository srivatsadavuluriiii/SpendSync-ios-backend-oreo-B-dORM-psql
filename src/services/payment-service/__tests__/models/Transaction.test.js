import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Transaction from '../../src/models/Transaction.js';
import Decimal from 'decimal.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  
  // Create indexes manually for testing
  await Transaction.createIndexes();
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
}, 30000);

describe('Transaction Model', () => {
  const validTransactionData = {
    walletId: new mongoose.Types.ObjectId(),
    type: 'CREDIT',
    amount: '100.00',
    currency: 'USD',
    balance: '500.00',
    sourceType: 'BANK_ACCOUNT',
    destinationType: 'WALLET',
    fees: [{
      type: 'PROCESSING',
      amount: '2.50',
      description: 'Processing fee'
    }]
  };

  beforeEach(async () => {
    await Transaction.deleteMany({});
  });

  describe('Validation', () => {
    test('should create a valid transaction', async () => {
      const transaction = await Transaction.create(validTransactionData);
      expect(transaction._id).toBeDefined();
      expect(transaction.type).toBe('CREDIT');
      expect(transaction.amount.toString()).toBe('100.00');
    });

    test('should require walletId', async () => {
      const invalidData = { ...validTransactionData };
      delete invalidData.walletId;
      await expect(Transaction.create(invalidData)).rejects.toThrow();
    });

    test('should validate transaction type enum', async () => {
      const invalidData = { ...validTransactionData, type: 'INVALID' };
      await expect(Transaction.create(invalidData)).rejects.toThrow();
    });

    test('should validate status enum', async () => {
      const invalidData = { ...validTransactionData, status: 'INVALID' };
      await expect(Transaction.create(invalidData)).rejects.toThrow();
    });

    test('should validate source type enum', async () => {
      const invalidData = { ...validTransactionData, sourceType: 'INVALID' };
      await expect(Transaction.create(invalidData)).rejects.toThrow();
    });
  });

  describe('Decimal Handling', () => {
    test('should store amounts as strings and return Decimals', async () => {
      const transaction = await Transaction.create(validTransactionData);
      expect(transaction.amount instanceof Decimal).toBe(true);
      expect(transaction.balance instanceof Decimal).toBe(true);
    });

    test('should handle fees with decimal precision', async () => {
      const transaction = await Transaction.create(validTransactionData);
      expect(transaction.fees[0].amount instanceof Decimal).toBe(true);
      expect(transaction.fees[0].amount.toString()).toBe('2.50');
    });
  });

  describe('Methods', () => {
    describe('complete', () => {
      test('should mark transaction as completed', async () => {
        const transaction = await Transaction.create(validTransactionData);
        await transaction.complete();
        expect(transaction.status).toBe('COMPLETED');
        expect(transaction.processingDetails.lastAttempt).toBeDefined();
      });
    });

    describe('fail', () => {
      test('should mark transaction as failed with error details', async () => {
        const transaction = await Transaction.create(validTransactionData);
        await transaction.fail('ERROR_CODE', 'Error message');
        expect(transaction.status).toBe('FAILED');
        expect(transaction.errorDetails.code).toBe('ERROR_CODE');
        expect(transaction.errorDetails.message).toBe('Error message');
      });
    });

    describe('reverse', () => {
      test('should only allow reversing completed transactions', async () => {
        const transaction = await Transaction.create(validTransactionData);
        await expect(transaction.reverse('Test reversal')).rejects.toThrow('Only completed transactions can be reversed');
      });

      test('should create reversal transaction', async () => {
        const transaction = await Transaction.create({
          ...validTransactionData,
          status: 'COMPLETED'
        });
        const reversal = await transaction.reverse('Test reversal');
        expect(reversal.type).toBe('DEBIT');
        expect(reversal.amount.toString()).toBe('100.00');
        expect(reversal.description).toContain('Test reversal');
      });

      test('should swap source and destination for reversal', async () => {
        const transaction = await Transaction.create({
          ...validTransactionData,
          status: 'COMPLETED'
        });
        const reversal = await transaction.reverse('Test reversal');
        expect(reversal.sourceId).toBe(transaction.destinationId);
        expect(reversal.destinationId).toBe(transaction.sourceId);
      });
    });
  });

  describe('Statics', () => {
    describe('findByWalletId', () => {
      test('should find transactions by wallet ID', async () => {
        await Transaction.create(validTransactionData);
        const transactions = await Transaction.findByWalletId(validTransactionData.walletId);
        expect(transactions).toHaveLength(1);
      });

      test('should filter by status', async () => {
        await Transaction.create(validTransactionData);
        const transactions = await Transaction.findByWalletId(validTransactionData.walletId, { status: 'PENDING' });
        expect(transactions).toHaveLength(1);
      });

      test('should filter by type', async () => {
        await Transaction.create(validTransactionData);
        const transactions = await Transaction.findByWalletId(validTransactionData.walletId, { type: 'CREDIT' });
        expect(transactions).toHaveLength(1);
      });

      test('should respect limit and skip', async () => {
        await Transaction.create(validTransactionData);
        await Transaction.create(validTransactionData);
        const transactions = await Transaction.findByWalletId(validTransactionData.walletId, { limit: 1 });
        expect(transactions).toHaveLength(1);
      });
    });

    describe('getWalletBalance', () => {
      test('should return latest balance', async () => {
        await Transaction.create(validTransactionData);
        const balance = await Transaction.getWalletBalance(validTransactionData.walletId);
        expect(balance.toString()).toBe('500.00');
      });

      test('should return zero for non-existent wallet', async () => {
        const balance = await Transaction.getWalletBalance(new mongoose.Types.ObjectId());
        expect(balance.toString()).toBe('0.00');
      });
    });
  });

  describe('Indexes', () => {
    test('should have compound index on walletId, type, and status', async () => {
      // Create a transaction to ensure schema validation
      await Transaction.create(validTransactionData);
      
      // Look at the model's schema indexes
      const indexKeys = Transaction.schema.indexes().map(index => index[0]);
      
      // Find the compound index for walletId + type + status
      const hasCompoundIndex = indexKeys.some(key => 
        key.walletId === 1 && key.type === 1 && key.status === 1
      );
      
      expect(hasCompoundIndex).toBe(true);
    });

    test('should have compound index on walletId and createdAt', async () => {
      // Create a transaction to ensure schema validation
      await Transaction.create(validTransactionData);
      
      // Look at the model's schema indexes
      const indexKeys = Transaction.schema.indexes().map(index => index[0]);
      
      // Find the compound index for walletId + createdAt
      const hasCompoundIndex = indexKeys.some(key => 
        key.walletId === 1 && key.createdAt === -1
      );
      
      expect(hasCompoundIndex).toBe(true);
    });
  });
}); 