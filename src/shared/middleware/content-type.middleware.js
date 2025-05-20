 /**
 * Content Type validation middleware
 * 
 * Validates and enforces content types for requests to prevent
 * content type-based attacks and ensure proper request handling.
 */

const { BadRequestError } = require('../errors');

/**
 * Create content type validation middleware
 * @param {Object} options - Content type options
 * @param {string[]} options.allowedTypes - Allowed content types
 * @param {boolean} options.requireContentType - Whether to require content-type header
 * @returns {Function} Express middleware function
 */
const validateContentType = (options = {}) => {
  const {
    allowedTypes = ['application/json'],
    requireContentType = true
  } = options;

  return (req, res, next) => {
    // Skip content type validation for GET and HEAD requests
    if (['GET', 'HEAD'].includes(req.method)) {
      return next();
    }

    const contentType = req.get('content-type');

    // Check if content type is required
    if (requireContentType && !contentType) {
      return next(new BadRequestError('Content-Type header is required'));
    }

    // If content type is present, validate it
    if (contentType) {
      // Extract base content type without parameters
      const baseContentType = contentType.split(';')[0].toLowerCase();
      
      if (!allowedTypes.includes(baseContentType)) {
        return next(
          new BadRequestError(
            `Unsupported content type. Allowed types: ${allowedTypes.join(', ')}`
          )
        );
      }
    }

    next();
  };
};

/**
 * JSON content type validator
 * Enforces application/json content type
 */
const requireJson = () => {
  return validateContentType({
    allowedTypes: ['application/json'],
    requireContentType: true
  });
};

/**
 * Multipart form data validator
 * For file uploads and form submissions
 */
const requireMultipart = () => {
  return validateContentType({
    allowedTypes: ['multipart/form-data'],
    requireContentType: true
  });
};

/**
 * Form URL encoded validator
 * For traditional form submissions
 */
const requireFormEncoded = () => {
  return validateContentType({
    allowedTypes: ['application/x-www-form-urlencoded'],
    requireContentType: true
  });
};

module.exports = {
  validateContentType,
  requireJson,
  requireMultipart,
  requireFormEncoded
};