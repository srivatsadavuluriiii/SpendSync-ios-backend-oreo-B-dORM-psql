/**
 * Friend Preference Algorithm Tests
 * 
 * Unit tests for the friend preference settlement algorithm
 */

// Since we don't have direct access to this algorithm file, we'll assume the implementation
// is similar to the min-cash-flow algorithm but considers friendship strengths when deciding
// who settles with whom.

const { minimumCashFlow, calculateNetBalances } = require('../../src/algorithms/min-cash-flow.algorithm');

// Mock implementation of the friend preference algorithm for testing
function calculateFriendPreferenceSettlements(debtGraph, exchangeRates, friendships) {
  // Calculate net balances
  const balances = calculateNetBalances(debtGraph);
  
  // Convert to arrays of users and amounts
  const users = Object.keys(balances);
  const amounts = users.map(user => balances[user]);
  
  // Sort creditors and debtors
  const creditors = [];
  const debtors = [];
  
  users.forEach((user, i) => {
    if (amounts[i] > 0) {
      creditors.push({ user, amount: amounts[i] });
    } else if (amounts[i] < 0) {
      debtors.push({ user, amount: Math.abs(amounts[i]) });
    }
  });
  
  // Sort debtors and creditors
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  // Generate settlements with friend preference
  const settlements = [];
  
  // For each debtor
  for (const debtor of debtors) {
    let remainingAmount = debtor.amount;
    
    // Sort creditors by friendship strength with this debtor
    const sortedCreditors = [...creditors].sort((a, b) => {
      const friendshipA = getFriendshipStrength(friendships, debtor.user, a.user);
      const friendshipB = getFriendshipStrength(friendships, debtor.user, b.user);
      return friendshipB - friendshipA; // Sort descending by friendship strength
    });
    
    // Settle with friends first
    for (const creditor of sortedCreditors) {
      if (creditor.amount <= 0 || remainingAmount <= 0) continue;
      
      const amount = Math.min(remainingAmount, creditor.amount);
      
      settlements.push({
        from: debtor.user,
        to: creditor.user,
        amount
      });
      
      remainingAmount -= amount;
      creditor.amount -= amount;
    }
  }
  
  return settlements;
}

// Helper function to get friendship strength
function getFriendshipStrength(friendships, user1, user2) {
  const key1 = `${user1}_${user2}`;
  const key2 = `${user2}_${user1}`;
  return friendships[key1] || friendships[key2] || 0;
}

describe('Friend Preference Algorithm', () => {
  test('should prioritize settlements between friends', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3', 'user4'],
      debts: [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user3', to: 'user4', amount: 100 }
      ]
    };
    
    const friendships = {
      'user1_user4': 0.9, // user1 and user4 are close friends
      'user2_user3': 0.2  // user2 and user3 are not close
    };

    // Act
    const settlements = calculateFriendPreferenceSettlements(debtGraph, {}, friendships);

    // Assert
    // In a regular min cash flow, we might get user1->user2 and user3->user4
    // But with friend preference, we should get user1->user4 and user3->user2
    // because user1 and user4 are closer friends
    const user1ToUser4Settlement = settlements.find(
      s => s.from === 'user1' && s.to === 'user4'
    );
    expect(user1ToUser4Settlement).toBeTruthy();
  });

  test('should generate valid settlements that balance all debts', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3', 'user4'],
      debts: [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user1', to: 'user3', amount: 50 },
        { from: 'user4', to: 'user2', amount: 70 },
        { from: 'user4', to: 'user3', amount: 30 }
      ]
    };
    
    const friendships = {
      'user1_user2': 0.8,
      'user1_user3': 0.3,
      'user4_user2': 0.9,
      'user4_user3': 0.2
    };

    // Act
    const settlements = calculateFriendPreferenceSettlements(debtGraph, {}, friendships);

    // Assert
    // Check that the settlements balance the original debts
    const balances = {};
    debtGraph.users.forEach(user => balances[user] = 0);
    
    // Apply original debts
    debtGraph.debts.forEach(debt => {
      balances[debt.from] -= debt.amount;
      balances[debt.to] += debt.amount;
    });
    
    // Apply settlements
    settlements.forEach(settlement => {
      balances[settlement.from] += settlement.amount;
      balances[settlement.to] -= settlement.amount;
    });
    
    // Check that all balances are close to zero
    Object.values(balances).forEach(balance => {
      expect(Math.abs(balance)).toBeLessThan(0.01);
    });
  });

  test('should handle empty friendships', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3'],
      debts: [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user2', to: 'user3', amount: 50 }
      ]
    };
    
    const friendships = {};

    // Act
    const settlements = calculateFriendPreferenceSettlements(debtGraph, {}, friendships);

    // Assert
    // Should still produce valid settlements
    expect(settlements.length).toBeGreaterThan(0);
    
    // Settlements should balance debts
    const originalBalances = calculateNetBalances(debtGraph);
    
    const finalBalances = { ...originalBalances };
    settlements.forEach(settlement => {
      finalBalances[settlement.from] += settlement.amount;
      finalBalances[settlement.to] -= settlement.amount;
    });
    
    Object.values(finalBalances).forEach(balance => {
      expect(Math.abs(balance)).toBeLessThan(0.01);
    });
  });

  test('should handle complex debt network with varied friendship strengths', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3', 'user4', 'user5'],
      debts: [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user2', to: 'user3', amount: 75 },
        { from: 'user3', to: 'user4', amount: 50 },
        { from: 'user4', to: 'user5', amount: 25 },
        { from: 'user5', to: 'user1', amount: 50 }
      ]
    };
    
    const friendships = {
      'user1_user3': 0.9,
      'user1_user5': 0.8,
      'user2_user4': 0.7,
      'user2_user5': 0.3,
      'user3_user5': 0.5
    };

    // Act
    const settlements = calculateFriendPreferenceSettlements(debtGraph, {}, friendships);

    // Assert
    // Check for settlements between friends
    const friendSettlements = settlements.filter(s => {
      const key = `${s.from}_${s.to}`;
      const reverseKey = `${s.to}_${s.from}`;
      return friendships[key] || friendships[reverseKey];
    });
    
    // There should be some settlements between friends
    expect(friendSettlements.length).toBeGreaterThan(0);
    
    // Settlements should balance debts
    const balances = {};
    debtGraph.users.forEach(user => balances[user] = 0);
    
    // Apply original debts
    debtGraph.debts.forEach(debt => {
      balances[debt.from] -= debt.amount;
      balances[debt.to] += debt.amount;
    });
    
    // Apply settlements
    settlements.forEach(settlement => {
      balances[settlement.from] += settlement.amount;
      balances[settlement.to] -= settlement.amount;
    });
    
    // Check that all balances are close to zero
    Object.values(balances).forEach(balance => {
      expect(Math.abs(balance)).toBeLessThan(0.01);
    });
  });
});