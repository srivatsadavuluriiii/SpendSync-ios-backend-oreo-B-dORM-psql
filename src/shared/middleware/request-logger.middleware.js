/**
 * Request logging middleware
 * 
 * Implements request logging for audit trails and monitoring with
 * configurable logging levels and output formats.
 */

const winston = require('winston');
const config = require('../../config');

// Configure Winston logger
const logger = winston.createLogger({
  level: config.logging?.level || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api' },
  transports: [
    // Write to all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      level: 'info'
    }),
    // Write all logs error (and below) to 'error.log'
    new winston.transports.File({ 
      filename: 'logs/error.log',
      level: 'error'
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Create request logging middleware
 * @param {Object} options - Logging options
 * @param {string} options.level - Log level (default: info)
 * @param {boolean} options.logBody - Whether to log request body (default: false)
 * @param {boolean} options.logQuery - Whether to log query parameters (default: true)
 * @param {string[]} options.excludePaths - Paths to exclude from logging
 * @param {string[]} options.sensitiveFields - Fields to mask in logs
 * @returns {Function} Express middleware function
 */
const requestLogger = (options = {}) => {
  const {
    level = 'info',
    logBody = false,
    logQuery = true,
    excludePaths = ['/health', '/metrics'],
    sensitiveFields = ['password', 'token', 'apiKey', 'secret']
  } = options;

  /**
   * Mask sensitive data in object
   * @param {Object} obj - Object to mask
   * @returns {Object} Masked object
   */
  const maskSensitiveData = (obj) => {
    const masked = { ...obj };
    for (const field of sensitiveFields) {
      if (masked[field]) {
        masked[field] = '******';
      }
    }
    return masked;
  };

  return (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Get request start time
    const startTime = Date.now();

    // Log request
    const requestLog = {
      type: 'request',
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('user-agent'),
      correlationId: req.get('x-correlation-id'),
      timestamp: new Date().toISOString()
    };

    // Add query parameters if enabled
    if (logQuery && Object.keys(req.query).length > 0) {
      requestLog.query = maskSensitiveData(req.query);
    }

    // Add request body if enabled
    if (logBody && Object.keys(req.body).length > 0) {
      requestLog.body = maskSensitiveData(req.body);
    }

    // Log request
    logger.log(level, 'Incoming request', requestLog);

    // Log response
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const responseLog = {
        type: 'response',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        correlationId: req.get('x-correlation-id'),
        timestamp: new Date().toISOString()
      };

      // Log at error level for 4xx and 5xx responses
      const responseLevel = res.statusCode >= 400 ? 'error' : level;
      logger.log(responseLevel, 'Response sent', responseLog);
    });

    next();
  };
};

/**
 * Create development request logger with verbose output
 * @returns {Function} Request logger configured for development
 */
const developmentLogger = () => {
  return requestLogger({
    level: 'debug',
    logBody: true,
    logQuery: true,
    excludePaths: ['/health', '/metrics', '/favicon.ico']
  });
};

/**
 * Create production request logger with secure defaults
 * @returns {Function} Request logger configured for production
 */
const productionLogger = () => {
  return requestLogger({
    level: 'info',
    logBody: false,
    logQuery: true,
    excludePaths: [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/_next',
      '/static'
    ],
    sensitiveFields: [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'sessionId'
    ]
  });
};

module.exports = {
  requestLogger,
  developmentLogger,
  productionLogger,
  logger // Export logger instance for use in other modules
}; 