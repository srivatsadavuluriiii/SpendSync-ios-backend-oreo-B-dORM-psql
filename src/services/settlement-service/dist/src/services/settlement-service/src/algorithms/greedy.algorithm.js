/**
 * Greedy Debt Settlement Algorithm
 *
 * A greedy approach to debt settlement that minimizes the number of transactions
 * by always settling the largest debts first.
 */
/**
 * Greedy algorithm for optimizing debt settlement
 * @param balances - Map of user IDs to their balances with other users
 * @returns Array of optimized debt settlements
 */
export class GreedySettlementAlgorithm {
    constructor() {
        this.name = 'greedy';
        this.description = 'A greedy algorithm that optimizes debt settlements by minimizing the number of transactions';
    }
    calculate(debts) {
        // Convert debts to internal format
        const balances = new Map();
        for (const debt of debts) {
            const balance = balances.get(debt.userId) || 0;
            balances.set(debt.userId, balance + debt.amount);
        }
        // Separate positive and negative balances
        const positiveBalances = [];
        const negativeBalances = [];
        balances.forEach((amount, userId) => {
            if (amount > 0) {
                positiveBalances.push({ userId, amount });
            }
            else if (amount < 0) {
                negativeBalances.push({ userId, amount: Math.abs(amount) });
            }
        });
        // Sort balances by amount (descending)
        positiveBalances.sort((a, b) => b.amount - a.amount);
        negativeBalances.sort((a, b) => b.amount - a.amount);
        const settlements = [];
        let i = 0, j = 0;
        // Create settlements by matching positive and negative balances
        while (i < positiveBalances.length && j < negativeBalances.length) {
            const creditor = positiveBalances[i];
            const debtor = negativeBalances[j];
            const amount = Math.min(creditor.amount, debtor.amount);
            settlements.push({
                payerId: debtor.userId,
                receiverId: creditor.userId,
                amount,
                currency: debts[0].currency // Assuming all debts are in the same currency
            });
            creditor.amount -= amount;
            debtor.amount -= amount;
            if (creditor.amount === 0)
                i++;
            if (debtor.amount === 0)
                j++;
        }
        return settlements;
    }
}
