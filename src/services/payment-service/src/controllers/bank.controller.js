import * as bankService from '../services/bank.service.js';

export const linkBankAccount = async (req, res) => {
  try {
    const account = await bankService.linkAccount({
      userId: req.user.id,
      publicToken: req.body.publicToken,
      accountId: req.body.accountId
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLinkedAccounts = async (req, res) => {
  try {
    const accounts = await bankService.getLinkedAccounts(req.user.id);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const unlinkBankAccount = async (req, res) => {
  try {
    await bankService.unlinkAccount(req.user.id, req.params.accountId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAccountBalance = async (req, res) => {
  try {
    const balance = await bankService.getAccountBalance(
      req.user.id,
      req.params.accountId
    );
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAccountTransactions = async (req, res) => {
  try {
    const transactions = await bankService.getAccountTransactions(
      req.user.id,
      req.params.accountId,
      req.query.startDate,
      req.query.endDate
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 