import * as walletService from '../services/wallet.service.js';

export const getBalance = async (req, res) => {
  try {
    const balance = await walletService.getBalance(req.user.id);
    res.json(balance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deposit = async (req, res) => {
  try {
    const transaction = await walletService.deposit({
      userId: req.user.id,
      amount: req.body.amount,
      currency: req.body.currency,
      source: req.body.source
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const withdraw = async (req, res) => {
  try {
    const transaction = await walletService.withdraw({
      userId: req.user.id,
      amount: req.body.amount,
      currency: req.body.currency,
      destination: req.body.destination
    });
    res.status(201).json(transaction);
  } catch (error) {
    if (error.message === 'Insufficient funds') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

export const getTransactions = async (req, res) => {
  try {
    const transactions = await walletService.getTransactions(req.user.id);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; 