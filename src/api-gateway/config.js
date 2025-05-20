/**
 * API Gateway Configuration
 * 
 * Contains configuration for API Gateway and its connected services
 */

const env = process.env.NODE_ENV || 'development';

// Validate required environment variables
const requiredEnvVars = {
  production: [
    'JWT_SECRET',
    'USER_SERVICE_URL',
    'EXPENSE_SERVICE_URL',
    'SETTLEMENT_SERVICE_URL',
    'NOTIFICATION_SERVICE_URL',
    'ANALYTICS_SERVICE_URL',
    'PAYMENT_SERVICE_URL'
  ],
  development: ['JWT_SECRET'],
  test: ['JWT_SECRET']
};

function validateEnvVars() {
  const missingVars = requiredEnvVars[env]?.filter(varName => !process.env[varName]) || [];
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Validate environment variables
validateEnvVars();

// Default service URLs for different environments
const serviceUrls = {
  development: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:4001',
    expenseService: process.env.EXPENSE_SERVICE_URL || 'http://localhost:4002',
    settlementService: process.env.SETTLEMENT_SERVICE_URL || 'http://localhost:4003',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004',
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4005',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4006'
  },
  test: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:4001',
    expenseService: process.env.EXPENSE_SERVICE_URL || 'http://localhost:4002',
    settlementService: process.env.SETTLEMENT_SERVICE_URL || 'http://localhost:4003',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004',
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4005',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4006'
  },
  production: {
    userService: process.env.USER_SERVICE_URL,
    expenseService: process.env.EXPENSE_SERVICE_URL,
    settlementService: process.env.SETTLEMENT_SERVICE_URL,
    notificationService: process.env.NOTIFICATION_SERVICE_URL,
    analyticsService: process.env.ANALYTICS_SERVICE_URL,
    paymentService: process.env.PAYMENT_SERVICE_URL
  }
};

// Circuit breaker configuration
const circuitBreaker = {
  enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
  userService: {
    failureThreshold: parseInt(process.env.USER_SERVICE_FAILURE_THRESHOLD || '3', 10),
    resetTimeout: parseInt(process.env.USER_SERVICE_RESET_TIMEOUT || '30000', 10),
    successThreshold: parseInt(process.env.USER_SERVICE_SUCCESS_THRESHOLD || '2', 10)
  },
  expenseService: {
    failureThreshold: parseInt(process.env.EXPENSE_SERVICE_FAILURE_THRESHOLD || '3', 10),
    resetTimeout: parseInt(process.env.EXPENSE_SERVICE_RESET_TIMEOUT || '30000', 10),
    successThreshold: parseInt(process.env.EXPENSE_SERVICE_SUCCESS_THRESHOLD || '2', 10)
  },
  settlementService: {
    failureThreshold: parseInt(process.env.SETTLEMENT_SERVICE_FAILURE_THRESHOLD || '3', 10),
    resetTimeout: parseInt(process.env.SETTLEMENT_SERVICE_RESET_TIMEOUT || '30000', 10),
    successThreshold: parseInt(process.env.SETTLEMENT_SERVICE_SUCCESS_THRESHOLD || '2', 10)
  },
  notificationService: {
    failureThreshold: parseInt(process.env.NOTIFICATION_SERVICE_FAILURE_THRESHOLD || '3', 10),
    resetTimeout: parseInt(process.env.NOTIFICATION_SERVICE_RESET_TIMEOUT || '30000', 10),
    successThreshold: parseInt(process.env.NOTIFICATION_SERVICE_SUCCESS_THRESHOLD || '2', 10)
  },
  analyticsService: {
    failureThreshold: parseInt(process.env.ANALYTICS_SERVICE_FAILURE_THRESHOLD || '3', 10),
    resetTimeout: parseInt(process.env.ANALYTICS_SERVICE_RESET_TIMEOUT || '30000', 10),
    successThreshold: parseInt(process.env.ANALYTICS_SERVICE_SUCCESS_THRESHOLD || '2', 10)
  },
  paymentService: {
    failureThreshold: parseInt(process.env.PAYMENT_SERVICE_FAILURE_THRESHOLD || '3', 10),
    resetTimeout: parseInt(process.env.PAYMENT_SERVICE_RESET_TIMEOUT || '30000', 10),
    successThreshold: parseInt(process.env.PAYMENT_SERVICE_SUCCESS_THRESHOLD || '2', 10)
  }
};

// Security configuration
const security = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || (env === 'production' ? [] : '*'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-User-ID',
      'X-User-Roles'
    ],
    exposedHeaders: ['X-Request-ID'],
    credentials: true,
    maxAge: 86400 // 24 hours
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env === 'production' ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
      return req.user ? `${req.user.id}-${req.ip}` : req.ip;
    }
  }
};

// Cache configuration
const cache = {
  enabled: process.env.CACHE_ENABLED !== 'false',
  ttl: parseInt(process.env.CACHE_TTL || '60', 10), // 60 seconds default
  maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
  excluded: {
    paths: [
      '/api/v1/auth',
      '/api/v1/payments/webhook',
      '/health',
      '/metrics'
    ],
    methods: ['POST', 'PUT', 'DELETE', 'PATCH']
  }
};

// Gateway configuration
const config = {
  env,
  port: process.env.PORT || 4000,
  serviceUrls: serviceUrls[env],
  circuitBreaker,
  security,
  cache,
  timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10), // 30 seconds
  logging: {
    level: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
    format: process.env.LOG_FORMAT || 'json',
    timestamp: true
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      path: process.env.METRICS_PATH || '/metrics'
    },
    tracing: {
      enabled: process.env.TRACING_ENABLED !== 'false',
      serviceName: 'api-gateway'
    }
  }
};

module.exports = config; 