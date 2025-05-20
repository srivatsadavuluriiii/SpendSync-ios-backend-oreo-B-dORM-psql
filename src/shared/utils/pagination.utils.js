/**
 * Pagination utilities
 * 
 * Provides utilities for standardizing pagination across the application.
 */

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express request query object
 * @param {Object} options - Default options
 * @returns {Object} Parsed pagination parameters
 */
const getPaginationParams = (query, options = {}) => {
  const {
    defaultLimit = 20,
    maxLimit = 100,
    defaultPage = 1
  } = options;

  let limit = parseInt(query.limit) || defaultLimit;
  let page = parseInt(query.page) || defaultPage;
  
  // Ensure page is at least 1
  page = Math.max(1, page);
  
  // Ensure limit is between 1 and maxLimit
  limit = Math.min(Math.max(1, limit), maxLimit);
  
  // Calculate offset
  const offset = (page - 1) * limit;
  
  return {
    limit,
    offset,
    page
  };
};

/**
 * Generate pagination metadata for response
 * @param {Object} params - Pagination parameters
 * @param {number} params.page - Current page
 * @param {number} params.limit - Items per page
 * @param {number} params.offset - Offset from start
 * @param {number} totalItems - Total number of items
 * @returns {Object} Pagination metadata
 */
const getPaginationMetadata = (params, totalItems) => {
  const { page, limit } = params;
  
  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    currentPage: page,
    limit,
    totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Apply pagination to a query (for MongoDB)
 * @param {Object} query - Mongoose query
 * @param {Object} params - Pagination parameters
 * @returns {Object} Modified query
 */
const paginateQuery = (query, params) => {
  const { limit, offset } = params;
  return query.limit(limit).skip(offset);
};

/**
 * Format paginated response
 * @param {Array} data - Array of items
 * @param {Object} metadata - Pagination metadata
 * @returns {Object} Formatted response
 */
const formatPaginatedResponse = (data, metadata) => {
  return {
    data,
    pagination: metadata
  };
};

module.exports = {
  getPaginationParams,
  getPaginationMetadata,
  paginateQuery,
  formatPaginatedResponse
}; 