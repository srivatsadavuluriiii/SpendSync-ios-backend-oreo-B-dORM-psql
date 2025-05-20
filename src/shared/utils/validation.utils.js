const Joi = require('joi');

/**
 * Common validation schemas
 */
const schemas = {
  id: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  date: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  page: Joi.number().integer().min(1).default(1)
};

/**
 * Validate request data against a schema
 * @param {Object} data - Data to validate
 * @param {Object} schema - Joi schema
 * @returns {Object} Validation result
 */
const validate = (data, schema) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return { isValid: false, errors };
  }

  return { isValid: true, value };
};

/**
 * Create a validation middleware for a specific schema
 * @param {Object} schema - Joi schema
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
const createValidationMiddleware = (schema, source = 'body') => {
  return (req, res, next) => {
    const { isValid, errors, value } = validate(req[source], schema);
    
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    }

    // Replace request data with validated data
    req[source] = value;
    next();
  };
};

module.exports = {
  schemas,
  validate,
  createValidationMiddleware
}; 