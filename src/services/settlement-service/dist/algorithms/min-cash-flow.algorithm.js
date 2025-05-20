/**
 * Minimum Cash Flow Algorithm
 *
 * This algorithm implements an efficient solution to minimize the number of
 * transactions required to settle all debts within a group.
 *
 * It uses a greedy approach that settles the maximum creditor and maximum
 * debtor in each step, reducing the total number of transactions needed.
 *
 * @swagger
 * components:
 *   schemas:
 *     DebtGraph:
 *       type: object
 *       properties:
 *         users:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs in the debt graph
 *         debts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Debt'
 *           description: Array of debts between users
 *     Debt:
 *       type: object
 *       properties:
 *         from:
 *           type: string
 *           description: User ID of the debtor
 *         to:
 *           type: string
 *           description: User ID of the creditor
 *         amount:
 *           type: number
 *           description: Amount owed
 *         currency:
 *           type: string
 *           description: Currency of the debt
 */
/**
 * Find the minimum number of transactions needed to settle all debts
 * @param {Object} debtGraph - Graph representation of debts
 * @returns {Array} Array of settlement transactions
 *
 * @swagger
 * components:
 *   schemas:
 *     SettlementTransaction:
 *       type: object
 *       properties:
 *         from:
 *           type: string
 *           description: User ID of the payer
 *         to:
 *           type: string
 *           description: User ID of the receiver
 *         amount:
 *           type: number
 *           description: Amount to be paid
 *         currency:
 *           type: string
 *           description: Currency of the payment
 */
function minimumCashFlow(debtGraph) {
    // First, convert the debt graph to net balances
    const balances = calculateNetBalances(debtGraph);
    // Then find the minimum transactions to settle these balances
    return minCashFlowFromBalances(balances);
}
/**
 * Calculate net balance for each user from debt graph
 * @param {Object} debtGraph - Object with users and debts arrays
 * @returns {Object} Map of user IDs to their net balances
 */
function calculateNetBalances(debtGraph) {
    const balances = {};
    // Initialize all balances to zero
    for (const user of debtGraph.users) {
        balances[user] = 0;
    }
    // Calculate net balance for each user by summing all debts
    for (const debt of debtGraph.debts) {
        balances[debt.from] -= debt.amount; // Debtor has negative balance
        balances[debt.to] += debt.amount; // Creditor has positive balance
    }
    return balances;
}
/**
 * Generate minimum transactions from net balances
 * @param {Object} balances - Map of user IDs to their net balances
 * @returns {Array} Array of settlement transactions
 */
function minCashFlowFromBalances(balances) {
    // Convert balances object to arrays for easier processing
    const users = Object.keys(balances);
    const amounts = users.map(user => balances[user]);
    // Generate settlements recursively
    return minCashFlowRecursive(amounts, users, []);
}
/**
 * Recursive helper function to generate minimum transactions
 * @param {Array} amounts - Array of balance amounts
 * @param {Array} users - Array of user IDs corresponding to amounts
 * @param {Array} settlements - Array of settlement transactions (accumulator)
 * @returns {Array} Updated settlements array
 */
function minCashFlowRecursive(amounts, users, settlements) {
    // Find indices of maximum creditor and maximum debtor
    let maxCreditorIndex = findMaxIndex(amounts);
    let maxDebtorIndex = findMinIndex(amounts);
    // If all balances are settled (close to zero), return settlements
    // Using small epsilon value to handle floating point precision issues
    if (Math.abs(amounts[maxCreditorIndex]) < 0.01 &&
        Math.abs(amounts[maxDebtorIndex]) < 0.01) {
        return settlements;
    }
    // Calculate the transfer amount (minimum of max debt and max credit)
    const transferAmount = Math.min(amounts[maxCreditorIndex], Math.abs(amounts[maxDebtorIndex]));
    // Update balances after this transaction
    amounts[maxDebtorIndex] += transferAmount;
    amounts[maxCreditorIndex] -= transferAmount;
    // Record the settlement transaction
    settlements.push({
        from: users[maxDebtorIndex],
        to: users[maxCreditorIndex],
        amount: transferAmount
    });
    // Recursively find more settlements until all balances are settled
    return minCashFlowRecursive(amounts, users, settlements);
}
/**
 * Find index of maximum value in an array
 * @param {Array} arr - Array of numbers
 * @returns {number} Index of maximum value
 */
function findMaxIndex(arr) {
    let maxIndex = 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > arr[maxIndex]) {
            maxIndex = i;
        }
    }
    return maxIndex;
}
/**
 * Find index of minimum value in an array
 * @param {Array} arr - Array of numbers
 * @returns {number} Index of minimum value
 */
function findMinIndex(arr) {
    let minIndex = 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < arr[minIndex]) {
            minIndex = i;
        }
    }
    return minIndex;
}
/**
 * Simplify circular debts in the graph
 * @param {Object} debtGraph - Graph representation of debts
 * @returns {Object} Simplified debt graph
 */
function simplifyCircularDebts(debtGraph) {
    // Create a copy of the debt graph to avoid modifying the original
    const simplifiedGraph = {
        users: [...debtGraph.users],
        debts: [...debtGraph.debts]
    };
    // Find and simplify cycles in the graph
    const cycles = findCycles(simplifiedGraph);
    for (const cycle of cycles) {
        // Find the minimum debt amount in the cycle
        const minDebt = findMinimumDebtInCycle(cycle, simplifiedGraph);
        // Reduce each debt in the cycle by the minimum amount
        for (let i = 0; i < cycle.length; i++) {
            const fromUser = cycle[i];
            const toUser = cycle[(i + 1) % cycle.length];
            reduceDebt(simplifiedGraph, fromUser, toUser, minDebt);
        }
    }
    // Remove zero-value debts
    simplifiedGraph.debts = simplifiedGraph.debts.filter(debt => debt.amount > 0);
    return simplifiedGraph;
}
/**
 * Find cycles in the debt graph using DFS
 * @param {Object} graph - Graph representation of debts
 * @returns {Array} Array of cycles (each cycle is an array of user IDs)
 */
function findCycles(graph) {
    // Build adjacency list from debt graph
    const adjacencyList = {};
    for (const user of graph.users) {
        adjacencyList[user] = [];
    }
    for (const debt of graph.debts) {
        adjacencyList[debt.from].push(debt.to);
    }
    // Find cycles using DFS
    const cycles = [];
    const visited = {};
    const recursionStack = {};
    for (const user of graph.users) {
        if (!visited[user]) {
            dfsForCycles(user, adjacencyList, visited, recursionStack, [], cycles);
        }
    }
    return cycles;
}
/**
 * DFS helper function to find cycles
 * @param {string} current - Current user ID
 * @param {Object} adjacencyList - Adjacency list representation of graph
 * @param {Object} visited - Map of visited nodes
 * @param {Object} recursionStack - Map of nodes in current recursion stack
 * @param {Array} path - Current path being explored
 * @param {Array} cycles - Array to collect found cycles
 */
function dfsForCycles(current, adjacencyList, visited, recursionStack, path, cycles) {
    visited[current] = true;
    recursionStack[current] = true;
    path.push(current);
    // Explore neighbors
    for (const neighbor of adjacencyList[current]) {
        if (!visited[neighbor]) {
            dfsForCycles(neighbor, adjacencyList, visited, recursionStack, [...path], cycles);
        }
        else if (recursionStack[neighbor]) {
            // Found a cycle
            const cycleStart = path.indexOf(neighbor);
            if (cycleStart !== -1) {
                cycles.push(path.slice(cycleStart));
            }
        }
    }
    // Remove from recursion stack
    recursionStack[current] = false;
}
/**
 * Find minimum debt amount in a cycle
 * @param {Array} cycle - Array of user IDs forming a cycle
 * @param {Object} graph - Graph representation of debts
 * @returns {number} Minimum debt amount in the cycle
 */
function findMinimumDebtInCycle(cycle, graph) {
    let minDebt = Infinity;
    for (let i = 0; i < cycle.length; i++) {
        const fromUser = cycle[i];
        const toUser = cycle[(i + 1) % cycle.length];
        // Find the debt from fromUser to toUser
        for (const debt of graph.debts) {
            if (debt.from === fromUser && debt.to === toUser) {
                minDebt = Math.min(minDebt, debt.amount);
                break;
            }
        }
    }
    return minDebt;
}
/**
 * Reduce debt amount between two users
 * @param {Object} graph - Graph representation of debts
 * @param {string} fromUser - Debtor user ID
 * @param {string} toUser - Creditor user ID
 * @param {number} amount - Amount to reduce
 */
function reduceDebt(graph, fromUser, toUser, amount) {
    for (const debt of graph.debts) {
        if (debt.from === fromUser && debt.to === toUser) {
            debt.amount -= amount;
            break;
        }
    }
}
/**
 * Process a debt graph with multiple currencies
 * @param {Object} debtGraph - Graph representation of debts with currency information
 * @param {Object} exchangeRates - Map of currency pairs to exchange rates
 * @param {string} defaultCurrency - Default currency for calculations
 * @returns {Array} Array of settlement transactions
 */
function handleMultipleCurrencies(debtGraph, exchangeRates, defaultCurrency) {
    // Create a copy of the debt graph
    const normalizedGraph = {
        users: [...debtGraph.users],
        debts: [],
        defaultCurrency
    };
    // Convert all debts to the default currency
    for (const debt of debtGraph.debts) {
        const normalizedDebt = { ...debt };
        if (debt.currency !== defaultCurrency) {
            normalizedDebt.amount = convertCurrency(debt.amount, debt.currency, defaultCurrency, exchangeRates);
            normalizedDebt.currency = defaultCurrency;
        }
        normalizedGraph.debts.push(normalizedDebt);
    }
    // Process the normalized graph
    const simplifiedGraph = simplifyCircularDebts(normalizedGraph);
    const settlements = minimumCashFlow(simplifiedGraph);
    // Optimize settlement currencies if needed
    return optimizeSettlementCurrencies(settlements, debtGraph, exchangeRates, defaultCurrency);
}
/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @param {Object} exchangeRates - Map of currency pairs to exchange rates
 * @returns {number} Converted amount
 */
function convertCurrency(amount, fromCurrency, toCurrency, exchangeRates) {
    if (fromCurrency === toCurrency) {
        return amount;
    }
    const key = `${fromCurrency}_${toCurrency}`;
    const reverseKey = `${toCurrency}_${fromCurrency}`;
    if (exchangeRates[key]) {
        return amount * exchangeRates[key];
    }
    else if (exchangeRates[reverseKey]) {
        return amount / exchangeRates[reverseKey];
    }
    else {
        // If direct conversion is not available, try to convert via default currency
        throw new Error(`No exchange rate available for ${fromCurrency} to ${toCurrency}`);
    }
}
/**
 * Optimize settlement currencies based on original debt currencies
 * @param {Array} settlements - Array of settlement transactions in default currency
 * @param {Object} originalGraph - Original debt graph with currency information
 * @param {Object} exchangeRates - Map of currency pairs to exchange rates
 * @param {string} defaultCurrency - Default currency used for calculations
 * @returns {Array} Optimized settlements
 */
function optimizeSettlementCurrencies(settlements, originalGraph, exchangeRates, defaultCurrency) {
    // For each settlement, determine the optimal currency
    return settlements.map(settlement => {
        const { from, to, amount } = settlement;
        // Find original debts between these users
        const relevantDebts = originalGraph.debts.filter(debt => (debt.from === from && debt.to === to) ||
            (debt.from === to && debt.to === from));
        // Find most common currency in original debts
        if (relevantDebts.length > 0) {
            const currencyCounts = {};
            for (const debt of relevantDebts) {
                currencyCounts[debt.currency] = (currencyCounts[debt.currency] || 0) + 1;
            }
            // Find currency with highest count
            let maxCount = 0;
            let optimalCurrency = defaultCurrency;
            for (const [currency, count] of Object.entries(currencyCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    optimalCurrency = currency;
                }
            }
            // Convert amount to optimal currency
            if (optimalCurrency !== defaultCurrency) {
                const convertedAmount = convertCurrency(amount, defaultCurrency, optimalCurrency, exchangeRates);
                return {
                    ...settlement,
                    amount: convertedAmount,
                    currency: optimalCurrency
                };
            }
        }
        // Default to using the default currency
        return {
            ...settlement,
            currency: defaultCurrency
        };
    });
}
// Export public API
module.exports = {
    minimumCashFlow,
    calculateNetBalances,
    simplifyCircularDebts,
    handleMultipleCurrencies
};
export {};
//# sourceMappingURL=min-cash-flow.algorithm.js.map