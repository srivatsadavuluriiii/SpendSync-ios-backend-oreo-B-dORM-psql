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
export declare class FriendPreferenceAlgorithm implements SettlementAlgorithm {
    name: string;
    description: string;
    calculate(debts: DebtInfo[], friendRelations?: FriendRelation[]): Settlement[];
}
