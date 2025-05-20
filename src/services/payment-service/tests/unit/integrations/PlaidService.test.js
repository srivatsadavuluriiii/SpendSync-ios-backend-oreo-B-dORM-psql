import { jest } from '@jest/globals';
import PlaidService from '../../../src/integrations/PlaidService';

describe('PlaidService', () => {
  let plaidService;
  let mockPlaidClient;

  beforeEach(() => {
    // Create mock Plaid client
    mockPlaidClient = {
      linkTokenCreate: jest.fn(),
      itemPublicTokenExchange: jest.fn(),
      transactionsGet: jest.fn(),
      accountsGet: jest.fn(),
      authMicrodepositsVerify: jest.fn()
    };

    // Initialize PlaidService with mock client
    plaidService = new PlaidService(mockPlaidClient);
  });

  describe('createLinkToken', () => {
    it('should create a link token successfully', async () => {
      const userId = 'test-user-id';
      const mockResponse = {
        data: {
          link_token: 'test-link-token'
        }
      };

      mockPlaidClient.linkTokenCreate.mockResolvedValue(mockResponse);

      const result = await plaidService.createLinkToken(userId);

      expect(result).toBe('test-link-token');
      expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
        user: {
          client_user_id: userId,
        },
        client_name: 'SpendSync',
        products: ['auth', 'transactions'],
        country_codes: ['US'],
        language: 'en',
      });
    });

    it('should handle errors when creating link token', async () => {
      const userId = 'test-user-id';
      mockPlaidClient.linkTokenCreate.mockRejectedValue(new Error('Plaid API error'));

      await expect(plaidService.createLinkToken(userId))
        .rejects
        .toThrow('Failed to create bank link token');
    });
  });

  describe('exchangePublicToken', () => {
    it('should exchange public token successfully', async () => {
      const publicToken = 'test-public-token';
      const userId = 'test-user-id';
      const mockResponse = {
        access_token: 'test-access-token'
      };

      mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(mockResponse);

      const result = await plaidService.exchangePublicToken(publicToken, userId);

      expect(result).toBe('test-access-token');
      expect(mockPlaidClient.itemPublicTokenExchange).toHaveBeenCalledWith({
        public_token: publicToken
      });
    });

    it('should handle errors when exchanging public token', async () => {
      const publicToken = 'test-public-token';
      const userId = 'test-user-id';
      mockPlaidClient.itemPublicTokenExchange.mockRejectedValue(new Error('Plaid API error'));

      await expect(plaidService.exchangePublicToken(publicToken, userId))
        .rejects
        .toThrow('Failed to link bank account');
    });
  });

  describe('getBalance', () => {
    it('should get account balance successfully', async () => {
      const accessToken = 'test-access-token';
      const accountId = 'test-account-id';
      const mockResponse = {
        accounts: [{
          balances: {
            available: 100,
            current: 100,
            limit: null
          }
        }]
      };

      mockPlaidClient.accountsGet.mockResolvedValue(mockResponse);

      const result = await plaidService.getBalance(accessToken, accountId);

      expect(result).toEqual(mockResponse.accounts[0].balances);
      expect(mockPlaidClient.accountsGet).toHaveBeenCalledWith({
        access_token: accessToken,
        options: {
          account_ids: [accountId]
        }
      });
    });

    it('should handle errors when getting balance', async () => {
      const accessToken = 'test-access-token';
      const accountId = 'test-account-id';
      mockPlaidClient.accountsGet.mockRejectedValue(new Error('Plaid API error'));

      await expect(plaidService.getBalance(accessToken, accountId))
        .rejects
        .toThrow('Failed to retrieve account balance');
    });
  });

  describe('verifyMicroDeposits', () => {
    it('should verify micro-deposits successfully', async () => {
      const accessToken = 'test-access-token';
      const accountId = 'test-account-id';
      const amounts = [0.01, 0.02];

      mockPlaidClient.authMicrodepositsVerify.mockResolvedValue({});

      const result = await plaidService.verifyMicroDeposits(accessToken, accountId, amounts);

      expect(result).toBe(true);
      expect(mockPlaidClient.authMicrodepositsVerify).toHaveBeenCalledWith({
        access_token: accessToken,
        account_id: accountId,
        amounts: ['0.01', '0.02']
      });
    });

    it('should handle errors when verifying micro-deposits', async () => {
      const accessToken = 'test-access-token';
      const accountId = 'test-account-id';
      const amounts = [0.01, 0.02];
      mockPlaidClient.authMicrodepositsVerify.mockRejectedValue(new Error('Plaid API error'));

      await expect(plaidService.verifyMicroDeposits(accessToken, accountId, amounts))
        .rejects
        .toThrow('Failed to verify bank account');
    });
  });

  describe('handleWebhook', () => {
    it('should handle transaction webhooks', async () => {
      const webhook = {
        webhook_type: 'TRANSACTIONS',
        webhook_code: 'DEFAULT_UPDATE',
        item_id: 'test-item-id'
      };

      const result = await plaidService.handleWebhook(webhook);

      expect(result).toEqual({
        status: 'processed',
        type: 'transactions_updated'
      });
    });

    it('should handle auth webhooks', async () => {
      const webhook = {
        webhook_type: 'AUTH',
        webhook_code: 'ERROR',
        item_id: 'test-item-id'
      };

      const result = await plaidService.handleWebhook(webhook);

      expect(result).toEqual({
        status: 'processed',
        type: 'auth'
      });
    });

    it('should handle item webhooks', async () => {
      const webhook = {
        webhook_type: 'ITEM',
        webhook_code: 'ERROR',
        item_id: 'test-item-id'
      };

      const result = await plaidService.handleWebhook(webhook);

      expect(result).toEqual({
        status: 'processed',
        type: 'item_error'
      });
    });
  });
}); 