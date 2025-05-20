/**
 * Response Utilities
 * 
 * Provides utilities for standardizing API responses across the application.
 */

/**
 * Create a success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} [message] - Success message
 * @param {number} [statusCode=200] - HTTP status code
 */
const sendSuccess = (res, data = null, message = null, statusCode = 200) => {
  const response = {
    success: true
  };
  
  if (message) {
    response.message = message;
  }
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Create a success response for created resource
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} [message] - Success message
 */
const sendCreated = (res, data = null, message = 'Resource created successfully') => {
  return sendSuccess(res, data, message, 201);
};

/**
 * Create a success response with no content
 * @param {Object} res - Express response object
 */
const sendNoContent = (res) => {
  return res.status(204).end();
};

/**
 * Format a paginated response
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 * @returns {Object} Formatted response
 */
const formatPaginatedData = (data, pagination) => {
  return {
    items: data,
    pagination
  };
};

module.exports = {
  sendSuccess,
  sendCreated,
  sendNoContent,
  formatPaginatedData
}; 