/**
 * Middleware to validate request using express-validator
 * @param {Array} validations - Array of express-validator validation chains
 * @returns {Function} Express middleware function
 */
export function validate(validations: any[]): Function;
/**
 * Middleware to sanitize request body, query parameters, and URL params
 * to protect against XSS attacks
 */
export const sanitizeInputs: any;
/**
 * Middleware to validate MongoDB IDs in request parameters
 * @param {string|Array} paramNames - Parameter name(s) to validate
 * @returns {Function} Express middleware function
 */
export function validateObjectIds(paramNames: string | any[]): Function;
