/**
 * Main configuration module
 */

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },

  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },

  // Service URLs
  services: {
    user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    expense: process.env.EXPENSE_SERVICE_URL || 'http://localhost:3002',
    settlement: process.env.SETTLEMENT_SERVICE_URL || 'http://localhost:3003',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006'
  },

  // MongoDB configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/spendsync',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  // Email configuration
  email: {
    apiKey: process.env.EMAIL_SERVICE_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@spendsync.app'
  },

  // SMS configuration
  sms: {
    apiKey: process.env.SMS_SERVICE_API_KEY || ''
  }
};

module.exports = config; 