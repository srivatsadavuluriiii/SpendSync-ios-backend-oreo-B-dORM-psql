/**
 * CSRF Protection Middleware
 * 
 * Implements CSRF protection for mutating operations.
 */

const csrf = require('csurf');
const { BadRequestError } = require('../../../../../shared/errors');

// CSRF protection options
const csrfOptions = {
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only secure cookies in production
    sameSite: 'strict',                            // Restrict to same site
    httpOnly: true,                                // Not accessible via JavaScript
    maxAge: 3600                                   // 1 hour in seconds
  }
};

// Create CSRF middleware
const csrfProtection = csrf(csrfOptions);

// Error handler for CSRF errors
const handleCsrfError = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    // Handle CSRF token errors
    next(new BadRequestError('Invalid or missing CSRF token', 'ERR_INVALID_CSRF_TOKEN'));
  } else {
    // Pass other errors to next error handler
    next(err);
  }
};

// Create token provider middleware
const csrfTokenProvider = (req, res, next) => {
  // Add the CSRF token to the response locals for templates
  // and to a custom header for API clients
  res.set('X-CSRF-Token', req.csrfToken());
  next();
};

/**
 * Custom CSRF middleware that only applies to mutating methods
 * (POST, PUT, PATCH, DELETE) and ignores GET, HEAD, OPTIONS
 * @returns {Function} Express middleware function
 */
const conditionalCsrfProtection = (req, res, next) => {
  // Skip CSRF for API webhooks, which are identified by special header
  if (req.path === '/api/payments/webhook' && req.headers['stripe-signature']) {
    return next();
  }
  
  // Skip CSRF for non-mutating methods
  const nonMutatingMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (nonMutatingMethods.includes(req.method)) {
    return next();
  }
  
  // Apply CSRF protection for mutating methods
  return csrfProtection(req, res, next);
};

module.exports = {
  csrfProtection,           // Full CSRF protection for all routes
  conditionalCsrfProtection, // CSRF protection only for mutating methods
  handleCsrfError,          // Error handler for CSRF errors
  csrfTokenProvider         // Middleware to provide CSRF token
}; 