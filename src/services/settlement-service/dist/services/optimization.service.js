/**
 * Optimization Service
 *
 * Provides debt optimization algorithms with caching
 */
const { metrics, timers } = require('../config/monitoring');
const cacheService = require('./cache.service');
const minCashFlowAlgorithm = require('../algorithms/min-cash-flow.algorithm');
const greedyAlgorithm = require('../algorithms/greedy.algorithm');
const friendPreferenceAlgorithm = require('../algorithms/friend-preference.algorithm');
/**
 * Calculate settlement suggestions using min cash flow algorithm
 * @param {Object} debtGraph - Graph representation of debts
 * @param {Object} exchangeRates - Exchange rates for currencies
 * @returns {Promise<Array>} - Array of settlement transactions
 */
async function calculateMinCashFlowSettlements(debtGraph, exchangeRates) {
    const graphHash = generateGraphHash(debtGraph);
    const cacheKey = cacheService.generateCacheKey('algorithm', 'minCashFlow', { graphHash });
    return cacheService.cacheResult(async () => {
        const timer = timers.createAlgorithmTimer('minCashFlow');
        const settlements = minCashFlowAlgorithm.calculate(debtGraph, exchangeRates);
        timer();
        return settlements;
    }, cacheKey, 3600 // 1 hour
    );
}
/**
 * Calculate settlement suggestions using greedy algorithm
 * @param {Object} debtGraph - Graph representation of debts
 * @param {Object} exchangeRates - Exchange rates for currencies
 * @returns {Promise<Array>} - Array of settlement transactions
 */
async function calculateGreedySettlements(debtGraph, exchangeRates) {
    const graphHash = generateGraphHash(debtGraph);
    const cacheKey = cacheService.generateCacheKey('algorithm', 'greedy', { graphHash });
    return cacheService.cacheResult(async () => {
        const timer = timers.createAlgorithmTimer('greedy');
        const settlements = greedyAlgorithm.calculate(debtGraph, exchangeRates);
        timer();
        return settlements;
    }, cacheKey, 3600 // 1 hour
    );
}
/**
 * Calculate settlement suggestions using friend preference algorithm
 * @param {Object} debtGraph - Graph representation of debts
 * @param {Object} exchangeRates - Exchange rates for currencies
 * @param {Object} friendships - Friendship strengths
 * @returns {Promise<Array>} - Array of settlement transactions
 */
async function calculateFriendPreferenceSettlements(debtGraph, exchangeRates, friendships) {
    const graphHash = generateGraphHash(debtGraph);
    const friendshipHash = generateFriendshipHash(friendships);
    const cacheKey = cacheService.generateCacheKey('algorithm', 'friendPreference', {
        graphHash,
        friendshipHash
    });
    return cacheService.cacheResult(async () => {
        const timer = timers.createAlgorithmTimer('friendPreference');
        const settlements = friendPreferenceAlgorithm.calculate(debtGraph, exchangeRates, friendships);
        timer();
        return settlements;
    }, cacheKey, 3600 // 1 hour
    );
}
/**
 * Generate a hash from a debt graph for cache keys
 * @param {Object} debtGraph - Graph representation of debts
 * @returns {string} - Hash string
 */
function generateGraphHash(debtGraph) {
    // Create a simplified representation for hashing
    const simplifiedGraph = {
        users: debtGraph.users,
        debts: debtGraph.debts.map(debt => ({
            from: debt.from,
            to: debt.to,
            amount: debt.amount,
            currency: debt.currency
        }))
    };
    // Create a hash by stringifying and summing character codes
    const stringified = JSON.stringify(simplifiedGraph);
    let hash = 0;
    for (let i = 0; i < stringified.length; i++) {
        const char = stringified.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}
/**
 * Generate a hash from friendship data for cache keys
 * @param {Object} friendships - Friendship strengths data
 * @returns {string} - Hash string
 */
function generateFriendshipHash(friendships) {
    if (!friendships || !friendships.friendships) {
        return 'no-friendships';
    }
    // Create a simplified representation for hashing
    const simplifiedFriendships = friendships.friendships.map(f => ({
        user1: f.user1,
        user2: f.user2,
        strength: f.strength
    }));
    // Create a hash by stringifying and summing character codes
    const stringified = JSON.stringify(simplifiedFriendships);
    let hash = 0;
    for (let i = 0; i < stringified.length; i++) {
        const char = stringified.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}
module.exports = {
    calculateMinCashFlowSettlements,
    calculateGreedySettlements,
    calculateFriendPreferenceSettlements
};
export {};
//# sourceMappingURL=optimization.service.js.map