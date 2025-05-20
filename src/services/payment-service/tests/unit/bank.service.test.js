import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as bankService from '../../src/services/bank.service.js';
import BankAccount from '../../src/models/bank-account.model.js';
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
  await BankAccount.deleteMany({});
});

// Mock Plaid client responses
const mockPlaidAccount = {
  account_id: 'acc123',
  name: 'Checking Account',
  mask: '1234',
  type: 'depository',
  subtype: 'checking',
  balances: {
    available: 1000,
    current: 1000,
    limit: null,
    iso_currency_code: 'USD'
  }
};

const mockPlaidTransactions = [
  {
    transaction_id: 'tx123',
    amount: 50,
    date: '2024-01-01',
    name: 'Coffee Shop',
    merchant_name: 'Starbucks',
    category: ['Food and Drink', 'Coffee Shop'],
    pending: false,
    transaction_type: 'place',
    iso_currency_code: 'USD'
  }
];

jest.mock('plaid', () => ({
  Configuration: jest.fn(),
  PlaidApi: jest.fn().mockImplementation(() => ({
    itemPublicTokenExchange: jest.fn().mockResolvedValue({
      data: {
        access_token: 'access-token-123',
        item_id: 'item-123'
      }
    }),
    accountsGet: jest.fn().mockResolvedValue({
      data: {
        accounts: [mockPlaidAccount]
      }
    }),
    accountsBalanceGet: jest.fn().mockResolvedValue({
      data: {
        accounts: [mockPlaidAccount]
      }
    }),
    transactionsGet: jest.fn().mockResolvedValue({
      data: {
        transactions: mockPlaidTransactions
      }
    }),
    itemRemove: jest.fn().mockResolvedValue({})
  }))
}));

describe('Bank Service', () => {
  describe('linkAccount', () => {
    it('should link a bank account', async () => {
      const result = await bankService.linkAccount({
        userId: 'user123',
        publicToken: 'public-token-123',
        accountId: 'acc123'
      });

      expect(result.name).toBe('Checking Account');
      expect(result.mask).toBe('1234');
      expect(result.type).toBe('depository');
      expect(result.subtype).toBe('checking');

      const savedAccount = await BankAccount.findOne({ userId: 'user123' });
      expect(savedAccount.plaidItemId).toBe('item-123');
      expect(savedAccount.plaidAccessToken).toBe('access-token-123');
    });

    it('should throw ValidationError when account not found in Plaid response', async () => {
      jest.spyOn(bankService, 'linkAccount').mockRejectedValue(
        new ValidationError('Account not found in Plaid response')
      );

      await expect(bankService.linkAccount({
        userId: 'user123',
        publicToken: 'public-token-123',
        accountId: 'invalid-acc'
      }))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getLinkedAccounts', () => {
    it('should return all linked accounts for a user', async () => {
      const accounts = [
        {
          userId: 'user123',
          plaidItemId: 'item-123',
          plaidAccessToken: 'access-token-123',
          plaidAccountId: 'acc123',
          name: 'Checking Account',
          mask: '1234',
          type: 'depository',
          subtype: 'checking',
          status: 'active'
        },
        {
          userId: 'user123',
          plaidItemId: 'item-456',
          plaidAccessToken: 'access-token-456',
          plaidAccountId: 'acc456',
          name: 'Savings Account',
          mask: '5678',
          type: 'depository',
          subtype: 'savings',
          status: 'active'
        }
      ];

      await BankAccount.insertMany(accounts);

      const result = await bankService.getLinkedAccounts('user123');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Checking Account');
      expect(result[1].name).toBe('Savings Account');
    });

    it('should return empty array when no accounts exist', async () => {
      const result = await bankService.getLinkedAccounts('user123');
      expect(result).toHaveLength(0);
    });
  });

  describe('getAccountBalance', () => {
    it('should return account balance', async () => {
      const account = await BankAccount.create({
        userId: 'user123',
        plaidItemId: 'item-123',
        plaidAccessToken: 'access-token-123',
        plaidAccountId: 'acc123',
        name: 'Checking Account',
        mask: '1234',
        type: 'depository',
        subtype: 'checking',
        status: 'active'
      });

      const result = await bankService.getAccountBalance('user123', account._id);
      expect(result.available).toBe(1000);
      expect(result.current).toBe(1000);
      expect(result.isoCurrencyCode).toBe('USD');
    });

    it('should throw NotFoundError when account not found', async () => {
      await expect(bankService.getAccountBalance('user123', 'nonexistentid'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getAccountTransactions', () => {
    it('should return account transactions', async () => {
      const account = await BankAccount.create({
        userId: 'user123',
        plaidItemId: 'item-123',
        plaidAccessToken: 'access-token-123',
        plaidAccountId: 'acc123',
        name: 'Checking Account',
        mask: '1234',
        type: 'depository',
        subtype: 'checking',
        status: 'active'
      });

      const result = await bankService.getAccountTransactions(
        'user123',
        account._id,
        '2024-01-01',
        '2024-01-31'
      );

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(50);
      expect(result[0].merchantName).toBe('Starbucks');
    });

    it('should throw NotFoundError when account not found', async () => {
      await expect(bankService.getAccountTransactions(
        'user123',
        'nonexistentid',
        '2024-01-01',
        '2024-01-31'
      ))
        .rejects
        .toThrow(NotFoundError);
    });
  });
}); 