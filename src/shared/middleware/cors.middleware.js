/**
 * CORS middleware
 * 
 * Implements configurable CORS (Cross-Origin Resource Sharing) protection
 * with secure defaults and environment-based configuration.
 */

const config = require('../../config');

/**
 * Create CORS middleware with configurable options
 * @param {Object} options - CORS configuration options
 * @param {string[]} options.allowedOrigins - List of allowed origins (default: from config)
 * @param {string[]} options.allowedMethods - Allowed HTTP methods (default: standard methods)
 * @param {string[]} options.allowedHeaders - Allowed headers (default: standard headers)
 * @param {number} options.maxAge - Preflight cache duration in seconds (default: 24 hours)
 * @returns {Function} Express middleware function
 */
const cors = (options = {}) => {
  const {
    allowedOrigins = config.cors?.allowedOrigins || ['http://localhost:3000'],
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token'
    ],
    maxAge = 86400 // 24 hours
  } = options;

  return (req, res, next) => {
    const origin = req.headers.origin;

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      // Check if origin is allowed
      if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        res.setHeader('Access-Control-Max-Age', maxAge.toString());
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.status(204).end();
        return;
      }
      
      // Origin not allowed
      res.status(403).end();
      return;
    }

    // Handle actual requests
    if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Vary origin to support multiple allowed origins
      if (allowedOrigins.length > 1) {
        res.setHeader('Vary', 'Origin');
      }
    }

    next();
  };
};

/**
 * Create development CORS middleware with permissive settings
 * @returns {Function} CORS middleware configured for development
 */
const developmentCors = () => {
  return cors({
    allowedOrigins: ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['*']
  });
};

/**
 * Create production CORS middleware with strict settings
 * @param {string[]} allowedOrigins - List of allowed production origins
 * @returns {Function} CORS middleware configured for production
 */
const productionCors = (allowedOrigins) => {
  return cors({
    allowedOrigins,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token'
    ],
    maxAge: 7200 // 2 hours
  });
};

module.exports = {
  cors,
  developmentCors,
  productionCors
}; 