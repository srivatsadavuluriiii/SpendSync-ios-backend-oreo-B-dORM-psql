import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

// Import middleware
import { RateLimiter } from './middleware/rateLimit';
import { errorHandler } from './utils/errors';
import { metricsMiddleware, metricsHandler } from './utils/metrics';
import { Cache } from './utils/cache';

// Import routes
import analyticsRoutes from './services/analytics';

// Load OpenAPI specification
const swaggerDocument = YAML.load(path.join(__dirname, 'docs/openapi.yaml'));

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3005;

// Initialize rate limiters
const rateLimiters = RateLimiter.createLimiters();

// Initialize caches
const caches = Cache.createCaches();

// Basic security middleware
app.use(helmet());
app.use(cors());

// Metrics middleware
app.use(metricsMiddleware);

// Apply rate limiting
app.use('/analytics/track', rateLimiters.analyticsLimiter);
app.use('/analytics/batch', rateLimiters.batchLimiter);
app.use('/analytics/query', rateLimiters.queryLimiter);
app.use(rateLimiters.defaultLimiter); // Default rate limit for other routes

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'analytics-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

// Metrics endpoint
app.get('/metrics', metricsHandler);

// Analytics routes
app.use('/analytics', analyticsRoutes);

// Error handling
app.use(errorHandler);

// Connect to MongoDB with retry logic
const connectWithRetry = async (retries = 5, interval = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spendsync_analytics', {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log('Connected to MongoDB');
      break;
    } catch (err) {
      console.error(`MongoDB connection attempt ${i + 1} failed:`, err);
      if (i === retries - 1) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Received shutdown signal');

  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
  }

  // Close Redis connections
  try {
    const redisClients = [
      ...Object.values(caches).map(cache => cache.redis),
      ...Object.values(rateLimiters).map(limiter => limiter.redis)
    ];
    await Promise.all(redisClients.map(client => client.quit()));
    console.log('Redis connections closed');
  } catch (err) {
    console.error('Error closing Redis connections:', err);
  }

  // Exit process
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
if (process.env.NODE_ENV !== 'test') {
  connectWithRetry().then(() => {
    app.listen(PORT, () => {
      console.log(`Analytics Service running on port ${PORT}`);
      console.log(`Documentation available at http://localhost:${PORT}/docs`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
      console.log(`Metrics available at http://localhost:${PORT}/metrics`);
    });
  });
}

export default app; 