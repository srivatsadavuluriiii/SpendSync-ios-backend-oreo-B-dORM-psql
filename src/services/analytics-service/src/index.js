import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { createLogger, format, transports } from 'winston';
import prometheusMiddleware from 'express-prometheus-middleware';

// Import routes
import spendingRoutes from './routes/spending.js';
import insightsRoutes from './routes/insights.js';
import predictionsRoutes from './routes/predictions.js';
import budgetRoutes from './routes/budget.js';

// Import middleware and utilities
import { validate } from './middleware/validation/validator.js';
import { sanitizeQuery } from './middleware/sanitization/mongoSanitizer.js';
import { routeSpecificLimits } from './middleware/limits/payloadLimiter.js';
import { redisClient } from './utils/cache.js';
import { prometheusClient } from './utils/metrics.js';
import { processTimeSeriesData } from './utils/dataProcessor.js';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3005;

// Configure Winston logger
const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/analytics-service.log' })
  ]
});

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply route-specific payload limits
app.use((req, res, next) => {
  const limiter = routeSpecificLimits[req.path] || routeSpecificLimits.default;
  limiter(req, res, next);
});

// Apply query sanitization to all routes
app.use(sanitizeQuery());

// Prometheus metrics middleware with detailed configuration
app.use(prometheusMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5],
  requestLengthBuckets: [512, 1024, 5120, 10240],
  responseLengthBuckets: [512, 1024, 5120, 10240],
}));

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spendsync_analytics';
mongoose.connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    // Verify Redis connection after MongoDB connects
    return redisClient.ping();
  })
  .then(() => {
    logger.info('Connected to Redis');
  })
  .catch(err => {
    logger.error('Database connection error:', err);
    process.exit(1);
  });

// Root route with service information
app.get('/', (req, res) => {
  res.status(200).send(`
    <html>
      <head>
        <title>SpendSync Analytics Service</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .endpoint { margin-bottom: 10px; }
          .status { color: #4CAF50; }
        </style>
      </head>
      <body>
        <h1>SpendSync Analytics Service</h1>
        <p>The Analytics Service is running successfully.</p>
        <div class="status">Status: Active</div>
        <p>Available endpoints:</p>
        <div class="endpoint">/health - Service health check</div>
        <div class="endpoint">/metrics - Prometheus metrics</div>
        <div class="endpoint">/analytics/spending - Get spending patterns</div>
        <div class="endpoint">/analytics/insights - Get financial insights</div>
        <div class="endpoint">/analytics/predictions - Get expense predictions</div>
        <div class="endpoint">/analytics/budgets - Get budget analysis</div>
      </body>
    </html>
  `);
});

// Health check endpoint with enhanced status information
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    let mongoStatus = 'DOWN';
    try {
      await mongoose.connection.db.admin().ping();
      mongoStatus = 'UP';
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
    }

    res.json({
      status: mongoStatus === 'UP' ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStatus
      },
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: 'Health check failed'
    });
  }
});

// Apply validation and routes with enhanced error handling
app.use('/analytics/spending', 
  validate('spending', 'headers'),
  validate('spending', 'query'),
  async (req, res, next) => {
    try {
      // Process any time series data before passing to route handlers
      if (req.body.timeSeriesData) {
        req.processedData = await processTimeSeriesData(req.body.timeSeriesData, {
          interval: req.query.interval || '1h',
          aggregationType: req.query.aggregationType || 'sum',
          dimensions: req.query.dimensions?.split(',') || []
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  },
  spendingRoutes
);

app.use('/analytics/insights',
  validate('insights', 'headers'),
  validate('insights', 'query'),
  insightsRoutes
);

app.use('/analytics/predictions',
  validate('predictions', 'headers'),
  validate('predictions', 'query'),
  predictionsRoutes
);

app.use('/analytics/budgets',
  validate('budget', 'headers'),
  validate('budget', 'query'),
  budgetRoutes
);

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details,
      code: 'VALIDATION_ERROR'
    });
  }

  if (err.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: err.message,
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    return res.status(503).json({
      error: 'Database Error',
      message: 'A database error occurred',
      code: 'DATABASE_ERROR'
    });
  }

  if (err.name === 'RedisError') {
    return res.status(503).json({
      error: 'Cache Error',
      message: 'A caching error occurred',
      code: 'CACHE_ERROR'
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Analytics Service running on port ${PORT}`);
    logger.info(`Health check available at http://localhost:${PORT}/health`);
    logger.info(`Metrics available at http://localhost:${PORT}/metrics`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  
  // Close server
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Close database connections
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    await redisClient.quit();
    logger.info('Redis connection closed');
    
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
});

export default app; 