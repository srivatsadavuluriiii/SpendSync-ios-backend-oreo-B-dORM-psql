/**
 * Error Handling Middleware
 * 
 * Centralized error handling for the application
 */

const config = require('../../api-gateway/config');
const { logger } = require('../utils/logger');

// Error types
const ERROR_TYPES = {
  VALIDATION: 'ValidationError',
  UNAUTHORIZED: 'UnauthorizedError',
  FORBIDDEN: 'ForbiddenError',
  NOT_FOUND: 'NotFoundError',
  CONFLICT: 'ConflictError',
  SERVICE_UNAVAILABLE: 'ServiceUnavailableError',
  INTERNAL: 'InternalServerError'
};

// HTTP status codes mapping
const STATUS_CODES = {
  [ERROR_TYPES.VALIDATION]: 400,
  [ERROR_TYPES.UNAUTHORIZED]: 401,
  [ERROR_TYPES.FORBIDDEN]: 403,
  [ERROR_TYPES.NOT_FOUND]: 404,
  [ERROR_TYPES.CONFLICT]: 409,
  [ERROR_TYPES.SERVICE_UNAVAILABLE]: 503,
  [ERROR_TYPES.INTERNAL]: 500
};

/**
 * Format error response
 * @param {Error} error - Error object
 * @param {string} requestId - Request ID
 * @returns {Object} Formatted error response
 */
function formatErrorResponse(error, requestId) {
  const statusCode = STATUS_CODES[error.name] || 500;
  const isInternalError = statusCode >= 500;

  // Base error response
  const response = {
    success: false,
    error: {
      message: isInternalError ? 'Internal server error' : error.message,
      code: error.code || error.name,
      status: statusCode,
      requestId
    }
  };

  // Add validation errors if present
  if (error.name === ERROR_TYPES.VALIDATION && error.errors) {
    response.error.details = error.errors;
  }

  // Add stack trace in development
  if (config.env === 'development' && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Log error
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 */
function logError(error, req) {
  const requestId = req.headers['x-request-id'];
  const statusCode = STATUS_CODES[error.name] || 500;
  const isInternalError = statusCode >= 500;

  const logData = {
    requestId,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      status: statusCode
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params
    }
  };

  // Add stack trace for internal errors
  if (isInternalError && error.stack) {
    logData.error.stack = error.stack;
  }

  // Log with appropriate level
  if (isInternalError) {
    logger.error('Internal server error', logData);
  } else {
    logger.warn('Client error', logData);
  }
}

/**
 * Error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(error, req, res, next) {
  // Log error
  logError(error, req);

  // Format error response
  const response = formatErrorResponse(error, req.headers['x-request-id']);

  // Send response
  res.status(response.error.status).json(response);
}

/**
 * Not found middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.name = ERROR_TYPES.NOT_FOUND;
  next(error);
}

/**
 * Async handler wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  ERROR_TYPES,
  STATUS_CODES
}; 