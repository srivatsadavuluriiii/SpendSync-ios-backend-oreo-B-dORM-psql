import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { BankAccount } from '../models/bank-account.model.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

export const linkAccount = async ({ userId, publicToken, accountId }) => {
  try {
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get account details
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken
    });

    const account = accountsResponse.data.accounts.find(
      acc => acc.account_id === accountId
    );

    if (!account) {
      throw new ValidationError('Account not found in Plaid response');
    }

    // Save bank account details
    const bankAccount = await BankAccount.create({
      userId,
      plaidItemId: itemId,
      plaidAccessToken: accessToken,
      plaidAccountId: accountId,
      name: account.name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
      status: 'active'
    });

    return {
      id: bankAccount._id,
      name: bankAccount.name,
      mask: bankAccount.mask,
      type: bankAccount.type,
      subtype: bankAccount.subtype
    };
  } catch (error) {
    throw new Error(`Failed to link bank account: ${error.message}`);
  }
};

export const getLinkedAccounts = async (userId) => {
  const accounts = await BankAccount.find({ userId, status: 'active' });
  return accounts.map(account => ({
    id: account._id,
    name: account.name,
    mask: account.mask,
    type: account.type,
    subtype: account.subtype
  }));
};

export const unlinkAccount = async (userId, accountId) => {
  const account = await BankAccount.findOne({
    _id: accountId,
    userId,
    status: 'active'
  });

  if (!account) {
    throw new NotFoundError('Bank account not found');
  }

  try {
    // Remove the Plaid Item
    await plaidClient.itemRemove({
      access_token: account.plaidAccessToken
    });

    // Mark account as inactive
    account.status = 'inactive';
    await account.save();
  } catch (error) {
    throw new Error(`Failed to unlink bank account: ${error.message}`);
  }
};

export const getAccountBalance = async (userId, accountId) => {
  const account = await BankAccount.findOne({
    _id: accountId,
    userId,
    status: 'active'
  });

  if (!account) {
    throw new NotFoundError('Bank account not found');
  }

  try {
    const response = await plaidClient.accountsBalanceGet({
      access_token: account.plaidAccessToken
    });

    const plaidAccount = response.data.accounts.find(
      acc => acc.account_id === account.plaidAccountId
    );

    if (!plaidAccount) {
      throw new Error('Account not found in Plaid response');
    }

    return {
      available: plaidAccount.balances.available,
      current: plaidAccount.balances.current,
      limit: plaidAccount.balances.limit,
      isoCurrencyCode: plaidAccount.balances.iso_currency_code
    };
  } catch (error) {
    throw new Error(`Failed to get account balance: ${error.message}`);
  }
};

export const getAccountTransactions = async (userId, accountId, startDate, endDate) => {
  const account = await BankAccount.findOne({
    _id: accountId,
    userId,
    status: 'active'
  });

  if (!account) {
    throw new NotFoundError('Bank account not found');
  }

  try {
    const response = await plaidClient.transactionsGet({
      access_token: account.plaidAccessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        account_ids: [account.plaidAccountId]
      }
    });

    return response.data.transactions.map(transaction => ({
      id: transaction.transaction_id,
      amount: transaction.amount,
      date: transaction.date,
      name: transaction.name,
      merchantName: transaction.merchant_name,
      category: transaction.category,
      pending: transaction.pending,
      type: transaction.transaction_type,
      isoCurrencyCode: transaction.iso_currency_code
    }));
  } catch (error) {
    throw new Error(`Failed to get account transactions: ${error.message}`);
  }
}; 