/**
 * Unit tests for Greedy Algorithm
 */

import { GreedySettlementAlgorithm } from '../../src/algorithms/greedy.algorithm.js';
import { DebtInfo, Settlement } from '../../src/types/index.js';

describe('GreedySettlementAlgorithm', () => {
  const algorithm = new GreedySettlementAlgorithm();

  it('should handle simple debt between two users', () => {
    const debts: DebtInfo[] = [
      { userId: 'user1', amount: 100, currency: 'USD' },
      { userId: 'user2', amount: -100, currency: 'USD' }
    ];

    const result = algorithm.calculate(debts);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      payerId: 'user2',
      receiverId: 'user1',
      amount: 100,
      currency: 'USD'
    });
  });

  it('should handle multiple debts between users', () => {
    const debts: DebtInfo[] = [
      { userId: 'user1', amount: 150, currency: 'USD' },
      { userId: 'user2', amount: -50, currency: 'USD' },
      { userId: 'user3', amount: -100, currency: 'USD' }
    ];

    const result = algorithm.calculate(debts);

    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        payerId: 'user3',
        receiverId: 'user1',
        amount: 100,
        currency: 'USD'
      }),
      expect.objectContaining({
        payerId: 'user2',
        receiverId: 'user1',
        amount: 50,
        currency: 'USD'
      })
    ]));
  });

  it('should handle complex debt network', () => {
    const debts: DebtInfo[] = [
      { userId: 'user1', amount: 200, currency: 'USD' },
      { userId: 'user2', amount: -50, currency: 'USD' },
      { userId: 'user3', amount: -100, currency: 'USD' },
      { userId: 'user4', amount: 100, currency: 'USD' },
      { userId: 'user5', amount: -150, currency: 'USD' }
    ];

    const result = algorithm.calculate(debts);

    expect(result).toHaveLength(4);
    // Verify total amounts match
    const totalPaid = result.reduce((sum, settlement: Settlement) => sum + settlement.amount, 0);
    expect(totalPaid).toBe(300);

    // Verify all settlements have valid amounts
    result.forEach((settlement: Settlement) => {
      expect(settlement.amount).toBeGreaterThan(0);
      expect(settlement.currency).toBe('USD');
    });
  });

  it('should handle zero balances', () => {
    const debts: DebtInfo[] = [
      { userId: 'user1', amount: 0, currency: 'USD' },
      { userId: 'user2', amount: 0, currency: 'USD' }
    ];

    const result = algorithm.calculate(debts);

    expect(result).toHaveLength(0);
  });
});