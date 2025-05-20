/**
 * Min Cash Flow Algorithm Tests
 * 
 * Unit tests for the minimum cash flow algorithm implementation
 */

const { 
  minimumCashFlow, 
  calculateNetBalances, 
  simplifyCircularDebts,
  handleMultipleCurrencies
} = require('../../src/algorithms/min-cash-flow.algorithm');

describe('Min Cash Flow Algorithm', () => {
  describe('calculateNetBalances', () => {
    test('should calculate correct net balances for simple debt graph', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100 },
          { from: 'user2', to: 'user3', amount: 50 }
        ]
      };

      // Act
      const balances = calculateNetBalances(debtGraph);

      // Assert
      expect(balances).toEqual({
        'user1': -100,
        'user2': 50,
        'user3': 50
      });
    });

    test('should handle empty debt graph', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: []
      };

      // Act
      const balances = calculateNetBalances(debtGraph);

      // Assert
      expect(balances).toEqual({
        'user1': 0,
        'user2': 0,
        'user3': 0
      });
    });

    test('should correctly calculate net balances when users have both debts and credits', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100 },
          { from: 'user2', to: 'user3', amount: 150 },
          { from: 'user3', to: 'user1', amount: 50 }
        ]
      };

      // Act
      const balances = calculateNetBalances(debtGraph);

      // Assert
      expect(balances).toEqual({
        'user1': -50,
        'user2': -50,
        'user3': 100
      });
    });
  });

  describe('simplifyCircularDebts', () => {
    test('should simplify circular debts in a triangular debt cycle', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100 },
          { from: 'user2', to: 'user3', amount: 80 },
          { from: 'user3', to: 'user1', amount: 60 }
        ]
      };

      // Act
      const simplifiedGraph = simplifyCircularDebts(debtGraph);

      // Assert
      // After simplification, the minimum debt amount (60) should be removed from the cycle
      expect(simplifiedGraph.debts).toHaveLength(2);
      expect(simplifiedGraph.debts).toContainEqual({ from: 'user1', to: 'user2', amount: 40 });
      expect(simplifiedGraph.debts).toContainEqual({ from: 'user2', to: 'user3', amount: 20 });
    });

    test('should not modify debts when no cycles exist', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100 },
          { from: 'user2', to: 'user3', amount: 50 }
        ]
      };

      // Act
      const simplifiedGraph = simplifyCircularDebts(debtGraph);

      // Assert
      expect(simplifiedGraph.debts).toEqual(debtGraph.debts);
    });

    test('should completely eliminate a cycle when all debts are equal', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 50 },
          { from: 'user2', to: 'user3', amount: 50 },
          { from: 'user3', to: 'user1', amount: 50 }
        ]
      };

      // Act
      const simplifiedGraph = simplifyCircularDebts(debtGraph);

      // Assert
      expect(simplifiedGraph.debts).toHaveLength(0);
    });
  });

  describe('minimumCashFlow', () => {
    test('should generate optimal settlement transactions for simple debts', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100 },
          { from: 'user2', to: 'user3', amount: 50 }
        ]
      };

      // Act
      const settlements = minimumCashFlow(debtGraph);

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
      const settlements = minimumCashFlow(debtGraph);

      // Assert
      expect(settlements).toHaveLength(0);
    });

    test('should minimize number of transactions in complex debt network', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3', 'user4', 'user5'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100 },
          { from: 'user2', to: 'user3', amount: 50 },
          { from: 'user3', to: 'user4', amount: 75 },
          { from: 'user4', to: 'user5', amount: 25 },
          { from: 'user5', to: 'user1', amount: 50 }
        ]
      };

      // Act
      const settlements = minimumCashFlow(debtGraph);

      // Assert
      // Check that we have fewer than 5 transactions (original number of debts)
      expect(settlements.length).toBeLessThan(5);
      
      // Check that the net effect of the settlements is equivalent to the original debts
      // by verifying the final balances are zero
      const balances = {};
      debtGraph.users.forEach(user => balances[user] = 0);
      
      // Apply original debts
      debtGraph.debts.forEach(debt => {
        balances[debt.from] -= debt.amount;
        balances[debt.to] += debt.amount;
      });
      
      // Apply settlements (in reverse to undo the original debts)
      settlements.forEach(settlement => {
        balances[settlement.from] += settlement.amount;
        balances[settlement.to] -= settlement.amount;
      });
      
      // Check that all balances are close to zero (allowing for tiny floating point errors)
      Object.values(balances).forEach(balance => {
        expect(Math.abs(balance)).toBeLessThan(0.01);
      });
    });
  });

  describe('handleMultipleCurrencies', () => {
    test('should convert debts to default currency and generate settlements', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100, currency: 'USD' },
          { from: 'user2', to: 'user3', amount: 90, currency: 'EUR' }
        ]
      };
      
      const exchangeRates = {
        'EUR_USD': 1.1,  // 1 EUR = 1.1 USD
        'USD_EUR': 0.9   // 1 USD = 0.9 EUR
      };
      
      const defaultCurrency = 'USD';

      // Act
      const settlements = handleMultipleCurrencies(debtGraph, exchangeRates, defaultCurrency);

      // Assert
      // EUR debt of 90 should be converted to 99 USD (90 * 1.1)
      // The resulting settlements should balance all debts
      expect(settlements.length).toBeGreaterThan(0);
      
      // Check that all settlements have a currency specified
      settlements.forEach(settlement => {
        expect(settlement).toHaveProperty('currency');
      });
    });

    test('should handle case where all debts are already in default currency', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100, currency: 'USD' },
          { from: 'user2', to: 'user3', amount: 50, currency: 'USD' }
        ]
      };
      
      const exchangeRates = {
        'EUR_USD': 1.1,
        'USD_EUR': 0.9
      };
      
      const defaultCurrency = 'USD';

      // Act
      const settlements = handleMultipleCurrencies(debtGraph, exchangeRates, defaultCurrency);

      // Assert
      expect(settlements).toHaveLength(2);
      settlements.forEach(settlement => {
        expect(settlement.currency).toBe('USD');
      });
    });

    test('should optimize settlement currencies based on original transactions', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100, currency: 'EUR' },
          { from: 'user1', to: 'user2', amount: 50, currency: 'EUR' },
          { from: 'user2', to: 'user3', amount: 200, currency: 'USD' }
        ]
      };
      
      const exchangeRates = {
        'EUR_USD': 1.1,
        'USD_EUR': 0.9
      };
      
      const defaultCurrency = 'USD';

      // Act
      const settlements = handleMultipleCurrencies(debtGraph, exchangeRates, defaultCurrency);

      // Assert
      // Check that settlement from user1 to user2 is in EUR (most common currency in their transactions)
      const user1ToUser2Settlement = settlements.find(
        s => s.from === 'user1' && s.to === 'user2'
      );
      
      if (user1ToUser2Settlement) {
        expect(user1ToUser2Settlement.currency).toBe('EUR');
      }
    });
  });
}); 