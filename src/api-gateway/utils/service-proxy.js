/**
 * Service Proxy Utility
 * 
 * Provides functions for making HTTP requests to microservices
 */

const axios = require('axios');
const config = require('../config');
const { ServiceUnavailableError } = require('../../shared/errors');
const serviceRegistry = require('../../shared/services/service-registry');
const { logger } = require('../../shared/utils/logger');

// Create axios instance with default configuration
const axiosInstance = axios.create({
  timeout: config.timeout || 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get the base URL for a service with circuit breaking
 * @param {string} serviceName - Service name
 * @returns {string} Service base URL
 * @throws {ServiceUnavailableError} If service is unavailable
 */
function getServiceUrl(serviceName) {
  // Try to get URL from service registry (with circuit breaking)
  const url = serviceRegistry.getServiceUrl(serviceName);
  
  if (!url) {
    logger.warn(`Service ${serviceName} is unavailable due to circuit breaker`);
    throw new ServiceUnavailableError(`Service ${serviceName} is unavailable`);
  }
  
  return url;
}

/**
 * Forward a request to a microservice with retry mechanism
 * @param {string} serviceName Name of the service
 * @param {string} method HTTP method
 * @param {string} path Request path
 * @param {Object} data Request data
 * @param {Object} headers Request headers
 * @param {string} baseUrlOverride Override base URL (for testing)
 * @returns {Promise<Object>} Service response
 */
async function makeServiceRequest(serviceName, method, path, data = null, headers = {}, baseUrlOverride = null) {
  let lastError;
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Get service URL (with circuit breaking)
      const baseUrl = baseUrlOverride || getServiceUrl(serviceName);
      
      const response = await axios({
        method,
        url: `${baseUrl}${path}`,
        data,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-Request-ID': headers['x-request-id'] || Date.now().toString()
        }
      });

      // Record successful request in service registry
      if (serviceRegistry.isServiceAvailable(serviceName)) {
        // We have a reference to the service in the registry, this was a successful call
        const serviceStatus = serviceRegistry.getServiceStatus(serviceName);
        if (serviceStatus.circuit?.state === 'HALF_OPEN') {
          // Update service registry with successful request in half-open state
          serviceRegistry._handleSuccessfulHealthCheck(serviceName);
        }
      }

      // Format response
      return {
        success: true,
        data: {
          service: serviceName,
          ...response.data
        }
      };
    } catch (error) {
      lastError = error;
      
      // If circuit is open for this service, don't retry
      if (!serviceRegistry.isServiceAvailable(serviceName)) {
        break;
      }
      
      // Check if we should retry
      const shouldRetry = error.response && 
        RETRY_CONFIG.retryableStatusCodes.includes(error.response.status) &&
        attempt < RETRY_CONFIG.maxRetries;
      
      if (shouldRetry) {
        logger.warn(`Retry attempt ${attempt} for ${serviceName} after error:`, error.message);
        await sleep(RETRY_CONFIG.retryDelay * attempt); // Exponential backoff
        continue;
      }
      
      // Record failed request in service registry
      if (serviceRegistry.isServiceAvailable(serviceName)) {
        serviceRegistry._handleFailedHealthCheck(serviceName, error.message);
      }
      
      // Don't retry for non-retryable errors
      break;
    }
  }

  // Handle final error
  if (lastError.response) {
    throw {
      status: lastError.response.status,
      data: {
        success: false,
        error: {
          service: serviceName,
          message: lastError.response.data?.message || 'Service error',
          code: lastError.response.data?.code || 'SERVICE_ERROR',
          ...lastError.response.data
        }
      }
    };
  }
  
  throw new ServiceUnavailableError(`Service ${serviceName} unavailable after ${RETRY_CONFIG.maxRetries} attempts`);
}

/**
 * Extract the resource path from the original request URL
 * @param {string} originalUrl - Original request URL
 * @param {string} resourceType - Resource type (users, expenses, etc.)
 * @returns {string} Extracted resource path
 */
function extractResourcePath(originalUrl, resourceType) {
  const regex = new RegExp(`/api/v1/${resourceType}(.*)`);
  const match = originalUrl.match(regex);
  return match ? (match[1] || '') : '';
}

/**
 * Forward original client request to a service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} serviceName - Service name
 * @param {string} [path] - Override path (defaults to original request path)
 */
async function forwardRequest(req, res, serviceName, path = null) {
  const requestId = req.headers['x-request-id'] || Date.now().toString();
  
  try {
    // Check if service is available (circuit breaker)
    if (!serviceRegistry.isServiceAvailable(serviceName)) {
      return res.status(503).json({
        error: {
          message: `${serviceName} is currently unavailable (circuit open)`,
          status: 503,
          requestId
        }
      });
    }
    
    // Strip /api/v1 prefix from the path
    const requestPath = path || req.path.replace(/^\/api\/v1/, '');
    
    // Get service URL from registry
    const serviceUrl = getServiceUrl(serviceName);
    
    // Construct full URL
    const url = `${serviceUrl}${requestPath}`;
    
    // Forward headers but remove host
    const headers = { ...req.headers };
    delete headers.host;
    
    // Add user ID and roles to headers if available (from auth middleware)
    if (req.user) {
      headers['x-user-id'] = req.user.id;
      if (req.user.roles) {
        headers['x-user-roles'] = JSON.stringify(req.user.roles);
      }
    }
    
    // Add request ID for tracing
    headers['x-request-id'] = requestId;
    
    try {
      // Make request to service
      const response = await axiosInstance({
        url,
        method: req.method,
        data: req.body,
        headers,
        params: req.query
      });
      
      // Record successful request for circuit breaker
      if (serviceRegistry.isServiceAvailable(serviceName)) {
        const serviceStatus = serviceRegistry.getServiceStatus(serviceName);
        if (serviceStatus.circuit?.state === 'HALF_OPEN') {
          // Update service registry with successful request in half-open state
          serviceRegistry._handleSuccessfulHealthCheck(serviceName);
        }
      }
      
      // Forward the response
      res.status(response.status || 200).json(response.data);
    } catch (error) {
      logger.error(`Service forwarding error for ${serviceName}:`, {
        requestId,
        error: error.message,
        status: error.response?.status,
        path: requestPath
      });
      
      // Record failed request for circuit breaker
      if (serviceRegistry.isServiceAvailable(serviceName)) {
        serviceRegistry._handleFailedHealthCheck(serviceName, error.message);
      }
      
      if (error.response) {
        // Forward the error response from the service
        return res.status(error.response.status).json({
          ...error.response.data,
          requestId
        });
      }
      
      // For network or timeout errors
      return res.status(503).json({
        error: {
          message: `${serviceName} is currently unavailable`,
          status: 503,
          requestId
        }
      });
    }
  } catch (error) {
    logger.error(`Service forwarding failed for ${serviceName}:`, {
      requestId,
      error: error.message,
      path: req.path
    });
    
    // Generic error response
    res.status(500).json({
      error: {
        message: 'Internal server error',
        status: 500,
        requestId
      }
    });
  }
}

module.exports = {
  makeServiceRequest,
  forwardRequest,
  getServiceUrl
}; 