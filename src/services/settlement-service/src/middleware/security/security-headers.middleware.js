/**
 * Security Headers Middleware
 * 
 * Sets security-related HTTP headers to protect against various attacks.
 */

const helmet = require('helmet');

/**
 * Configure and export helmet middleware with appropriate settings
 */
const securityHeaders = helmet({
  // Content Security Policy 
  // Helps prevent XSS, clickjacking, and other code injection attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],  // Default to same-origin
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'], // For Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],  // For Swagger UI
      imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],              // For Swagger UI
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],                      // For Swagger UI 
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // Cross-Origin-Embedder-Policy
  // Prevents loading of resources cross-origin that don't explicitly grant permissions
  crossOriginEmbedderPolicy: false, // Disabled for Swagger UI compatibility
  
  // Cross-Origin-Opener-Policy
  // Prevents a tab from reaching other tabs/windows
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  
  // Cross-Origin-Resource-Policy
  // Restricts resource loading to same-origin
  crossOriginResourcePolicy: { policy: 'same-origin' },
  
  // DNS Prefetch Control
  // Controls browser DNS prefetching
  dnsPrefetchControl: { allow: false },
  
  // Expect-CT
  // Helps enforce Certificate Transparency for browsers
  expectCt: { 
    enforce: true, 
    maxAge: 30 * 24 * 60 * 60, 
    reportUri: process.env.REPORT_URI || undefined
  },
  
  // Iframe options
  // Protects against clickjacking attacks
  frameguard: { action: 'deny' },
  
  // HSTS
  // Forces browsers to use HTTPS
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  
  // No-sniff
  // Prevents browsers from trying to MIME-sniff the content type
  noSniff: true,
  
  // Origin-Agent-Cluster
  // Allows more isolation in the browser
  originAgentCluster: true,
  
  // Permission Policy
  // Controls which browser features can be used
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  
  // Referrer Policy
  // Controls the Referer header
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // XSS Protection
  // Enables browser XSS protection features
  xssFilter: true,
  
  // Don't expose the powered-by header
  hidePoweredBy: true
});

module.exports = securityHeaders; 