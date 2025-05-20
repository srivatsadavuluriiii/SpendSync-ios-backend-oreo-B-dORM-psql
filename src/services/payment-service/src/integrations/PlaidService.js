import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import BankAccount from '../models/BankAccount.js';

class PlaidService {
  constructor(plaidClient) {
    this.plaidClient = plaidClient;
    
    // Fix compatibility issues with Plaid API function naming
    if (!this.plaidClient.authMicrodepositsVerify) {
      this.plaidClient.authMicrodepositsVerify = this.plaidClient.authMicroDepositsVerify || 
        function(params) {
          // If neither method exists, create a custom handler for tests
          return Promise.reject(new Error('Plaid API method not available'));
        };
    }
    
    // Bind methods to ensure proper 'this' context
    this.createLinkToken = this.createLinkToken.bind(this);
    this.exchangePublicToken = this.exchangePublicToken.bind(this);
    this.getTransactions = this.getTransactions.bind(this);
    this.getBalance = this.getBalance.bind(this);
    this.verifyMicroDeposits = this.verifyMicroDeposits.bind(this);
    this.handleWebhook = this.handleWebhook.bind(this);
    
    // Bind private methods
    this._handleTransactionWebhook = this._handleTransactionWebhook.bind(this);
    this._handleAuthWebhook = this._handleAuthWebhook.bind(this);
    this._handleItemWebhook = this._handleItemWebhook.bind(this);
    this._mapAccountType = this._mapAccountType.bind(this);
  }

  async createLinkToken(userId, products = ['auth', 'transactions']) {
    try {
      const request = {
        user: {
          client_user_id: userId,
        },
        client_name: 'SpendSync',
        products,
        country_codes: ['US'],
        language: 'en',
      };

      const response = await this.plaidClient.linkTokenCreate(request);
      return response.data.link_token;
    } catch (error) {
      console.error('Error creating link token:', error);
      throw new Error('Failed to create bank link token');
    }
  }

  async exchangePublicToken(publicToken, userId) {
    try {
      const response = await this.plaidClient.itemPublicTokenExchange({
        public_token: publicToken
      });

      if (!response || !response.access_token) {
        throw new Error('Failed to link bank account');
      }

      return response.access_token;
    } catch (error) {
      console.error('Error exchanging public token:', error);
      throw new Error('Failed to link bank account');
    }
  }

  async getTransactions(accessToken, startDate, endDate, options = {}) {
    try {
      const request = {
        access_token: accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          count: options.count || 100,
          offset: options.offset || 0,
        },
      };
      
      const response = await this.plaidClient.transactionsGet(request);
      return response.data.transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch bank transactions');
    }
  }

  async getBalance(accessToken, accountId) {
    try {
      const response = await this.plaidClient.accountsGet({
        access_token: accessToken,
        options: {
          account_ids: [accountId]
        }
      });

      if (!response || !response.accounts || !response.accounts[0]) {
        throw new Error('Failed to retrieve account balance');
      }

      return response.accounts[0].balances;
    } catch (error) {
      console.error('Error fetching account balance:', error);
      throw new Error('Failed to retrieve account balance');
    }
  }

  async verifyMicroDeposits(accessToken, accountId, amounts) {
    try {
      await this.plaidClient.authMicrodepositsVerify({
        access_token: accessToken,
        account_id: accountId,
        amounts: amounts.map(amount => amount.toFixed(2))
      });
      return true;
    } catch (error) {
      console.error('Error verifying micro-deposits:', error);
      throw new Error('Failed to verify bank account');
    }
  }

  async handleWebhook(webhook) {
    try {
      const { webhook_type, webhook_code, item_id } = webhook;
      
      // Find associated bank account
      const bankAccount = await BankAccount.findOne({ plaidItemId: item_id });
      
      if (!bankAccount && webhook_code === 'ERROR') {
        throw new Error('Bank account not found');
      }
      
      switch (webhook_type) {
        case 'TRANSACTIONS':
          return await this._handleTransactionWebhook(webhook_code, bankAccount, webhook);
        case 'AUTH':
          return await this._handleAuthWebhook(webhook_code, bankAccount, webhook);
        case 'ITEM':
          return await this._handleItemWebhook(webhook_code, bankAccount, webhook);
        default:
          console.log(`Unhandled webhook type: ${webhook_type}`);
          return { status: 'ignored' };
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }

  // Private methods
  async _handleTransactionWebhook(webhookCode, bankAccount, webhook) {
    switch (webhookCode) {
      case 'TRANSACTIONS_REMOVED':
        return { status: 'processed', type: 'transactions_removed' };
      case 'DEFAULT_UPDATE':
        return { status: 'processed', type: 'transactions_updated' };
      case 'HISTORICAL_UPDATE':
        return { status: 'processed', type: 'transactions_historical' };
      default:
        return { status: 'ignored' };
    }
  }

  async _handleAuthWebhook(webhookCode, bankAccount, webhook) {
    if (webhookCode === 'ERROR') {
      bankAccount.status = 'VERIFICATION_FAILED';
      await bankAccount.save();
    }
    return { status: 'processed', type: 'auth' };
  }

  async _handleItemWebhook(webhookCode, bankAccount, webhook) {
    switch (webhookCode) {
      case 'ERROR':
        bankAccount.status = 'VERIFICATION_FAILED';
        await bankAccount.save();
        return { status: 'processed', type: 'item_error' };
      case 'PENDING_EXPIRATION':
        return { status: 'processed', type: 'item_expiring' };
      default:
        return { status: 'ignored' };
    }
  }

  _mapAccountType(type, subtype) {
    if (type === 'depository') {
      if (['checking', 'paypal'].includes(subtype)) {
        return 'CHECKING';
      } else if (['savings', 'cd', 'money market'].includes(subtype)) {
        return 'SAVINGS';
      }
    } else if (type === 'credit') {
      return 'CREDIT';
    }
    
    return 'CHECKING'; // Default
  }
}

export default PlaidService; 