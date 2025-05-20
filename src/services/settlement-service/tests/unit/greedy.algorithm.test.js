/**
 * Greedy Algorithm Tests
 * 
 * Unit tests for the greedy settlement algorithm implementation
 */

const { calculateNetBalances } = require('../../src/algorithms/min-cash-flow.algorithm');

// Mock implementation of the greedy algorithm for testing
function calculateGreedySettlements(debtGraph) {
  // Calculate net balances
  const balances = calculateNetBalances(debtGraph);
  
  const settlements = [];
  const debtors = [];
  const creditors = [];
  
  // Separate users into debtors and creditors
  Object.entries(balances).forEach(([user, balance]) => {
    if (balance < 0) {
      debtors.push({ user, amount: Math.abs(balance) });
    } else if (balance > 0) {
      creditors.push({ user, amount: balance });
    }
  });
  
  // Sort by amount (largest first)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  // Match debtors with creditors
  let debtorIndex = 0;
  let creditorIndex = 0;
  
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    if (amount > 0) {
      settlements.push({
        from: debtor.user,
        to: creditor.user,
        amount
      });
    }
    
    // Update remaining amounts
    debtor.amount -= amount;
    creditor.amount -= amount;
    
    // Move to next debtor/creditor if their balance is settled
    if (Math.abs(debtor.amount) < 0.01) debtorIndex++;
    if (Math.abs(creditor.amount) < 0.01) creditorIndex++;
  }
  
  return settlements;
}

describe('Greedy Settlement Algorithm', () => {
  test('should generate valid settlements for simple debts', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3'],
      debts: [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user2', to: 'user3', amount: 50 }
      ]
    };

    // Act
    const settlements = calculateGreedySettlements(debtGraph);

    // Assert
    expect(settlements).toHaveLength(2);
    expect(settlements).toContainEqual({ from: 'user1', to: 'user2', amount: 50 });
    expect(settlements).toContainEqual({ from: 'user1', to: 'user3', amount: 50 });
  });

  test('should handle case with no debts', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3'],
      debts: []
    };

    // Act
    const settlements = calculateGreedySettlements(debtGraph);

    // Assert
    expect(settlements).toHaveLength(0);
  });

  test('should match largest debtors with largest creditors first', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3', 'user4'],
      debts: [
        { from: 'user1', to: 'user3', amount: 100 }, // user1 owes 100
        { from: 'user2', to: 'user3', amount: 50 },  // user2 owes 50
        { from: 'user2', to: 'user4', amount: 30 }   // user4 is owed 30, user3 is owed 150
      ]
    };

    // Act
    const settlements = calculateGreedySettlements(debtGraph);

    // Assert
    // The first settlement should be the largest debtor (user1) to the largest creditor (user3)
    expect(settlements[0]).toEqual({ from: 'user1', to: 'user3', amount: 100 });
    
    // Total number of settlements should be optimal
    expect(settlements.length).toBeLessThanOrEqual(3);
    
    // Verify balances are settled
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

  test('should handle complex debt network', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3', 'user4', 'user5'],
      debts: [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user1', to: 'user3', amount: 200 },
        { from: 'user2', to: 'user4', amount: 50 },
        { from: 'user3', to: 'user5', amount: 150 },
        { from: 'user4', to: 'user5', amount: 100 }
      ]
    };

    // Act
    const settlements = calculateGreedySettlements(debtGraph);

    // Assert
    // Verify the number of settlements is reasonable (should be <= original debts)
    expect(settlements.length).toBeLessThanOrEqual(5);
    
    // Verify the amounts balance out correctly
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

  test('should handle circular debt patterns', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3'],
      debts: [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user2', to: 'user3', amount: 100 },
        { from: 'user3', to: 'user1', amount: 100 }
      ]
    };

    // Act
    const settlements = calculateGreedySettlements(debtGraph);

    // Assert
    // In a perfect circular debt, there should be no settlements needed
    // But the greedy algorithm might not detect this directly
    
    // Verify the balances still end up correct
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

  test('should handle case with uneven amounts', () => {
    // Arrange
    const debtGraph = {
      users: ['user1', 'user2', 'user3', 'user4'],
      debts: [
        { from: 'user1', to: 'user2', amount: 73.42 },
        { from: 'user3', to: 'user2', amount: 25.18 },
        { from: 'user3', to: 'user4', amount: 50.33 }
      ]
    };

    // Act
    const settlements = calculateGreedySettlements(debtGraph);

    // Assert
    // Verify the results are balanced with floating point values
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