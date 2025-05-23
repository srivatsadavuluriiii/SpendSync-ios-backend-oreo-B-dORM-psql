import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  app: {
    name: 'payment-service',
    port: process.env.PORT || 3005,
    env: process.env.NODE_ENV || 'development'
  },
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/spendsync_payments',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiVersion: '2023-10-16'
  },
  plaid: {
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    env: process.env.PLAID_ENV || 'sandbox'
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      error: 'logs/error.log',
      combined: 'logs/combined.log'
    }
  }
};

// Validate required configuration
const requiredConfig = [
  'stripe.secretKey',
  'stripe.webhookSecret',
  'db.uri',
  'supabase.url',
  'supabase.serviceRoleKey'
];

const validateConfig = () => {
  const missingConfig = requiredConfig.filter(path => {
    const keys = path.split('.');
    let current = config;
    for (const key of keys) {
      if (!current[key]) return true;
      current = current[key];
    }
    return false;
  });

  if (missingConfig.length > 0) {
    throw new Error(`Missing required configuration: ${missingConfig.join(', ')}`);
  }
};

// Only validate in production
if (config.app.env === 'production') {
  validateConfig();
}

export default config; 