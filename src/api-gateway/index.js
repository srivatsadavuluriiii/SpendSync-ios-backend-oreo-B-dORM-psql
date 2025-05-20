/**
 * API Gateway
 * 
 * Main entry point for the API Gateway that routes requests to the appropriate services
 */

const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const config = require('./config');
const { logger, stream } = require('../shared/utils/logger');
const { authenticate } = require('./middleware/auth.middleware');
const { errorHandler, notFoundHandler } = require('../shared/middleware/error.middleware');
const { metricsMiddleware, metricsHandler, healthCheckHandler, traceMiddleware } = require('../shared/middleware/monitoring.middleware');
const { cacheMiddleware } = require('../shared/middleware/cache.middleware');
const memoryOptimizationMiddleware = require('../shared/middleware/memory-optimization.middleware');
const routes = require('./routes');
const serviceRegistry = require('../shared/services/service-registry');

// Enable garbage collection if available
try {
  if (global.gc) {
    logger.info('Garbage collection is available');
  } else {
    logger.warn('Garbage collection is not available. Run with --expose-gc flag for better memory management');
  }
} catch (e) {
  logger.warn('Garbage collection is not available. Run with --expose-gc flag for better memory management');
}

// Create Express app
const app = express();

// Apply security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:'],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"]
    }
  }
}));

// Enable CORS
app.use(cors(config.security.cors));

// Request logging
app.use(morgan(config.logging.format === 'json' ? 'combined' : 'dev', { stream }));

// Memory optimization middleware
app.use(memoryOptimizationMiddleware.handle());

// Schedule memory cleanup at intervals
setInterval(() => {
  if (global.gc) {
    logger.debug('Running scheduled garbage collection');
    global.gc();
  }
}, 30000); // Every 30 seconds

// Monitoring middleware
app.use(traceMiddleware());
app.use(metricsMiddleware());

// Body parsing with smaller limits
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Response caching with shorter TTL
app.use(cacheMiddleware());

// API Documentation - load on demand to save memory
app.use('/api-docs', (req, res, next) => {
  // Only initialize swagger when needed
  swaggerUi.serve(req, res, next);
});
app.get('/api-docs', swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', healthCheckHandler);

// Metrics endpoint
app.get('/metrics', metricsHandler);

// Service status endpoint
app.get('/services/status', (req, res) => {
  res.json({
    status: 'UP',
    services: serviceRegistry.getAllServicesStatus()
  });
});

// Homepage
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync API Gateway</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .service { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
          .service h2 { margin-top: 0; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>SpendSync API Gateway</h1>
        <p>Welcome to the SpendSync API Gateway. The following services are available:</p>
        
        <div class="service">
          <h2>API Documentation</h2>
          <a href="/api-docs">Swagger API Documentation</a>
        </div>
        
        <div class="service">
          <h2>Admin Dashboard</h2>
          <a href="/api/v1/dashboard">Admin Dashboard</a>
          <p>Monitor services, circuits, and cache</p>
        </div>
        
        <div class="service">
          <h2>User Service</h2>
          <p>Manages users and groups</p>
          <a href="/users-ui">View Users Dashboard</a>
        </div>
        
        <div class="service">
          <h2>Expense Service</h2>
          <p>Manages expenses</p>
          <a href="/expenses-ui">View Expenses Dashboard</a>
        </div>
        
        <div class="service">
          <h2>Settlement Service</h2>
          <p>Manages settlements</p>
          <a href="/settlements-ui">View Settlements Dashboard</a>
        </div>
        
        <div class="service">
          <h2>Notification Service</h2>
          <p>Manages notifications</p>
          <a href="/notifications-ui">View Notifications Dashboard</a>
        </div>
        
        <div class="service">
          <h2>Health Check</h2>
          <a href="/health">API Gateway Health</a>
        </div>
        
        <div class="service">
          <h2>Services Status</h2>
          <a href="/services/status">View Services Status</a>
        </div>
      </body>
    </html>
  `);
});

// Apply authentication middleware to all routes except public ones
app.use('/api/v1', authenticate({ required: false }));

// API routes
app.use('/api/v1', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(`API Gateway running on port ${config.port}`);
    logger.info(`Documentation available at http://localhost:${config.port}/api-docs`);
    logger.info(`Health check available at http://localhost:${config.port}/health`);
    logger.info(`Metrics available at http://localhost:${config.port}/metrics`);
    logger.info(`Admin dashboard available at http://localhost:${config.port}/api/v1/dashboard`);
  });
}

module.exports = app; 