/**
 * Validation middleware
 * 
 * Provides middleware for validating request data against schemas
 * using Joi validation library.
 */

const { ValidationError } = require('../errors/base.error');
const logger = require('../utils/logger');
const { sanitizeInput, validateDataTypes } = require('../utils/validation.utils');

/**
 * Enhanced validation middleware factory
 * @param {Object} schema Joi schema
 * @param {Object} options Validation options
 * @returns {Function} Express middleware
 */
const validate = (schema, options = {}) => {
  const defaultOptions = {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
    ...options
  };

  return async (req, res, next) => {
    try {
      // Determine validation targets
      const targets = {
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
        files: req.files
      };

      // Pre-validation sanitization
      Object.keys(targets).forEach(key => {
        if (targets[key]) {
          targets[key] = sanitizeInput(targets[key]);
        }
      });

      // Data type validation
      const typeErrors = validateDataTypes(targets);
      if (typeErrors.length > 0) {
        throw new ValidationError('Invalid data types', typeErrors);
      }

      // Validate against schema
      const validationPromises = Object.keys(schema).map(async key => {
        if (schema[key] && targets[key]) {
          try {
            const validated = await schema[key].validateAsync(
              targets[key],
              defaultOptions
            );
            return { key, value: validated };
          } catch (error) {
            // Transform Joi errors into a more user-friendly format
            const details = error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message,
              type: detail.type,
              context: detail.context
            }));
            throw new ValidationError(`Validation failed for ${key}`, details);
          }
        }
        return { key, value: targets[key] };
      });

      const results = await Promise.all(validationPromises);

      // Update request with validated data
      results.forEach(({ key, value }) => {
        if (value !== undefined) {
          req[key] = value;
        }
      });

      // Log validation success
      logger.debug('Validation successful', {
        path: req.path,
        method: req.method,
        validatedFields: Object.keys(schema)
      });

      next();
    } catch (error) {
      // Log validation failure
      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        error: error.details || error.message
      });

      next(error);
    }
  };
};

/**
 * Conditional validation middleware
 * @param {Function} condition Function that returns boolean
 * @param {Object} schema Joi schema
 * @returns {Function} Express middleware
 */
const validateIf = (condition, schema, options = {}) => {
  const validator = validate(schema, options);
  
  return async (req, res, next) => {
    if (await condition(req)) {
      return validator(req, res, next);
    }
    next();
  };
};

/**
 * Nested object validation middleware
 * @param {string} path Path to nested object
 * @param {Object} schema Joi schema
 * @returns {Function} Express middleware
 */
const validateNested = (path, schema, options = {}) => {
  const validator = validate(schema, options);
  
  return async (req, res, next) => {
    const nestedValue = path.split('.').reduce((obj, key) => obj?.[key], req);
    if (nestedValue) {
      const tempReq = { body: nestedValue };
      await validator(tempReq, res, (error) => {
        if (error) return next(error);
        // Update the nested value with validated data
        const pathParts = path.split('.');
        const lastKey = pathParts.pop();
        const parent = pathParts.reduce((obj, key) => obj[key], req);
        parent[lastKey] = tempReq.body;
        next();
      });
    } else {
      next();
    }
  };
};

/**
 * Array validation middleware
 * @param {Object} schema Joi schema for array items
 * @returns {Function} Express middleware
 */
const validateArray = (schema, options = {}) => {
  return validate({
    body: schema.array().items(schema)
  }, options);
};

module.exports = {
  validate,
  validateIf,
  validateNested,
  validateArray
}; 