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

// UI dashboard for User Service
app.get('/users-ui', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync - Users Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .back { margin-bottom: 20px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #f9f9f9; margin-bottom: 20px; }
          .card h3 { margin-top: 0; color: #555; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; background: #d4edda; color: #155724; }
        </style>
        <script>
          window.onload = function() {
            // Try to fetch users from the user service
            fetch('/api/v1/users')
              .then(response => response.json())
              .then(data => {
                document.getElementById('service-status').innerHTML = '<span class="status">Service Connected</span>';
                document.getElementById('user-count').textContent = data.users ? data.users.length : 'N/A';
              })
              .catch(error => {
                document.getElementById('service-status').innerHTML = '<span style="background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; font-weight: bold;">Service Disconnected</span>';
                document.getElementById('user-count').textContent = 'N/A';
              });
          };
        </script>
      </head>
      <body>
        <div class="back"><a href="/">← Back to Home</a></div>
        <h1>Users Dashboard</h1>
        <p>Manages users and groups</p>
        
        <div class="card">
          <h3>Service Status</h3>
          <p id="service-status">Checking...</p>
        </div>
        
        <div class="card">
          <h3>Statistics</h3>
          <p><strong>Total Users:</strong> <span id="user-count">Loading...</span></p>
        </div>
        
        <div class="card">
          <h3>Quick Actions</h3>
          <p><a href="/api/v1/users">View All Users (API)</a></p>
          <p><a href="/api-docs">API Documentation</a></p>
        </div>
      </body>
    </html>
  `);
});

// UI dashboard for Expense Service
app.get('/expenses-ui', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync - Expenses Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .back { margin-bottom: 20px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #f9f9f9; margin-bottom: 20px; }
          .card h3 { margin-top: 0; color: #555; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; background: #d4edda; color: #155724; }
        </style>
        <script>
          window.onload = function() {
            // Try to fetch expenses from the expense service
            fetch('/api/v1/expenses')
              .then(response => response.json())
              .then(data => {
                document.getElementById('service-status').innerHTML = '<span class="status">Service Connected</span>';
                document.getElementById('expense-count').textContent = data.expenses ? data.expenses.length : 'N/A';
              })
              .catch(error => {
                document.getElementById('service-status').innerHTML = '<span style="background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; font-weight: bold;">Service Disconnected</span>';
                document.getElementById('expense-count').textContent = 'N/A';
              });
          };
        </script>
      </head>
      <body>
        <div class="back"><a href="/">← Back to Home</a></div>
        <h1>Expenses Dashboard</h1>
        <p>Manages expenses</p>
        
        <div class="card">
          <h3>Service Status</h3>
          <p id="service-status">Checking...</p>
        </div>
        
        <div class="card">
          <h3>Statistics</h3>
          <p><strong>Total Expenses:</strong> <span id="expense-count">Loading...</span></p>
        </div>
        
        <div class="card">
          <h3>Quick Actions</h3>
          <p><a href="/api/v1/expenses">View All Expenses (API)</a></p>
          <p><a href="/api-docs">API Documentation</a></p>
        </div>
      </body>
    </html>
  `);
});

// UI dashboard for Settlement Service
app.get('/settlements-ui', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync - Settlements Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .back { margin-bottom: 20px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #f9f9f9; margin-bottom: 20px; }
          .card h3 { margin-top: 0; color: #555; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; background: #d4edda; color: #155724; }
        </style>
        <script>
          window.onload = function() {
            // Try to fetch settlements from the settlement service
            fetch('/api/v1/settlements')
              .then(response => response.json())
              .then(data => {
                document.getElementById('service-status').innerHTML = '<span class="status">Service Connected</span>';
                document.getElementById('settlement-count').textContent = data.settlements ? data.settlements.length : 'N/A';
              })
              .catch(error => {
                document.getElementById('service-status').innerHTML = '<span style="background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; font-weight: bold;">Service Disconnected</span>';
                document.getElementById('settlement-count').textContent = 'N/A';
              });
          };
        </script>
      </head>
      <body>
        <div class="back"><a href="/">← Back to Home</a></div>
        <h1>Settlements Dashboard</h1>
        <p>Manages settlements</p>
        
        <div class="card">
          <h3>Service Status</h3>
          <p id="service-status">Checking...</p>
        </div>
        
        <div class="card">
          <h3>Statistics</h3>
          <p><strong>Total Settlements:</strong> <span id="settlement-count">Loading...</span></p>
        </div>
        
        <div class="card">
          <h3>Quick Actions</h3>
          <p><a href="/api/v1/settlements">View All Settlements (API)</a></p>
          <p><a href="/api-docs">API Documentation</a></p>
        </div>
      </body>
    </html>
  `);
});

// UI dashboard for Notification Service
app.get('/notifications-ui', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync - Notifications Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .back { margin-bottom: 20px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #f9f9f9; margin-bottom: 20px; }
          .card h3 { margin-top: 0; color: #555; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; background: #d4edda; color: #155724; }
        </style>
        <script>
          window.onload = function() {
            // Try to fetch notifications from the notification service
            fetch('/api/v1/notifications')
              .then(response => response.json())
              .then(data => {
                document.getElementById('service-status').innerHTML = '<span class="status">Service Connected</span>';
                document.getElementById('notification-count').textContent = data.notifications ? data.notifications.length : 'N/A';
              })
              .catch(error => {
                document.getElementById('service-status').innerHTML = '<span style="background: #f8d7da; color: #721c24; padding: 4px 8px; border-radius: 4px; font-weight: bold;">Service Disconnected</span>';
                document.getElementById('notification-count').textContent = 'N/A';
              });
          };
        </script>
      </head>
      <body>
        <div class="back"><a href="/">← Back to Home</a></div>
        <h1>Notifications Dashboard</h1>
        <p>Manages notifications</p>
        
        <div class="card">
          <h3>Service Status</h3>
          <p id="service-status">Checking...</p>
        </div>
        
        <div class="card">
          <h3>Statistics</h3>
          <p><strong>Total Notifications:</strong> <span id="notification-count">Loading...</span></p>
        </div>
        
        <div class="card">
          <h3>Quick Actions</h3>
          <p><a href="/api/v1/notifications">View All Notifications (API)</a></p>
          <p><a href="/api-docs">API Documentation</a></p>
        </div>
      </body>
    </html>
  `);
});

// Admin Dashboard
app.get('/api/v1/dashboard', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync - Admin Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: #f9f9f9; }
          .card h3 { margin-top: 0; color: #555; }
          .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; }
          .status.up { background: #d4edda; color: #155724; }
          .status.down { background: #f8d7da; color: #721c24; }
          .back { margin-bottom: 20px; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
        <script>
          window.onload = function() {
            // Load services status
            fetch('/services/status')
              .then(response => response.json())
              .then(data => {
                const servicesContainer = document.getElementById('services-status');
                const services = data.services || {};
                
                Object.keys(services).forEach(serviceName => {
                  const service = services[serviceName];
                  const serviceDiv = document.createElement('div');
                  serviceDiv.innerHTML = \`
                    <strong>\${serviceName}:</strong> 
                    <span class="status \${service.status === 'UP' ? 'up' : 'down'}">\${service.status}</span>
                  \`;
                  servicesContainer.appendChild(serviceDiv);
                });
              })
              .catch(error => {
                document.getElementById('services-status').innerHTML = '<p style="color: red;">Error loading services status</p>';
              });
              
            // Load health check
            fetch('/health')
              .then(response => response.json())
              .then(data => {
                document.getElementById('health-status').innerHTML = \`
                  <p><strong>Status:</strong> \${data.status}</p>
                  <p><strong>Uptime:</strong> \${Math.floor(data.uptime)} seconds</p>
                  <p><strong>Memory Usage:</strong> \${Math.round(data.memory.heapUsed / 1024 / 1024)}MB</p>
                \`;
              })
              .catch(error => {
                document.getElementById('health-status').innerHTML = '<p style="color: red;">Error loading health status</p>';
              });
          };
        </script>
      </head>
      <body>
        <div class="back"><a href="/">← Back to Home</a></div>
        <h1>Admin Dashboard</h1>
        <p>Monitor services, circuits, and cache</p>
        
        <div class="dashboard-grid">
          <div class="card">
            <h3>Services Status</h3>
            <div id="services-status">Loading...</div>
          </div>
          
          <div class="card">
            <h3>API Gateway Health</h3>
            <div id="health-status">Loading...</div>
          </div>
          
          <div class="card">
            <h3>Quick Links</h3>
            <p><a href="/api-docs">API Documentation</a></p>
            <p><a href="/health">Health Check</a></p>
            <p><a href="/metrics">Metrics</a></p>
            <p><a href="/services/status">Services Status</a></p>
          </div>
          
          <div class="card">
            <h3>Service Dashboards</h3>
            <p><a href="/users-ui">Users Dashboard</a></p>
            <p><a href="/expenses-ui">Expenses Dashboard</a></p>
            <p><a href="/settlements-ui">Settlements Dashboard</a></p>
            <p><a href="/notifications-ui">Notifications Dashboard</a></p>
          </div>
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