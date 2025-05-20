/**
 * Export user settlements data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function exportUserSettlements(req: Object, res: Object, next: Function): Promise<void>;
/**
 * Export group settlements data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export function exportGroupSettlements(req: Object, res: Object, next: Function): Promise<void>;
