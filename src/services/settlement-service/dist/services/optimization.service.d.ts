/**
 * Calculate settlement suggestions using min cash flow algorithm
 * @param {Object} debtGraph - Graph representation of debts
 * @param {Object} exchangeRates - Exchange rates for currencies
 * @returns {Promise<Array>} - Array of settlement transactions
 */
export function calculateMinCashFlowSettlements(debtGraph: Object, exchangeRates: Object): Promise<any[]>;
/**
 * Calculate settlement suggestions using greedy algorithm
 * @param {Object} debtGraph - Graph representation of debts
 * @param {Object} exchangeRates - Exchange rates for currencies
 * @returns {Promise<Array>} - Array of settlement transactions
 */
export function calculateGreedySettlements(debtGraph: Object, exchangeRates: Object): Promise<any[]>;
/**
 * Calculate settlement suggestions using friend preference algorithm
 * @param {Object} debtGraph - Graph representation of debts
 * @param {Object} exchangeRates - Exchange rates for currencies
 * @param {Object} friendships - Friendship strengths
 * @returns {Promise<Array>} - Array of settlement transactions
 */
export function calculateFriendPreferenceSettlements(debtGraph: Object, exchangeRates: Object, friendships: Object): Promise<any[]>;
