/**
 * Unit tests for Friend Preference Algorithm
 */

import { FriendPreferenceAlgorithm } from '../../src/algorithms/friend-preference.algorithm.js';
import { DebtInfo, FriendRelation, Settlement } from '../../src/types/index.js';

describe('FriendPreferenceAlgorithm', () => {
  const algorithm = new FriendPreferenceAlgorithm();

  it('should handle simple debt between two users without friend relations', () => {
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

  it('should prefer settlements between friends', () => {
    const debts: DebtInfo[] = [
      { userId: 'user1', amount: 150, currency: 'USD' },
      { userId: 'user2', amount: -50, currency: 'USD' },
      { userId: 'user3', amount: -100, currency: 'USD' }
    ];

    const friendRelations: FriendRelation[] = [
      { userId1: 'user1', userId2: 'user3', strength: 8 },
      { userId1: 'user1', userId2: 'user2', strength: 3 }
    ];

    const result = algorithm.calculate(debts, friendRelations);

    expect(result).toHaveLength(2);
    // Should settle with user3 first (stronger friendship)
    expect(result[0]).toEqual({
      payerId: 'user3',
      receiverId: 'user1',
      amount: 100,
      currency: 'USD'
    });
    // Then settle with user2
    expect(result[1]).toEqual({
      payerId: 'user2',
      receiverId: 'user1',
      amount: 50,
      currency: 'USD'
    });
  });

  it('should handle complex debt network with friend relations', () => {
    const debts: DebtInfo[] = [
      { userId: 'user1', amount: 200, currency: 'USD' },
      { userId: 'user2', amount: -50, currency: 'USD' },
      { userId: 'user3', amount: -100, currency: 'USD' },
      { userId: 'user4', amount: 100, currency: 'USD' },
      { userId: 'user5', amount: -150, currency: 'USD' }
    ];

    const friendRelations: FriendRelation[] = [
      { userId1: 'user1', userId2: 'user5', strength: 9 },
      { userId1: 'user4', userId2: 'user2', strength: 7 },
      { userId1: 'user1', userId2: 'user3', strength: 4 }
    ];

    const result = algorithm.calculate(debts, friendRelations);

    expect(result).toHaveLength(4);
    
    // Verify total amounts match
    const totalPaid = result.reduce((sum, settlement: Settlement) => sum + settlement.amount, 0);
    expect(totalPaid).toBe(300);

    // Verify all settlements have valid amounts
    result.forEach((settlement: Settlement) => {
      expect(settlement.amount).toBeGreaterThan(0);
      expect(settlement.currency).toBe('USD');
    });

    // Verify friend preferences were considered
    // user5 should settle with user1 first (highest friendship strength)
    expect(result[0]).toEqual({
      payerId: 'user5',
      receiverId: 'user1',
      amount: 150,
      currency: 'USD'
    });
  });

  it('should handle zero balances', () => {
    const debts: DebtInfo[] = [
      { userId: 'user1', amount: 0, currency: 'USD' },
      { userId: 'user2', amount: 0, currency: 'USD' }
    ];

    const friendRelations: FriendRelation[] = [
      { userId1: 'user1', userId2: 'user2', strength: 5 }
    ];

    const result = algorithm.calculate(debts, friendRelations);

    expect(result).toHaveLength(0);
  });
}); 