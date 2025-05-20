/**
 * Balance Service
 * 
 * This service calculates and manages user balances within groups,
 * tracking what each user owes or is owed based on expenses and settlements.
 */

const { roundToTwoDecimals } = require('../utils/math.utils');

class BalanceService {
  /**
   * Calculate balances for all users in a group
   * @param {string} groupId - Group ID
   * @param {Array} expenses - Array of expenses
   * @param {Array} settlements - Array of settlements
   * @param {Array} users - Array of users in the group
   * @returns {Object} User balances
   */
  async calculateGroupBalances(groupId, expenses, settlements, users) {
    // Initialize balances for all users
    const balances = {};
    users.forEach(user => {
      balances[user.id] = {
        userId: user.id,
        name: user.name,
        totalOwed: 0,         // Amount this user owes to others
        totalOwedToUser: 0,   // Amount others owe to this user
        netBalance: 0,        // Net balance (positive = is owed, negative = owes)
        owedToUsers: {},      // Detailed breakdown of what this user owes to others
        owedByUsers: {}       // Detailed breakdown of what others owe to this user
      };
    });
    
    // Process expenses to calculate who owes whom
    for (const expense of expenses) {
      // Skip deleted expenses
      if (expense.isDeleted) continue;
      
      // Find the payer
      const payerId = expense.paidBy;
      
      // Process each split
      for (const split of expense.splits) {
        const debtorId = split.userId;
        const amount = split.amount;
        
        // Skip if the user paid for themselves
        if (payerId === debtorId) continue;
        
        // Update balances
        this._updateBalanceForExpense(balances, payerId, debtorId, amount, expense.currency);
      }
    }
    
    // Process settlements to adjust balances
    for (const settlement of settlements) {
      // Skip pending settlements
      if (settlement.status !== 'completed') continue;
      
      const payerId = settlement.payerId;
      const receiverId = settlement.receiverId;
      const amount = settlement.amount;
      
      // Update balances for settlement
      this._updateBalanceForSettlement(balances, payerId, receiverId, amount, settlement.currency);
    }
    
    // Calculate net balances for all users
    for (const userId in balances) {
      const balance = balances[userId];
      balance.netBalance = roundToTwoDecimals(balance.totalOwedToUser - balance.totalOwed);
    }
    
    return balances;
  }
  
  /**
   * Calculate simplified debt graph for a group
   * @param {Object} balances - User balances object
   * @returns {Object} Simplified debt graph
   */
  calculateDebtGraph(balances) {
    // Create a matrix of who owes whom
    const users = Object.keys(balances);
    const debtGraph = {
      users,
      debts: []
    };
    
    // Process each user's debts
    for (const userId in balances) {
      const balance = balances[userId];
      
      // Process what this user owes to others
      for (const creditorId in balance.owedToUsers) {
        const debtInfo = balance.owedToUsers[creditorId];
        
        debtGraph.debts.push({
          from: userId,
          to: creditorId,
          amount: debtInfo.amount,
          currency: debtInfo.currency
        });
      }
    }
    
    return debtGraph;
  }
  
  /**
   * Calculate a user's balance in a group
   * @param {string} userId - User ID
   * @param {string} groupId - Group ID
   * @param {Array} expenses - Array of expenses
   * @param {Array} settlements - Array of settlements
   * @returns {Object} User balance
   */
  async calculateUserBalance(userId, groupId, expenses, settlements) {
    const balance = {
      userId,
      groupId,
      totalOwed: 0,
      totalOwedToUser: 0,
      netBalance: 0,
      owedToUsers: {},
      owedByUsers: {},
      activities: []
    };
    
    // Process expenses
    for (const expense of expenses) {
      // Skip deleted expenses
      if (expense.isDeleted) continue;
      
      const payerId = expense.paidBy;
      
      // Find this user's split
      const userSplit = expense.splits.find(split => split.userId === userId);
      
      if (payerId === userId) {
        // This user paid for the expense
        const paidTotal = expense.amount;
        let owedToUser = paidTotal;
        
        if (userSplit) {
          // Subtract the user's own share
          owedToUser -= userSplit.amount;
        }
        
        // Add to activity log
        balance.activities.push({
          type: 'expense',
          id: expense.id,
          date: expense.date,
          description: expense.description,
          paidBy: userId,
          amount: paidTotal,
          userPaid: paidTotal,
          userOwes: userSplit ? userSplit.amount : 0,
          netEffect: owedToUser,
          currency: expense.currency
        });
        
        // Process each split to determine who owes this user
        for (const split of expense.splits) {
          if (split.userId === userId) continue; // Skip user's own split
          
          const debtorId = split.userId;
          const amount = split.amount;
          
          this._addOwedByUser(balance, debtorId, amount, expense.currency);
        }
      } else if (userSplit) {
        // This user owes for the expense
        const owedAmount = userSplit.amount;
        
        // Add to activity log
        balance.activities.push({
          type: 'expense',
          id: expense.id,
          date: expense.date,
          description: expense.description,
          paidBy: payerId,
          amount: expense.amount,
          userPaid: 0,
          userOwes: owedAmount,
          netEffect: -owedAmount,
          currency: expense.currency
        });
        
        // Update what this user owes to the payer
        this._addOwedToUser(balance, payerId, owedAmount, expense.currency);
      }
    }
    
    // Process settlements
    for (const settlement of settlements) {
      // Skip pending settlements
      if (settlement.status !== 'completed') continue;
      
      const payerId = settlement.payerId;
      const receiverId = settlement.receiverId;
      const amount = settlement.amount;
      
      if (payerId === userId) {
        // This user paid a settlement
        balance.activities.push({
          type: 'settlement',
          id: settlement.id,
          date: settlement.completedAt || settlement.createdAt,
          description: `Payment to ${settlement.receiverName || receiverId}`,
          paidTo: receiverId,
          amount: amount,
          netEffect: 0, // Settlement just redistributes existing balances
          currency: settlement.currency
        });
        
        // Reduce what this user owes to the receiver
        this._reduceOwedToUser(balance, receiverId, amount, settlement.currency);
      } else if (receiverId === userId) {
        // This user received a settlement
        balance.activities.push({
          type: 'settlement',
          id: settlement.id,
          date: settlement.completedAt || settlement.createdAt,
          description: `Payment from ${settlement.payerName || payerId}`,
          paidBy: payerId,
          amount: amount,
          netEffect: 0, // Settlement just redistributes existing balances
          currency: settlement.currency
        });
        
        // Reduce what the payer owes to this user
        this._reduceOwedByUser(balance, payerId, amount, settlement.currency);
      }
    }
    
    // Calculate net balance
    balance.netBalance = roundToTwoDecimals(balance.totalOwedToUser - balance.totalOwed);
    
    // Sort activities by date (newest first)
    balance.activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return balance;
  }
  
  /**
   * Update balances for an expense
   * @param {Object} balances - Balances object
   * @param {string} payerId - User who paid
   * @param {string} debtorId - User who owes
   * @param {number} amount - Amount owed
   * @param {string} currency - Currency code
   * @private
   */
  _updateBalanceForExpense(balances, payerId, debtorId, amount, currency) {
    // What debtor owes to payer
    this._addOwedToUser(balances[debtorId], payerId, amount, currency);
    
    // What payer is owed by debtor
    this._addOwedByUser(balances[payerId], debtorId, amount, currency);
  }
  
  /**
   * Update balances for a settlement
   * @param {Object} balances - Balances object
   * @param {string} payerId - User who paid
   * @param {string} receiverId - User who received payment
   * @param {number} amount - Amount paid
   * @param {string} currency - Currency code
   * @private
   */
  _updateBalanceForSettlement(balances, payerId, receiverId, amount, currency) {
    // Reduce what payer owes to receiver
    this._reduceOwedToUser(balances[payerId], receiverId, amount, currency);
    
    // Reduce what receiver is owed by payer
    this._reduceOwedByUser(balances[receiverId], payerId, amount, currency);
  }
  
  /**
   * Add to what a user owes another user
   * @param {Object} balance - User balance object
   * @param {string} creditorId - User who is owed
   * @param {number} amount - Amount owed
   * @param {string} currency - Currency code
   * @private
   */
  _addOwedToUser(balance, creditorId, amount, currency) {
    if (!balance.owedToUsers[creditorId]) {
      balance.owedToUsers[creditorId] = {
        amount: 0,
        currency
      };
    }
    
    balance.owedToUsers[creditorId].amount = roundToTwoDecimals(
      balance.owedToUsers[creditorId].amount + amount
    );
    balance.totalOwed = roundToTwoDecimals(balance.totalOwed + amount);
  }
  
  /**
   * Add to what a user is owed by another user
   * @param {Object} balance - User balance object
   * @param {string} debtorId - User who owes
   * @param {number} amount - Amount owed
   * @param {string} currency - Currency code
   * @private
   */
  _addOwedByUser(balance, debtorId, amount, currency) {
    if (!balance.owedByUsers[debtorId]) {
      balance.owedByUsers[debtorId] = {
        amount: 0,
        currency
      };
    }
    
    balance.owedByUsers[debtorId].amount = roundToTwoDecimals(
      balance.owedByUsers[debtorId].amount + amount
    );
    balance.totalOwedToUser = roundToTwoDecimals(balance.totalOwedToUser + amount);
  }
  
  /**
   * Reduce what a user owes another user
   * @param {Object} balance - User balance object
   * @param {string} creditorId - User who is owed
   * @param {number} amount - Amount to reduce
   * @param {string} currency - Currency code
   * @private
   */
  _reduceOwedToUser(balance, creditorId, amount, currency) {
    if (!balance.owedToUsers[creditorId]) {
      return; // Nothing to reduce
    }
    
    const currentAmount = balance.owedToUsers[creditorId].amount;
    const newAmount = Math.max(0, roundToTwoDecimals(currentAmount - amount));
    
    const reduction = currentAmount - newAmount;
    
    balance.owedToUsers[creditorId].amount = newAmount;
    balance.totalOwed = roundToTwoDecimals(balance.totalOwed - reduction);
    
    // If balance is zero, remove the entry
    if (newAmount === 0) {
      delete balance.owedToUsers[creditorId];
    }
  }
  
  /**
   * Reduce what a user is owed by another user
   * @param {Object} balance - User balance object
   * @param {string} debtorId - User who owes
   * @param {number} amount - Amount to reduce
   * @param {string} currency - Currency code
   * @private
   */
  _reduceOwedByUser(balance, debtorId, amount, currency) {
    if (!balance.owedByUsers[debtorId]) {
      return; // Nothing to reduce
    }
    
    const currentAmount = balance.owedByUsers[debtorId].amount;
    const newAmount = Math.max(0, roundToTwoDecimals(currentAmount - amount));
    
    const reduction = currentAmount - newAmount;
    
    balance.owedByUsers[debtorId].amount = newAmount;
    balance.totalOwedToUser = roundToTwoDecimals(balance.totalOwedToUser - reduction);
    
    // If balance is zero, remove the entry
    if (newAmount === 0) {
      delete balance.owedByUsers[debtorId];
    }
  }
  
  /**
   * Get a summary of a user's balance in all groups
   * @param {string} userId - User ID
   * @param {Array} groupBalances - Array of user's balances in different groups
   * @returns {Object} Balance summary
   */
  summarizeUserBalances(userId, groupBalances) {
    const summary = {
      userId,
      totalOwed: 0,
      totalOwedToUser: 0,
      netBalance: 0,
      balancesByGroup: {},
      balancesByUser: {}
    };
    
    // Summarize balances by group
    for (const balance of groupBalances) {
      summary.totalOwed += balance.totalOwed;
      summary.totalOwedToUser += balance.totalOwedToUser;
      
      summary.balancesByGroup[balance.groupId] = {
        groupId: balance.groupId,
        groupName: balance.groupName || 'Unknown Group',
        totalOwed: balance.totalOwed,
        totalOwedToUser: balance.totalOwedToUser,
        netBalance: balance.netBalance
      };
      
      // Aggregate balances by user
      this._aggregateBalancesByUser(summary.balancesByUser, balance);
    }
    
    // Calculate net balance
    summary.netBalance = roundToTwoDecimals(summary.totalOwedToUser - summary.totalOwed);
    
    return summary;
  }
  
  /**
   * Aggregate balances by user
   * @param {Object} aggregated - Aggregated balances by user
   * @param {Object} balance - User balance in a group
   * @private
   */
  _aggregateBalancesByUser(aggregated, balance) {
    // Process what user owes to others
    for (const creditorId in balance.owedToUsers) {
      const { amount, currency } = balance.owedToUsers[creditorId];
      
      if (!aggregated[creditorId]) {
        aggregated[creditorId] = {
          userId: creditorId,
          name: balance.creditorNames?.[creditorId] || 'Unknown User',
          youOwe: 0,
          theyOwe: 0,
          netBalance: 0,
          currency
        };
      }
      
      aggregated[creditorId].youOwe += amount;
      aggregated[creditorId].netBalance = roundToTwoDecimals(
        aggregated[creditorId].theyOwe - aggregated[creditorId].youOwe
      );
    }
    
    // Process what others owe to user
    for (const debtorId in balance.owedByUsers) {
      const { amount, currency } = balance.owedByUsers[debtorId];
      
      if (!aggregated[debtorId]) {
        aggregated[debtorId] = {
          userId: debtorId,
          name: balance.debtorNames?.[debtorId] || 'Unknown User',
          youOwe: 0,
          theyOwe: 0,
          netBalance: 0,
          currency
        };
      }
      
      aggregated[debtorId].theyOwe += amount;
      aggregated[debtorId].netBalance = roundToTwoDecimals(
        aggregated[debtorId].theyOwe - aggregated[debtorId].youOwe
      );
    }
  }
}

module.exports = new BalanceService(); 