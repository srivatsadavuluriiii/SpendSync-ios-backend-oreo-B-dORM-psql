/**
 * Enhanced Input Validation Middleware
 *
 * Provides more comprehensive validation on top of the basic validation middleware
 * to protect against injection attacks and other security issues.
 */
const { validationResult, matchedData } = require('express-validator');
const { ValidationError } = require('../../../../../shared/errors');
const { sanitize } = require('express-xss-sanitizer');
/**
 * Middleware to validate request using express-validator
 * @param {Array} validations - Array of express-validator validation chains
 * @returns {Function} Express middleware function
 */
const validate = (validations) => {
    return async (req, res, next) => {
        try {
            // Execute all validations
            await Promise.all(validations.map(validation => validation.run(req)));
            // Check for validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                // Format errors into an object
                const formattedErrors = errors.array().reduce((acc, error) => {
                    // Create nested structure for more complex fields like 'user.name'
                    const path = error.path;
                    acc[path] = error.msg;
                    return acc;
                }, {});
                // Throw a validation error
                throw new ValidationError('Validation failed', formattedErrors);
            }
            // If validation passes, replace req.body with validated & sanitized data
            // This ensures only validated fields are used
            const validatedData = matchedData(req, { locations: ['body'] });
            if (Object.keys(validatedData).length > 0) {
                req.body = validatedData;
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
/**
 * Middleware to sanitize request body, query parameters, and URL params
 * to protect against XSS attacks
 */
const sanitizeInputs = sanitize({
    // Define locations to sanitize (body, query, params)
    sanitizeBody: true,
    sanitizeParams: true,
    sanitizeQuery: true,
    // Customize sanitization options
    xss: {
        // Using strict XSS filtering to block any HTML
        whiteList: {}, // Empty object means no tags are allowed
        // Additional options to block all attributes
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
    }
});
/**
 * Validate and sanitize MongoDB IDs
 * @param {string} id - ID to validate
 * @returns {boolean} - Whether ID is valid
 */
const isValidObjectId = (id) => {
    // MongoDB ObjectId is a 24 hex character string
    return /^[0-9a-fA-F]{24}$/.test(id);
};
/**
 * Middleware to validate MongoDB IDs in request parameters
 * @param {string|Array} paramNames - Parameter name(s) to validate
 * @returns {Function} Express middleware function
 */
const validateObjectIds = (paramNames) => {
    return (req, res, next) => {
        const paramsToValidate = Array.isArray(paramNames) ? paramNames : [paramNames];
        for (const param of paramsToValidate) {
            const id = req.params[param];
            if (id && !isValidObjectId(id)) {
                return next(new ValidationError(`Invalid ID format for parameter: ${param}`, {
                    [param]: 'Must be a valid MongoDB ObjectId'
                }));
            }
        }
        next();
    };
};
module.exports = {
    validate,
    sanitizeInputs,
    validateObjectIds
};
export {};
//# sourceMappingURL=input-validation.middleware.js.map