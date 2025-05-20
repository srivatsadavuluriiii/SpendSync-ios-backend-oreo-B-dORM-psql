/**
 * Greedy Debt Settlement Algorithm
 *
 * A greedy approach to debt settlement that minimizes the number of transactions
 * by always settling the largest debts first.
 */
import { DebtInfo, Settlement, SettlementAlgorithm } from '../types/index.js';
/**
 * Greedy algorithm for optimizing debt settlement
 * @param balances - Map of user IDs to their balances with other users
 * @returns Array of optimized debt settlements
 */
export declare class GreedySettlementAlgorithm implements SettlementAlgorithm {
    name: string;
    description: string;
    calculate(debts: DebtInfo[]): Settlement[];
}
