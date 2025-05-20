/**
 * Security Headers middleware
 * 
 * Implements various security headers including CSP, HSTS, and XSS protection
 * to enhance application security against common web vulnerabilities.
 */

const config = require('../../config');

/**
 * Create security headers middleware
 * @param {Object} options - Security header options
 * @param {Object} options.csp - Content Security Policy options
 * @param {Object} options.hsts - HTTP Strict Transport Security options
 * @param {boolean} options.xssFilter - Enable X-XSS-Protection header
 * @returns {Function} Express middleware function
 */
const securityHeaders = (options = {}) => {
  const {
    csp = {},
    hsts = {},
    xssFilter = true
  } = options;

  // Default CSP directives
  const defaultCsp = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", 'https:', 'data:'],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
    childSrc: ["'none'"],
    workerSrc: ["'self'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: true
  };

  // Default HSTS options
  const defaultHsts = {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  };

  // Merge provided options with defaults
  const cspOptions = { ...defaultCsp, ...csp };
  const hstsOptions = { ...defaultHsts, ...hsts };

  /**
   * Convert CSP object to string
   * @param {Object} cspObj - CSP configuration object
   * @returns {string} CSP header string
   */
  const buildCspString = (cspObj) => {
    return Object.entries(cspObj)
      .map(([key, value]) => {
        if (value === true) return key;
        if (!value || (Array.isArray(value) && value.length === 0)) return '';
        const directive = key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
        return `${directive} ${Array.isArray(value) ? value.join(' ') : value}`;
      })
      .filter(Boolean)
      .join('; ');
  };

  return (req, res, next) => {
    // Set Content Security Policy
    const cspString = buildCspString(cspOptions);
    if (cspString) {
      res.setHeader('Content-Security-Policy', cspString);
    }

    // Set HSTS header
    if (process.env.NODE_ENV === 'production') {
      const hstsString = `max-age=${hstsOptions.maxAge}${
        hstsOptions.includeSubDomains ? '; includeSubDomains' : ''
      }${hstsOptions.preload ? '; preload' : ''}`;
      res.setHeader('Strict-Transport-Security', hstsString);
    }

    // Set X-XSS-Protection header
    if (xssFilter) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    // Set additional security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Remove powered by header
    res.removeHeader('X-Powered-By');

    next();
  };
};

/**
 * Create development security headers middleware
 * Less restrictive for development environment
 */
const developmentHeaders = () => {
  return securityHeaders({
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", 'ws:', 'wss:'], // Allow WebSocket connections
      upgradeInsecureRequests: false
    },
    hsts: {
      maxAge: 0,
      includeSubDomains: false,
      preload: false
    }
  });
};

/**
 * Create production security headers middleware
 * Strict security settings for production environment
 */
const productionHeaders = () => {
  return securityHeaders({
    csp: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
      childSrc: ["'none'"],
      workerSrc: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: true,
      reportUri: '/api/csp-report'
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    xssFilter: true
  });
};

module.exports = {
  securityHeaders,
  developmentHeaders,
  productionHeaders
}; 