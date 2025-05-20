/**
 * Get user preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export function getUserPreferences(req: Object, res: Object, next: Function): Promise<void>;
/**
 * Update user preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export function updateUserPreferences(req: Object, res: Object, next: Function): Promise<void>;
/**
 * Update specific section of user preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export function updatePreferenceSection(req: Object, res: Object, next: Function): Promise<void>;
/**
 * Reset user preferences to defaults
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export function resetUserPreferences(req: Object, res: Object, next: Function): Promise<void>;
/**
 * Get notification settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export function getNotificationSettings(req: Object, res: Object, next: Function): Promise<void>;
/**
 * Set default currency
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export function setDefaultCurrency(req: Object, res: Object, next: Function): Promise<void>;
/**
 * Set settlement algorithm preference
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export function setSettlementAlgorithm(req: Object, res: Object, next: Function): Promise<void>;
