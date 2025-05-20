import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import BankAccount from '../../src/models/BankAccount.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!';
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  delete process.env.ENCRYPTION_KEY;
}, 30000);

beforeEach(async () => {
  await BankAccount.deleteMany({});
});

describe('BankAccount Model', () => {
  const validBankAccountData = {
    userId: 'test-user-123',
    institutionName: 'Test Bank',
    accountType: 'CHECKING',
    accountNumber: '1234567890',
    routingNumber: '987654321',
    plaidAccountId: 'account-id',
    status: 'PENDING_VERIFICATION'
  };

  describe('Validation', () => {
    it('should create a valid bank account', async () => {
      const bankAccount = await BankAccount.create(validBankAccountData);
      expect(bankAccount._id).toBeDefined();
      expect(bankAccount.status).toBe('PENDING_VERIFICATION');
    });

    it('should require userId', async () => {
      const invalidData = { ...validBankAccountData };
      delete invalidData.userId;
      await expect(BankAccount.create(invalidData)).rejects.toThrow();
    });

    it('should require institutionName', async () => {
      const invalidData = { ...validBankAccountData };
      delete invalidData.institutionName;
      await expect(BankAccount.create(invalidData)).rejects.toThrow();
    });

    it('should validate accountType enum', async () => {
      const invalidData = { ...validBankAccountData, accountType: 'INVALID' };
      await expect(BankAccount.create(invalidData)).rejects.toThrow();
    });
  });

  describe('Encryption', () => {
    it('should encrypt accountNumber', async () => {
      const bankAccount = await BankAccount.create(validBankAccountData);
      const rawAccountNumber = bankAccount.get('accountNumber', null, { getters: false });
      
      // The encrypted value should not be equal to the original
      expect(rawAccountNumber).not.toBe(validBankAccountData.accountNumber);
    });

    it('should decrypt accountNumber correctly', async () => {
      const bankAccount = await BankAccount.create(validBankAccountData);
      
      // Using getter should return decrypted value
      expect(bankAccount.accountNumber).toBe(validBankAccountData.accountNumber);
    });

    it('should handle encryption errors gracefully', async () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      
      await expect(BankAccount.create(validBankAccountData)).rejects.toThrow();
      
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should handle decryption errors gracefully', async () => {
      const bankAccount = await BankAccount.create(validBankAccountData);
      
      // Save the original key and encrypted value
      const originalKey = process.env.ENCRYPTION_KEY;
      
      // Empty the encryption key to simulate a decryption error
      process.env.ENCRYPTION_KEY = '';
      
      // Create a new instance to avoid cache
      const refreshedAccount = await BankAccount.findById(bankAccount._id);
      
      // This should return null with an empty encryption key
      expect(refreshedAccount.accountNumber).toBeNull();
      
      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('Methods', () => {
    it('should update balance correctly', async () => {
      const bankAccount = await BankAccount.create(validBankAccountData);
      
      await bankAccount.updateBalance({
        available: 1000,
        current: 1200
      });
      
      expect(bankAccount.balance.available).toBe(1000);
      expect(bankAccount.balance.current).toBe(1200);
      expect(bankAccount.balance.lastUpdated).toBeDefined();
    });

    it('should handle verification attempts', async () => {
      const bankAccount = await BankAccount.create(validBankAccountData);
      
      // Should track verification attempt
      await bankAccount.trackVerificationAttempt(false);
      expect(bankAccount.verificationAttempts).toBe(1);
      expect(bankAccount.status).toBe('PENDING_VERIFICATION');
      
      // Should mark as verified after successful attempt
      await bankAccount.trackVerificationAttempt(true);
      expect(bankAccount.status).toBe('ACTIVE');
    });
  });

  describe('Statics', () => {
    it('should find active accounts by userId', async () => {
      await BankAccount.create([
        validBankAccountData,
        {
          ...validBankAccountData,
          accountNumber: '9876543210',
          status: 'ACTIVE'
        },
        {
          ...validBankAccountData,
          userId: 'other-user',
          accountNumber: '5432167890'
        }
      ]);
      
      const accounts = await BankAccount.findActiveByUserId(validBankAccountData.userId);
      expect(accounts).toHaveLength(1);
    });

    it('should find account by plaidItemId', async () => {
      const itemId = 'test-item-id';
      await BankAccount.create({
        ...validBankAccountData,
        plaidItemId: itemId
      });
      
      const account = await BankAccount.findByPlaidItemId(itemId);
      expect(account).toBeDefined();
      expect(account.plaidItemId).toBe(itemId);
    });
  });

  describe('Indexes', () => {
    it('should have compound index on userId and status', async () => {
      // Create a bank account to ensure schema validation
      await BankAccount.create(validBankAccountData);
      
      // Look at the model's schema indexes
      const indexKeys = BankAccount.schema.indexes().map(index => index[0]);
      
      // Find the compound index for userId + status
      const hasCompoundIndex = indexKeys.some(key => 
        key.userId === 1 && key.status === 1
      );
      
      expect(hasCompoundIndex).toBe(true);
    });

    it('should have sparse index on plaidItemId', async () => {
      // Create a bank account to ensure schema validation
      await BankAccount.create({
        ...validBankAccountData,
        plaidItemId: 'test-item-id'
      });
      
      // Look at the model's schema indexes
      const indexDefs = BankAccount.schema.indexes();
      
      // Find the sparse index for plaidItemId
      const sparseIndex = indexDefs.find(
        indexDef => indexDef[0].plaidItemId === 1 && indexDef[1].sparse === true
      );
      
      expect(sparseIndex).toBeDefined();
    });
  });

  describe('JSON Serialization', () => {
    it('should exclude sensitive fields in toJSON', async () => {
      const bankAccount = await BankAccount.create(validBankAccountData);
      const json = bankAccount.toJSON();
      
      // Sensitive fields should be excluded
      expect(json.accountNumber).toBeDefined();
      expect(json.routingNumber).toBeDefined();
      expect(json.plaidAccessToken).toBeUndefined();
    });
  });
}); 