/**
 * Settlement Service
 * 
 * Main entry point for the Settlement Service that handles
 * debt optimization and settlement tracking
 */

const express = require('express');
const { swaggerUi, swaggerDocs } = require('./config/swagger');
const { errorHandler } = require('../../../shared/middleware');
const { prometheusMiddleware, register } = require('./config/monitoring');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add Prometheus middleware
app.use(prometheusMiddleware);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Add Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SpendSync Settlement Service API Documentation'
}));

// Routes
app.use('/api/settlements', require('./routes/settlement.routes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'settlement-service',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(errorHandler);

// Start the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Settlement Service running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    console.log(`Metrics available at http://localhost:${PORT}/metrics`);
  });
}

module.exports = app; 