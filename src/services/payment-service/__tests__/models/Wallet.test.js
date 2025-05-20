import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Wallet from '../../src/models/Wallet.js';
import Transaction from '../../src/models/Transaction.js';
import Decimal from 'decimal.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
}, 30000);

beforeEach(async () => {
  await Wallet.deleteMany({});
  await Transaction.deleteMany({});
});

describe('Wallet Model', () => {
  const validWalletData = {
    userId: 'test-user-123',
    balance: '100.50',
    currency: 'USD'
  };

  describe('Validation', () => {
    it('should create a valid wallet', async () => {
      const wallet = new Wallet(validWalletData);
      const savedWallet = await wallet.save();
      expect(savedWallet._id).toBeDefined();
      expect(savedWallet.status).toBe('ACTIVE');
    });

    it('should require userId', async () => {
      const wallet = new Wallet({
        ...validWalletData,
        userId: undefined
      });
      await expect(wallet.save()).rejects.toThrow();
    });

    it('should enforce unique userId', async () => {
      await Wallet.create(validWalletData);
      await expect(Wallet.create(validWalletData)).rejects.toThrow();
    });

    it('should validate status enum', async () => {
      const wallet = new Wallet({
        ...validWalletData,
        status: 'INVALID'
      });
      await expect(wallet.save()).rejects.toThrow();
    });
  });

  describe('Decimal Handling', () => {
    it('should store balance as string and return Decimal', async () => {
      const wallet = await Wallet.create(validWalletData);
      expect(typeof wallet.get('balance', null, { getters: false })).toBe('string');
      expect(wallet.balance instanceof Decimal).toBe(true);
    });

    it('should handle large decimal numbers', async () => {
      const largeAmount = '999999999999.99';
      const wallet = await Wallet.create({
        ...validWalletData,
        balance: largeAmount
      });
      expect(wallet.balance.toString()).toBe(largeAmount);
    });

    it('should handle zero balance', async () => {
      const wallet = await Wallet.create({
        ...validWalletData,
        balance: '0'
      });
      expect(wallet.balance.isZero()).toBe(true);
    });
  });

  describe('Methods', () => {
    let wallet;

    beforeEach(async () => {
      wallet = await Wallet.create(validWalletData);
    });

    describe('credit', () => {
      it('should increase balance correctly', async () => {
        const initialBalance = new Decimal(validWalletData.balance);
        const creditAmount = new Decimal('50.25');
        
        await wallet.credit(creditAmount, 'Test credit');
        
        expect(wallet.balance.toString()).toBe(
          initialBalance.plus(creditAmount).toString()
        );
      });

      it('should create credit transaction', async () => {
        await wallet.credit('50.25', 'Test credit');
        
        const transaction = await Transaction.findOne({
          walletId: wallet._id,
          type: 'CREDIT'
        });
        
        expect(transaction).toBeDefined();
        expect(transaction.amount.toString()).toBe('50.25');
      });
    });

    describe('debit', () => {
      it('should decrease balance correctly', async () => {
        const initialBalance = new Decimal(validWalletData.balance);
        const debitAmount = new Decimal('50.25');
        
        await wallet.debit(debitAmount, 'Test debit');
        
        expect(wallet.balance.toString()).toBe(
          initialBalance.minus(debitAmount).toString()
        );
      });

      it('should prevent overdraft', async () => {
        await expect(
          wallet.debit('150.75', 'Test overdraft')
        ).rejects.toThrow('Insufficient funds');
      });

      it('should create debit transaction', async () => {
        await wallet.debit('50.25', 'Test debit');
        
        const transaction = await Transaction.findOne({
          walletId: wallet._id,
          type: 'DEBIT'
        });
        
        expect(transaction).toBeDefined();
        expect(transaction.amount.toString()).toBe('50.25');
      });
    });

    describe('limits', () => {
      it('should enforce daily limit', async () => {
        // First, increase the wallet balance
        await wallet.credit('1000', 'Adding funds for test');
        
        // Now test daily limit
        await wallet.debit('900', 'First transaction');
        await expect(
          wallet.debit('200', 'Second transaction')
        ).rejects.toThrow('Daily limit exceeded');
      });

      it('should reset daily limit at midnight', async () => {
        // First, increase the wallet balance
        await wallet.credit('1000', 'Adding funds for test');
        
        // Set last reset to yesterday
        wallet.usage.daily.lastReset = new Date(
          new Date().setDate(new Date().getDate() - 1)
        );
        await wallet.save();

        // Should allow new transactions
        await wallet.debit('900', 'New day transaction');
        expect(wallet.usage.daily.amount).toBe(900);
      });

      it('should enforce monthly limit', async () => {
        // First, increase the wallet balance
        await wallet.credit('2000', 'Adding funds for test');
        
        // Update monthly limit for test
        wallet.limits.monthly = 1000;
        await wallet.save();

        await wallet.debit('800', 'First transaction');
        await expect(
          wallet.debit('300', 'Second transaction')
        ).rejects.toThrow('Monthly limit exceeded');
      });
    });

    describe('status management', () => {
      it('should freeze wallet', async () => {
        await wallet.freeze('Suspicious activity');
        expect(wallet.status).toBe('FROZEN');
      });

      it('should unfreeze wallet', async () => {
        await wallet.freeze('Suspicious activity');
        await wallet.unfreeze('Verification complete');
        expect(wallet.status).toBe('ACTIVE');
      });
    });
  });

  describe('Statics', () => {
    it('should find active wallet by userId', async () => {
      await Wallet.create([
        validWalletData,
        {
          ...validWalletData,
          userId: 'other-user',
          status: 'ACTIVE'
        },
        {
          ...validWalletData,
          userId: 'frozen-user',
          status: 'FROZEN'
        }
      ]);

      const wallet = await Wallet.findByUserId(validWalletData.userId);
      expect(wallet).toBeDefined();
      expect(wallet.userId).toBe(validWalletData.userId);
      expect(wallet.status).toBe('ACTIVE');
    });

    it('should create new wallet with default values', async () => {
      const wallet = await Wallet.createWallet('new-user');
      expect(wallet.userId).toBe('new-user');
      expect(wallet.balance.isZero()).toBe(true);
      expect(wallet.currency).toBe('USD');
      expect(wallet.status).toBe('ACTIVE');
    });
  });

  describe('Indexes', () => {
    it('should have compound index on userId and status', async () => {
      // Create a wallet to ensure schema validation
      await Wallet.create(validWalletData);
      
      // Look at the model's schema indexes
      const indexKeys = Wallet.schema.indexes().map(index => index[0]);
      
      // Find the compound index for userId + status
      const hasCompoundIndex = indexKeys.some(key => 
        key.userId === 1 && key.status === 1
      );
      
      expect(hasCompoundIndex).toBe(true);
    });

    it('should have indexes for usage tracking', async () => {
      // Create a wallet to ensure schema validation
      await Wallet.create(validWalletData);
      
      // Look at the model's schema indexes
      const indexKeys = Wallet.schema.indexes().map(index => index[0]);
      
      // Check if usage tracking indexes exist
      const hasDailyResetIndex = indexKeys.some(key => key['usage.daily.lastReset'] === 1);
      const hasMonthlyResetIndex = indexKeys.some(key => key['usage.monthly.lastReset'] === 1);
      
      expect(hasDailyResetIndex).toBe(true);
      expect(hasMonthlyResetIndex).toBe(true);
    });
  });
}); 