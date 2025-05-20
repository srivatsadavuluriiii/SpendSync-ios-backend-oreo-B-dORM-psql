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
export function minimumCashFlow(debtGraph: Object): any[];
/**
 * Calculate net balance for each user from debt graph
 * @param {Object} debtGraph - Object with users and debts arrays
 * @returns {Object} Map of user IDs to their net balances
 */
export function calculateNetBalances(debtGraph: Object): Object;
/**
 * Simplify circular debts in the graph
 * @param {Object} debtGraph - Graph representation of debts
 * @returns {Object} Simplified debt graph
 */
export function simplifyCircularDebts(debtGraph: Object): Object;
/**
 * Process a debt graph with multiple currencies
 * @param {Object} debtGraph - Graph representation of debts with currency information
 * @param {Object} exchangeRates - Map of currency pairs to exchange rates
 * @param {string} defaultCurrency - Default currency for calculations
 * @returns {Array} Array of settlement transactions
 */
export function handleMultipleCurrencies(debtGraph: Object, exchangeRates: Object, defaultCurrency: string): any[];
