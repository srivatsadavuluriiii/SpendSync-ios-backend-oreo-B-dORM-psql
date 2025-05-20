/**
 * Friend Preference Debt Settlement Algorithm
 * 
 * An algorithm that optimizes debt settlement by preferring settlements 
 * between friends when possible.
 */

import { DebtInfo, FriendRelation, Settlement, SettlementAlgorithm } from '../types/index.js';

/**
 * Friend preference algorithm for debt settlement optimization
 */
export class FriendPreferenceAlgorithm implements SettlementAlgorithm {
  name = 'friend-preference';
  description = 'Optimizes settlements by preferring transactions between friends';

  calculate(debts: DebtInfo[], friendRelations: FriendRelation[] = []): Settlement[] {
    // Build a friendship graph
    const friendshipGraph: Record<string, Record<string, number>> = {};
    
    // Initialize friendship graph
    for (const relation of friendRelations) {
      if (!friendshipGraph[relation.userId1]) {
        friendshipGraph[relation.userId1] = {};
      }
      if (!friendshipGraph[relation.userId2]) {
        friendshipGraph[relation.userId2] = {};
      }
      
      friendshipGraph[relation.userId1][relation.userId2] = relation.strength;
      friendshipGraph[relation.userId2][relation.userId1] = relation.strength;
    }
    
    // Convert debts to internal format
    const balances = new Map<string, number>();
    for (const debt of debts) {
      const balance = balances.get(debt.userId) || 0;
      balances.set(debt.userId, balance + debt.amount);
    }
    
    // Create lists of creditors and debtors
    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];
    
    balances.forEach((amount, userId) => {
      if (amount > 0) {
        creditors.push({ userId, amount });
      } else if (amount < 0) {
        debtors.push({ userId, amount: Math.abs(amount) });
      }
    });
    
    // First process friend pairs (higher friendship strength first)
    const friendPairs: { debtor: string; creditor: string; strength: number }[] = [];
    
    for (const debtor of debtors) {
      for (const creditor of creditors) {
        const strength = (friendshipGraph[debtor.userId]?.[creditor.userId] || 0);
        if (strength > 0) {
          friendPairs.push({
            debtor: debtor.userId,
            creditor: creditor.userId,
            strength
          });
        }
      }
    }
    
    // Sort by friendship strength (highest first)
    friendPairs.sort((a, b) => b.strength - a.strength);
    
    const settlements: Settlement[] = [];
    const currency = debts[0].currency; // Assuming all debts are in the same currency
    
    // Process friend pairs first
    for (const pair of friendPairs) {
      const debtor = debtors.find(d => d.userId === pair.debtor);
      const creditor = creditors.find(c => c.userId === pair.creditor);
      
      if (debtor && creditor && debtor.amount > 0 && creditor.amount > 0) {
        const amount = Math.min(debtor.amount, creditor.amount);
        
        if (amount > 0) {
          settlements.push({
            payerId: debtor.userId,
            receiverId: creditor.userId,
            amount,
            currency
          });
          
          debtor.amount -= amount;
          creditor.amount -= amount;
        }
      }
    }
    
    // Remove settled balances
    const remainingDebtors = debtors.filter(d => d.amount > 0);
    const remainingCreditors = creditors.filter(c => c.amount > 0);
    
    // Sort remaining by amount (largest first)
    remainingDebtors.sort((a, b) => b.amount - a.amount);
    remainingCreditors.sort((a, b) => b.amount - a.amount);
    
    // Process remaining balances with greedy approach
    let debtorIndex = 0;
    let creditorIndex = 0;
    
    while (
      debtorIndex < remainingDebtors.length && 
      creditorIndex < remainingCreditors.length
    ) {
      const debtor = remainingDebtors[debtorIndex];
      const creditor = remainingCreditors[creditorIndex];
      
      const amount = Math.min(debtor.amount, creditor.amount);
      
      if (amount > 0) {
        settlements.push({
          payerId: debtor.userId,
          receiverId: creditor.userId,
          amount,
          currency
        });
      }
      
      debtor.amount -= amount;
      creditor.amount -= amount;
      
      if (debtor.amount <= 0) {
        debtorIndex++;
      }
      
      if (creditor.amount <= 0) {
        creditorIndex++;
      }
    }
    
    return settlements;
  }
} 