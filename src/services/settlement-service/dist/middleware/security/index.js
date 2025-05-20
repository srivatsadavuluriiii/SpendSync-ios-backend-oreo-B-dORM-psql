/**
 * Security Middleware Index
 *
 * Exports all security middleware for the settlement service.
 */
const securityHeaders = require('./security-headers.middleware');
const { baseRateLimiter, strictRateLimiter, settlementCreationLimiter, paymentOperationsLimiter } = require('./rate-limiter.middleware');
const { csrfProtection, conditionalCsrfProtection, handleCsrfError, csrfTokenProvider } = require('./csrf.middleware');
const { validate, sanitizeInputs, validateObjectIds } = require('./input-validation.middleware');
const corsMiddleware = require('./cors.middleware');
const hppMiddleware = require('./hpp.middleware');
// Create a combo middleware that applies standard security protections
const standardSecurity = [
    securityHeaders, // Apply security headers
    corsMiddleware, // Apply CORS protection
    sanitizeInputs, // Sanitize inputs against XSS
    hppMiddleware, // Prevent HTTP Parameter Pollution
    baseRateLimiter // Basic rate limiting
];
// Middleware for routes requiring extra protection
const enhancedSecurity = [
    ...standardSecurity,
    conditionalCsrfProtection // CSRF protection for mutating operations
];
module.exports = {
    // Standard middleware
    securityHeaders,
    corsMiddleware,
    sanitizeInputs,
    hppMiddleware,
    // Rate limiting
    baseRateLimiter,
    strictRateLimiter,
    settlementCreationLimiter,
    paymentOperationsLimiter,
    // CSRF protection
    csrfProtection,
    conditionalCsrfProtection,
    handleCsrfError,
    csrfTokenProvider,
    // Input validation
    validate,
    validateObjectIds,
    // Combined middleware stacks
    standardSecurity,
    enhancedSecurity
};
export {};
//# sourceMappingURL=index.js.map