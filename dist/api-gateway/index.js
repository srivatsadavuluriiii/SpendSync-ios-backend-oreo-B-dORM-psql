"use strict"; /**
 * API Gateway
 * 
 * Main entry point for the API Gateway that routes requests to the appropriate services
 */

const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const config = require('./config');
const { authenticate } = require('./middleware/auth.middleware');
const routes = require('./routes');

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
app.use(cors(config.cors));

// Request logging
app.use(morgan(config.logging.level === 'debug' ? 'dev' : 'combined'));

// Rate limiting
app.use(rateLimit(config.rateLimit));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown'
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
      </body>
    </html>
  `);
});

// UI pages for different services
app.get('/users-ui', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync - Users Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .back { margin-bottom: 20px; }
        </style>
        <script>
          window.onload = function() {
            fetch('/api/v1/users')
              .then(response => response.json())
              .then(data => {
                const tableBody = document.getElementById('usersTable');
                data.users.forEach(user => {
                  const row = document.createElement('tr');
                  row.innerHTML = \`
                    <td>\${user.id}</td>
                    <td>\${user.username}</td>
                    <td>\${user.email}</td>
                  \`;
                  tableBody.appendChild(row);
                });
              })
              .catch(error => {
                console.error('Error fetching users:', error);
                document.getElementById('error').textContent = 'Error fetching users: ' + error.message;
              });
          };
        </script>
      </head>
      <body>
        <div class="back"><a href="/">← Back to Home</a></div>
        <h1>Users Dashboard</h1>
        <div id="error" style="color: red;"></div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody id="usersTable">
            <!-- Data will be loaded here -->
          </tbody>
        </table>
      </body>
    </html>
  `);
});

app.get('/expenses-ui', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync - Expenses Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .back { margin-bottom: 20px; }
        </style>
        <script>
          window.onload = function() {
            fetch('/api/v1/expenses')
              .then(response => response.json())
              .then(data => {
                const tableBody = document.getElementById('expensesTable');
                data.expenses.forEach(expense => {
                  const row = document.createElement('tr');
                  row.innerHTML = \`
                    <td>\${expense.id}</td>
                    <td>\${expense.description}</td>
                    <td>\${expense.amount} \${expense.currency}</td>
                    <td>\${expense.payerId}</td>
                    <td>\${expense.participantIds.join(', ')}</td>
                    <td>\${new Date(expense.createdAt).toLocaleString()}</td>
                  \`;
                  tableBody.appendChild(row);
                });
              })
              .catch(error => {
                console.error('Error fetching expenses:', error);
                document.getElementById('error').textContent = 'Error fetching expenses: ' + error.message;
              });
          };
        </script>
      </head>
      <body>
        <div class="back"><a href="/">← Back to Home</a></div>
        <h1>Expenses Dashboard</h1>
        <div id="error" style="color: red;"></div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Paid By</th>
              <th>Participants</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody id="expensesTable">
            <!-- Data will be loaded here -->
          </tbody>
        </table>
      </body>
    </html>
  `);
});

app.get('/settlements-ui', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync - Settlements Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .back { margin-bottom: 20px; }
          .status-pending { color: orange; }
          .status-completed { color: green; }
          .status-cancelled { color: red; }
          .button-container { margin: 20px 0; }
          .button {
            padding: 10px 15px;
            background-color: #0066cc;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin-right: 10px;
          }
          .button:hover {
            background-color: #0052a3;
          }
        </style>
        <script>
          window.onload = function() {
            fetch('/api/v1/settlements')
              .then(response => response.json())
              .then(data => {
                const tableBody = document.getElementById('settlementsTable');
                data.settlements.forEach(settlement => {
                  const row = document.createElement('tr');
                  row.innerHTML = \`
                    <td>\${settlement.id}</td>
                    <td>\${settlement.payerId}</td>
                    <td>\${settlement.receiverId}</td>
                    <td>\${settlement.amount} \${settlement.currency}</td>
                    <td class="status-\${settlement.status}">\${settlement.status}</td>
                    <td>\${new Date(settlement.createdAt).toLocaleString()}</td>
                  \`;
                  tableBody.appendChild(row);
                });
              })
              .catch(error => {
                console.error('Error fetching settlements:', error);
                document.getElementById('error').textContent = 'Error fetching settlements: ' + error.message;
              });
          };
        </script>
      </head>
      <body>
        <div class="back"><a href="/">← Back to Home</a></div>
        <h1>Settlements Dashboard</h1>
        
        <div class="button-container">
          <a href="http://localhost:3003/calculation/group1" class="button">View Calculation Details</a>
        </div>
        
        <div id="error" style="color: red;"></div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Payer</th>
              <th>Receiver</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody id="settlementsTable">
            <!-- Data will be loaded here -->
          </tbody>
        </table>
      </body>
    </html>
  `);
});

app.get('/notifications-ui', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>SpendSync - Notifications Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .back { margin-bottom: 20px; }
          .read-true { opacity: 0.7; }
          .read-false { font-weight: bold; }
        </style>
        <script>
          window.onload = function() {
            fetch('/api/v1/notifications')
              .then(response => response.json())
              .then(data => {
                const tableBody = document.getElementById('notificationsTable');
                data.notifications.forEach(notification => {
                  const row = document.createElement('tr');
                  row.className = 'read-' + notification.read;
                  row.innerHTML = \`
                    <td>\${notification.id}</td>
                    <td>\${notification.type}</td>
                    <td>\${notification.message}</td>
                    <td>\${notification.read ? 'Yes' : 'No'}</td>
                    <td>\${new Date(notification.createdAt).toLocaleString()}</td>
                  \`;
                  tableBody.appendChild(row);
                });
              })
              .catch(error => {
                console.error('Error fetching notifications:', error);
                document.getElementById('error').textContent = 'Error fetching notifications: ' + error.message;
              });
          };
        </script>
      </head>
      <body>
        <div class="back"><a href="/">← Back to Home</a></div>
        <h1>Notifications Dashboard</h1>
        <div id="error" style="color: red;"></div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Message</th>
              <th>Read</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody id="notificationsTable">
            <!-- Data will be loaded here -->
          </tbody>
        </table>
      </body>
    </html>
  `);
});

// API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SpendSync API'
}));

// Authentication middleware
app.use(authenticate);

// API routes
app.use('/api/v1', routes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || 500;
  const errorResponse = err.toJSON ? err.toJSON() : {
    error: {
      message: err.message,
      status: statusCode
    }
  };
  res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.path}`,
      status: 404
    }
  });
});

// Start server
if (!module.parent) {
  const server = app.listen(config.port, () => {
    console.log(`API Gateway listening on port ${config.port}`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

module.exports = app;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJleHByZXNzIiwicmVxdWlyZSIsIm1vcmdhbiIsImhlbG1ldCIsImNvcnMiLCJyYXRlTGltaXQiLCJzd2FnZ2VyVWkiLCJzd2FnZ2VyRG9jdW1lbnQiLCJjb25maWciLCJhdXRoZW50aWNhdGUiLCJyb3V0ZXMiLCJhcHAiLCJ1c2UiLCJjb250ZW50U2VjdXJpdHlQb2xpY3kiLCJkaXJlY3RpdmVzIiwiZ2V0RGVmYXVsdERpcmVjdGl2ZXMiLCJsb2dnaW5nIiwibGV2ZWwiLCJqc29uIiwidXJsZW5jb2RlZCIsImV4dGVuZGVkIiwiZ2V0IiwicmVxIiwicmVzIiwic3RhdHVzIiwidGltZXN0YW1wIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwidmVyc2lvbiIsInByb2Nlc3MiLCJlbnYiLCJucG1fcGFja2FnZV92ZXJzaW9uIiwic2VuZCIsInNlcnZlIiwic2V0dXAiLCJjdXN0b21Dc3MiLCJjdXN0b21TaXRlVGl0bGUiLCJlcnIiLCJuZXh0IiwiY29uc29sZSIsImVycm9yIiwic3RhdHVzQ29kZSIsImVycm9yUmVzcG9uc2UiLCJ0b0pTT04iLCJtZXNzYWdlIiwibWV0aG9kIiwicGF0aCIsIm1vZHVsZSIsInBhcmVudCIsInNlcnZlciIsImxpc3RlbiIsInBvcnQiLCJsb2ciLCJvbiIsImNsb3NlIiwiZXhwb3J0cyJdLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9hcGktZ2F0ZXdheS9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFQSSBHYXRld2F5XG4gKiBcbiAqIE1haW4gZW50cnkgcG9pbnQgZm9yIHRoZSBBUEkgR2F0ZXdheSB0aGF0IHJvdXRlcyByZXF1ZXN0cyB0byB0aGUgYXBwcm9wcmlhdGUgc2VydmljZXNcbiAqL1xuXG5jb25zdCBleHByZXNzID0gcmVxdWlyZSgnZXhwcmVzcycpO1xuY29uc3QgbW9yZ2FuID0gcmVxdWlyZSgnbW9yZ2FuJyk7XG5jb25zdCBoZWxtZXQgPSByZXF1aXJlKCdoZWxtZXQnKTtcbmNvbnN0IGNvcnMgPSByZXF1aXJlKCdjb3JzJyk7XG5jb25zdCByYXRlTGltaXQgPSByZXF1aXJlKCdleHByZXNzLXJhdGUtbGltaXQnKTtcbmNvbnN0IHN3YWdnZXJVaSA9IHJlcXVpcmUoJ3N3YWdnZXItdWktZXhwcmVzcycpO1xuY29uc3Qgc3dhZ2dlckRvY3VtZW50ID0gcmVxdWlyZSgnLi9zd2FnZ2VyLmpzb24nKTtcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG5jb25zdCB7IGF1dGhlbnRpY2F0ZSB9ID0gcmVxdWlyZSgnLi9taWRkbGV3YXJlL2F1dGgubWlkZGxld2FyZScpO1xuY29uc3Qgcm91dGVzID0gcmVxdWlyZSgnLi9yb3V0ZXMnKTtcblxuLy8gQ3JlYXRlIEV4cHJlc3MgYXBwXG5jb25zdCBhcHAgPSBleHByZXNzKCk7XG5cbi8vIEFwcGx5IHNlY3VyaXR5IGhlYWRlcnNcbmFwcC51c2UoaGVsbWV0KHtcbiAgY29udGVudFNlY3VyaXR5UG9saWN5OiB7XG4gICAgZGlyZWN0aXZlczoge1xuICAgICAgLi4uaGVsbWV0LmNvbnRlbnRTZWN1cml0eVBvbGljeS5nZXREZWZhdWx0RGlyZWN0aXZlcygpLFxuICAgICAgJ2ltZy1zcmMnOiBbXCInc2VsZidcIiwgJ2RhdGE6J10sXG4gICAgICAnc2NyaXB0LXNyYyc6IFtcIidzZWxmJ1wiLCBcIid1bnNhZmUtaW5saW5lJ1wiXSxcbiAgICAgICdzdHlsZS1zcmMnOiBbXCInc2VsZidcIiwgXCIndW5zYWZlLWlubGluZSdcIl1cbiAgICB9XG4gIH1cbn0pKTtcblxuLy8gRW5hYmxlIENPUlNcbmFwcC51c2UoY29ycyhjb25maWcuY29ycykpO1xuXG4vLyBSZXF1ZXN0IGxvZ2dpbmdcbmFwcC51c2UobW9yZ2FuKGNvbmZpZy5sb2dnaW5nLmxldmVsID09PSAnZGVidWcnID8gJ2RldicgOiAnY29tYmluZWQnKSk7XG5cbi8vIFJhdGUgbGltaXRpbmdcbmFwcC51c2UocmF0ZUxpbWl0KGNvbmZpZy5yYXRlTGltaXQpKTtcblxuLy8gQm9keSBwYXJzaW5nXG5hcHAudXNlKGV4cHJlc3MuanNvbigpKTtcbmFwcC51c2UoZXhwcmVzcy51cmxlbmNvZGVkKHsgZXh0ZW5kZWQ6IHRydWUgfSkpO1xuXG4vLyBIZWFsdGggY2hlY2sgZW5kcG9pbnRcbmFwcC5nZXQoJy9oZWFsdGgnLCAocmVxLCByZXMpID0+IHtcbiAgcmVzLnN0YXR1cygyMDApLmpzb24oe1xuICAgIHN0YXR1czogJ1VQJyxcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICB2ZXJzaW9uOiBwcm9jZXNzLmVudi5ucG1fcGFja2FnZV92ZXJzaW9uIHx8ICd1bmtub3duJ1xuICB9KTtcbn0pO1xuXG4vLyBIb21lcGFnZVxuYXBwLmdldCgnLycsIChyZXEsIHJlcykgPT4ge1xuICByZXMuc2VuZChgXG4gICAgPGh0bWw+XG4gICAgICA8aGVhZD5cbiAgICAgICAgPHRpdGxlPlNwZW5kU3luYyBBUEkgR2F0ZXdheTwvdGl0bGU+XG4gICAgICAgIDxzdHlsZT5cbiAgICAgICAgICBib2R5IHsgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOyBsaW5lLWhlaWdodDogMS42OyBtYXJnaW46IDQwcHg7IH1cbiAgICAgICAgICBoMSB7IGNvbG9yOiAjMzMzOyB9XG4gICAgICAgICAgLnNlcnZpY2UgeyBtYXJnaW4tYm90dG9tOiAyMHB4OyBwYWRkaW5nOiAxMHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkOyBib3JkZXItcmFkaXVzOiA1cHg7IH1cbiAgICAgICAgICAuc2VydmljZSBoMiB7IG1hcmdpbi10b3A6IDA7IH1cbiAgICAgICAgICBhIHsgY29sb3I6ICMwMDY2Y2M7IHRleHQtZGVjb3JhdGlvbjogbm9uZTsgfVxuICAgICAgICAgIGE6aG92ZXIgeyB0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTsgfVxuICAgICAgICA8L3N0eWxlPlxuICAgICAgPC9oZWFkPlxuICAgICAgPGJvZHk+XG4gICAgICAgIDxoMT5TcGVuZFN5bmMgQVBJIEdhdGV3YXk8L2gxPlxuICAgICAgICA8cD5XZWxjb21lIHRvIHRoZSBTcGVuZFN5bmMgQVBJIEdhdGV3YXkuIFRoZSBmb2xsb3dpbmcgc2VydmljZXMgYXJlIGF2YWlsYWJsZTo8L3A+XG4gICAgICAgIFxuICAgICAgICA8ZGl2IGNsYXNzPVwic2VydmljZVwiPlxuICAgICAgICAgIDxoMj5BUEkgRG9jdW1lbnRhdGlvbjwvaDI+XG4gICAgICAgICAgPGEgaHJlZj1cIi9hcGktZG9jc1wiPlN3YWdnZXIgQVBJIERvY3VtZW50YXRpb248L2E+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICBcbiAgICAgICAgPGRpdiBjbGFzcz1cInNlcnZpY2VcIj5cbiAgICAgICAgICA8aDI+VXNlciBTZXJ2aWNlPC9oMj5cbiAgICAgICAgICA8cD5NYW5hZ2VzIHVzZXJzIGFuZCBncm91cHM8L3A+XG4gICAgICAgICAgPGEgaHJlZj1cIi91c2Vycy11aVwiPlZpZXcgVXNlcnMgRGFzaGJvYXJkPC9hPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJzZXJ2aWNlXCI+XG4gICAgICAgICAgPGgyPkV4cGVuc2UgU2VydmljZTwvaDI+XG4gICAgICAgICAgPHA+TWFuYWdlcyBleHBlbnNlczwvcD5cbiAgICAgICAgICA8YSBocmVmPVwiL2V4cGVuc2VzLXVpXCI+VmlldyBFeHBlbnNlcyBEYXNoYm9hcmQ8L2E+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICBcbiAgICAgICAgPGRpdiBjbGFzcz1cInNlcnZpY2VcIj5cbiAgICAgICAgICA8aDI+U2V0dGxlbWVudCBTZXJ2aWNlPC9oMj5cbiAgICAgICAgICA8cD5NYW5hZ2VzIHNldHRsZW1lbnRzPC9wPlxuICAgICAgICAgIDxhIGhyZWY9XCIvc2V0dGxlbWVudHMtdWlcIj5WaWV3IFNldHRsZW1lbnRzIERhc2hib2FyZDwvYT5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIFxuICAgICAgICA8ZGl2IGNsYXNzPVwic2VydmljZVwiPlxuICAgICAgICAgIDxoMj5Ob3RpZmljYXRpb24gU2VydmljZTwvaDI+XG4gICAgICAgICAgPHA+TWFuYWdlcyBub3RpZmljYXRpb25zPC9wPlxuICAgICAgICAgIDxhIGhyZWY9XCIvbm90aWZpY2F0aW9ucy11aVwiPlZpZXcgTm90aWZpY2F0aW9ucyBEYXNoYm9hcmQ8L2E+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICBcbiAgICAgICAgPGRpdiBjbGFzcz1cInNlcnZpY2VcIj5cbiAgICAgICAgICA8aDI+SGVhbHRoIENoZWNrPC9oMj5cbiAgICAgICAgICA8YSBocmVmPVwiL2hlYWx0aFwiPkFQSSBHYXRld2F5IEhlYWx0aDwvYT5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2JvZHk+XG4gICAgPC9odG1sPlxuICBgKTtcbn0pO1xuXG4vLyBVSSBwYWdlcyBmb3IgZGlmZmVyZW50IHNlcnZpY2VzXG5hcHAuZ2V0KCcvdXNlcnMtdWknLCAocmVxLCByZXMpID0+IHtcbiAgcmVzLnNlbmQoYFxuICAgIDxodG1sPlxuICAgICAgPGhlYWQ+XG4gICAgICAgIDx0aXRsZT5TcGVuZFN5bmMgLSBVc2VycyBEYXNoYm9hcmQ8L3RpdGxlPlxuICAgICAgICA8c3R5bGU+XG4gICAgICAgICAgYm9keSB7IGZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjsgbGluZS1oZWlnaHQ6IDEuNjsgbWFyZ2luOiA0MHB4OyB9XG4gICAgICAgICAgaDEgeyBjb2xvcjogIzMzMzsgfVxuICAgICAgICAgIHRhYmxlIHsgYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTsgd2lkdGg6IDEwMCU7IH1cbiAgICAgICAgICB0aCwgdGQgeyBib3JkZXI6IDFweCBzb2xpZCAjZGRkOyBwYWRkaW5nOiA4cHg7IHRleHQtYWxpZ246IGxlZnQ7IH1cbiAgICAgICAgICB0aCB7IGJhY2tncm91bmQtY29sb3I6ICNmMmYyZjI7IH1cbiAgICAgICAgICAuYmFjayB7IG1hcmdpbi1ib3R0b206IDIwcHg7IH1cbiAgICAgICAgPC9zdHlsZT5cbiAgICAgICAgPHNjcmlwdD5cbiAgICAgICAgICB3aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmZXRjaCgnL2FwaS92MS91c2VycycpXG4gICAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHJlc3BvbnNlLmpzb24oKSlcbiAgICAgICAgICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFibGVCb2R5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3VzZXJzVGFibGUnKTtcbiAgICAgICAgICAgICAgICBkYXRhLnVzZXJzLmZvckVhY2godXNlciA9PiB7XG4gICAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0cicpO1xuICAgICAgICAgICAgICAgICAgcm93LmlubmVySFRNTCA9IFxcYFxuICAgICAgICAgICAgICAgICAgICA8dGQ+XFwke3VzZXIuaWR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxcJHt1c2VyLnVzZXJuYW1lfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cXCR7dXNlci5lbWFpbH08L3RkPlxuICAgICAgICAgICAgICAgICAgXFxgO1xuICAgICAgICAgICAgICAgICAgdGFibGVCb2R5LmFwcGVuZENoaWxkKHJvdyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgdXNlcnM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvcicpLnRleHRDb250ZW50ID0gJ0Vycm9yIGZldGNoaW5nIHVzZXJzOiAnICsgZXJyb3IubWVzc2FnZTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgPC9zY3JpcHQ+XG4gICAgICA8L2hlYWQ+XG4gICAgICA8Ym9keT5cbiAgICAgICAgPGRpdiBjbGFzcz1cImJhY2tcIj48YSBocmVmPVwiL1wiPuKGkCBCYWNrIHRvIEhvbWU8L2E+PC9kaXY+XG4gICAgICAgIDxoMT5Vc2VycyBEYXNoYm9hcmQ8L2gxPlxuICAgICAgICA8ZGl2IGlkPVwiZXJyb3JcIiBzdHlsZT1cImNvbG9yOiByZWQ7XCI+PC9kaXY+XG4gICAgICAgIDx0YWJsZT5cbiAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgIDx0aD5JRDwvdGg+XG4gICAgICAgICAgICAgIDx0aD5Vc2VybmFtZTwvdGg+XG4gICAgICAgICAgICAgIDx0aD5FbWFpbDwvdGg+XG4gICAgICAgICAgICA8L3RyPlxuICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgPHRib2R5IGlkPVwidXNlcnNUYWJsZVwiPlxuICAgICAgICAgICAgPCEtLSBEYXRhIHdpbGwgYmUgbG9hZGVkIGhlcmUgLS0+XG4gICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgPC90YWJsZT5cbiAgICAgIDwvYm9keT5cbiAgICA8L2h0bWw+XG4gIGApO1xufSk7XG5cbmFwcC5nZXQoJy9leHBlbnNlcy11aScsIChyZXEsIHJlcykgPT4ge1xuICByZXMuc2VuZChgXG4gICAgPGh0bWw+XG4gICAgICA8aGVhZD5cbiAgICAgICAgPHRpdGxlPlNwZW5kU3luYyAtIEV4cGVuc2VzIERhc2hib2FyZDwvdGl0bGU+XG4gICAgICAgIDxzdHlsZT5cbiAgICAgICAgICBib2R5IHsgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOyBsaW5lLWhlaWdodDogMS42OyBtYXJnaW46IDQwcHg7IH1cbiAgICAgICAgICBoMSB7IGNvbG9yOiAjMzMzOyB9XG4gICAgICAgICAgdGFibGUgeyBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlOyB3aWR0aDogMTAwJTsgfVxuICAgICAgICAgIHRoLCB0ZCB7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7IHBhZGRpbmc6IDhweDsgdGV4dC1hbGlnbjogbGVmdDsgfVxuICAgICAgICAgIHRoIHsgYmFja2dyb3VuZC1jb2xvcjogI2YyZjJmMjsgfVxuICAgICAgICAgIC5iYWNrIHsgbWFyZ2luLWJvdHRvbTogMjBweDsgfVxuICAgICAgICA8L3N0eWxlPlxuICAgICAgICA8c2NyaXB0PlxuICAgICAgICAgIHdpbmRvdy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZldGNoKCcvYXBpL3YxL2V4cGVuc2VzJylcbiAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuICAgICAgICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJsZUJvZHkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXhwZW5zZXNUYWJsZScpO1xuICAgICAgICAgICAgICAgIGRhdGEuZXhwZW5zZXMuZm9yRWFjaChleHBlbnNlID0+IHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgICAgICAgICAgICAgICByb3cuaW5uZXJIVE1MID0gXFxgXG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cXCR7ZXhwZW5zZS5pZH08L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+XFwke2V4cGVuc2UuZGVzY3JpcHRpb259PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxcJHtleHBlbnNlLmFtb3VudH0gXFwke2V4cGVuc2UuY3VycmVuY3l9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxcJHtleHBlbnNlLnBheWVySWR9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxcJHtleHBlbnNlLnBhcnRpY2lwYW50SWRzLmpvaW4oJywgJyl9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxcJHtuZXcgRGF0ZShleHBlbnNlLmNyZWF0ZWRBdCkudG9Mb2NhbGVTdHJpbmcoKX08L3RkPlxuICAgICAgICAgICAgICAgICAgXFxgO1xuICAgICAgICAgICAgICAgICAgdGFibGVCb2R5LmFwcGVuZENoaWxkKHJvdyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgZXhwZW5zZXM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvcicpLnRleHRDb250ZW50ID0gJ0Vycm9yIGZldGNoaW5nIGV4cGVuc2VzOiAnICsgZXJyb3IubWVzc2FnZTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfTtcbiAgICAgICAgPC9zY3JpcHQ+XG4gICAgICA8L2hlYWQ+XG4gICAgICA8Ym9keT5cbiAgICAgICAgPGRpdiBjbGFzcz1cImJhY2tcIj48YSBocmVmPVwiL1wiPuKGkCBCYWNrIHRvIEhvbWU8L2E+PC9kaXY+XG4gICAgICAgIDxoMT5FeHBlbnNlcyBEYXNoYm9hcmQ8L2gxPlxuICAgICAgICA8ZGl2IGlkPVwiZXJyb3JcIiBzdHlsZT1cImNvbG9yOiByZWQ7XCI+PC9kaXY+XG4gICAgICAgIDx0YWJsZT5cbiAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgIDx0aD5JRDwvdGg+XG4gICAgICAgICAgICAgIDx0aD5EZXNjcmlwdGlvbjwvdGg+XG4gICAgICAgICAgICAgIDx0aD5BbW91bnQ8L3RoPlxuICAgICAgICAgICAgICA8dGg+UGFpZCBCeTwvdGg+XG4gICAgICAgICAgICAgIDx0aD5QYXJ0aWNpcGFudHM8L3RoPlxuICAgICAgICAgICAgICA8dGg+RGF0ZTwvdGg+XG4gICAgICAgICAgICA8L3RyPlxuICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgPHRib2R5IGlkPVwiZXhwZW5zZXNUYWJsZVwiPlxuICAgICAgICAgICAgPCEtLSBEYXRhIHdpbGwgYmUgbG9hZGVkIGhlcmUgLS0+XG4gICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgPC90YWJsZT5cbiAgICAgIDwvYm9keT5cbiAgICA8L2h0bWw+XG4gIGApO1xufSk7XG5cbmFwcC5nZXQoJy9zZXR0bGVtZW50cy11aScsIChyZXEsIHJlcykgPT4ge1xuICByZXMuc2VuZChgXG4gICAgPGh0bWw+XG4gICAgICA8aGVhZD5cbiAgICAgICAgPHRpdGxlPlNwZW5kU3luYyAtIFNldHRsZW1lbnRzIERhc2hib2FyZDwvdGl0bGU+XG4gICAgICAgIDxzdHlsZT5cbiAgICAgICAgICBib2R5IHsgZm9udC1mYW1pbHk6IEFyaWFsLCBzYW5zLXNlcmlmOyBsaW5lLWhlaWdodDogMS42OyBtYXJnaW46IDQwcHg7IH1cbiAgICAgICAgICBoMSB7IGNvbG9yOiAjMzMzOyB9XG4gICAgICAgICAgdGFibGUgeyBib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlOyB3aWR0aDogMTAwJTsgfVxuICAgICAgICAgIHRoLCB0ZCB7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7IHBhZGRpbmc6IDhweDsgdGV4dC1hbGlnbjogbGVmdDsgfVxuICAgICAgICAgIHRoIHsgYmFja2dyb3VuZC1jb2xvcjogI2YyZjJmMjsgfVxuICAgICAgICAgIC5iYWNrIHsgbWFyZ2luLWJvdHRvbTogMjBweDsgfVxuICAgICAgICAgIC5zdGF0dXMtcGVuZGluZyB7IGNvbG9yOiBvcmFuZ2U7IH1cbiAgICAgICAgICAuc3RhdHVzLWNvbXBsZXRlZCB7IGNvbG9yOiBncmVlbjsgfVxuICAgICAgICAgIC5zdGF0dXMtY2FuY2VsbGVkIHsgY29sb3I6IHJlZDsgfVxuICAgICAgICAgIC5idXR0b24tY29udGFpbmVyIHsgbWFyZ2luOiAyMHB4IDA7IH1cbiAgICAgICAgICAuYnV0dG9uIHtcbiAgICAgICAgICAgIHBhZGRpbmc6IDEwcHggMTVweDtcbiAgICAgICAgICAgIGJhY2tncm91bmQtY29sb3I6ICMwMDY2Y2M7XG4gICAgICAgICAgICBjb2xvcjogd2hpdGU7XG4gICAgICAgICAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7XG4gICAgICAgICAgICBib3JkZXItcmFkaXVzOiA0cHg7XG4gICAgICAgICAgICBtYXJnaW4tcmlnaHQ6IDEwcHg7XG4gICAgICAgICAgfVxuICAgICAgICAgIC5idXR0b246aG92ZXIge1xuICAgICAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzAwNTJhMztcbiAgICAgICAgICB9XG4gICAgICAgIDwvc3R5bGU+XG4gICAgICAgIDxzY3JpcHQ+XG4gICAgICAgICAgd2luZG93Lm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZmV0Y2goJy9hcGkvdjEvc2V0dGxlbWVudHMnKVxuICAgICAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiByZXNwb25zZS5qc29uKCkpXG4gICAgICAgICAgICAgIC50aGVuKGRhdGEgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhYmxlQm9keSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzZXR0bGVtZW50c1RhYmxlJyk7XG4gICAgICAgICAgICAgICAgZGF0YS5zZXR0bGVtZW50cy5mb3JFYWNoKHNldHRsZW1lbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndHInKTtcbiAgICAgICAgICAgICAgICAgIHJvdy5pbm5lckhUTUwgPSBcXGBcbiAgICAgICAgICAgICAgICAgICAgPHRkPlxcJHtzZXR0bGVtZW50LmlkfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cXCR7c2V0dGxlbWVudC5wYXllcklkfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cXCR7c2V0dGxlbWVudC5yZWNlaXZlcklkfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cXCR7c2V0dGxlbWVudC5hbW91bnR9IFxcJHtzZXR0bGVtZW50LmN1cnJlbmN5fTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInN0YXR1cy1cXCR7c2V0dGxlbWVudC5zdGF0dXN9XCI+XFwke3NldHRsZW1lbnQuc3RhdHVzfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cXCR7bmV3IERhdGUoc2V0dGxlbWVudC5jcmVhdGVkQXQpLnRvTG9jYWxlU3RyaW5nKCl9PC90ZD5cbiAgICAgICAgICAgICAgICAgIFxcYDtcbiAgICAgICAgICAgICAgICAgIHRhYmxlQm9keS5hcHBlbmRDaGlsZChyb3cpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIHNldHRsZW1lbnRzOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZXJyb3InKS50ZXh0Q29udGVudCA9ICdFcnJvciBmZXRjaGluZyBzZXR0bGVtZW50czogJyArIGVycm9yLm1lc3NhZ2U7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH07XG4gICAgICAgIDwvc2NyaXB0PlxuICAgICAgPC9oZWFkPlxuICAgICAgPGJvZHk+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJiYWNrXCI+PGEgaHJlZj1cIi9cIj7ihpAgQmFjayB0byBIb21lPC9hPjwvZGl2PlxuICAgICAgICA8aDE+U2V0dGxlbWVudHMgRGFzaGJvYXJkPC9oMT5cbiAgICAgICAgXG4gICAgICAgIDxkaXYgY2xhc3M9XCJidXR0b24tY29udGFpbmVyXCI+XG4gICAgICAgICAgPGEgaHJlZj1cImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMy9jYWxjdWxhdGlvbi9ncm91cDFcIiBjbGFzcz1cImJ1dHRvblwiPlZpZXcgQ2FsY3VsYXRpb24gRGV0YWlsczwvYT5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIFxuICAgICAgICA8ZGl2IGlkPVwiZXJyb3JcIiBzdHlsZT1cImNvbG9yOiByZWQ7XCI+PC9kaXY+XG4gICAgICAgIDx0YWJsZT5cbiAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgIDx0aD5JRDwvdGg+XG4gICAgICAgICAgICAgIDx0aD5QYXllcjwvdGg+XG4gICAgICAgICAgICAgIDx0aD5SZWNlaXZlcjwvdGg+XG4gICAgICAgICAgICAgIDx0aD5BbW91bnQ8L3RoPlxuICAgICAgICAgICAgICA8dGg+U3RhdHVzPC90aD5cbiAgICAgICAgICAgICAgPHRoPkNyZWF0ZWQ8L3RoPlxuICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgIDx0Ym9keSBpZD1cInNldHRsZW1lbnRzVGFibGVcIj5cbiAgICAgICAgICAgIDwhLS0gRGF0YSB3aWxsIGJlIGxvYWRlZCBoZXJlIC0tPlxuICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgIDwvdGFibGU+XG4gICAgICA8L2JvZHk+XG4gICAgPC9odG1sPlxuICBgKTtcbn0pO1xuXG5hcHAuZ2V0KCcvbm90aWZpY2F0aW9ucy11aScsIChyZXEsIHJlcykgPT4ge1xuICByZXMuc2VuZChgXG4gICAgPGh0bWw+XG4gICAgICA8aGVhZD5cbiAgICAgICAgPHRpdGxlPlNwZW5kU3luYyAtIE5vdGlmaWNhdGlvbnMgRGFzaGJvYXJkPC90aXRsZT5cbiAgICAgICAgPHN0eWxlPlxuICAgICAgICAgIGJvZHkgeyBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7IGxpbmUtaGVpZ2h0OiAxLjY7IG1hcmdpbjogNDBweDsgfVxuICAgICAgICAgIGgxIHsgY29sb3I6ICMzMzM7IH1cbiAgICAgICAgICB0YWJsZSB7IGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7IHdpZHRoOiAxMDAlOyB9XG4gICAgICAgICAgdGgsIHRkIHsgYm9yZGVyOiAxcHggc29saWQgI2RkZDsgcGFkZGluZzogOHB4OyB0ZXh0LWFsaWduOiBsZWZ0OyB9XG4gICAgICAgICAgdGggeyBiYWNrZ3JvdW5kLWNvbG9yOiAjZjJmMmYyOyB9XG4gICAgICAgICAgLmJhY2sgeyBtYXJnaW4tYm90dG9tOiAyMHB4OyB9XG4gICAgICAgICAgLnJlYWQtdHJ1ZSB7IG9wYWNpdHk6IDAuNzsgfVxuICAgICAgICAgIC5yZWFkLWZhbHNlIHsgZm9udC13ZWlnaHQ6IGJvbGQ7IH1cbiAgICAgICAgPC9zdHlsZT5cbiAgICAgICAgPHNjcmlwdD5cbiAgICAgICAgICB3aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmZXRjaCgnL2FwaS92MS9ub3RpZmljYXRpb25zJylcbiAgICAgICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzcG9uc2UuanNvbigpKVxuICAgICAgICAgICAgICAudGhlbihkYXRhID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJsZUJvZHkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbm90aWZpY2F0aW9uc1RhYmxlJyk7XG4gICAgICAgICAgICAgICAgZGF0YS5ub3RpZmljYXRpb25zLmZvckVhY2gobm90aWZpY2F0aW9uID0+IHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RyJyk7XG4gICAgICAgICAgICAgICAgICByb3cuY2xhc3NOYW1lID0gJ3JlYWQtJyArIG5vdGlmaWNhdGlvbi5yZWFkO1xuICAgICAgICAgICAgICAgICAgcm93LmlubmVySFRNTCA9IFxcYFxuICAgICAgICAgICAgICAgICAgICA8dGQ+XFwke25vdGlmaWNhdGlvbi5pZH08L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+XFwke25vdGlmaWNhdGlvbi50eXBlfTwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cXCR7bm90aWZpY2F0aW9uLm1lc3NhZ2V9PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxcJHtub3RpZmljYXRpb24ucmVhZCA/ICdZZXMnIDogJ05vJ308L3RkPlxuICAgICAgICAgICAgICAgICAgICA8dGQ+XFwke25ldyBEYXRlKG5vdGlmaWNhdGlvbi5jcmVhdGVkQXQpLnRvTG9jYWxlU3RyaW5nKCl9PC90ZD5cbiAgICAgICAgICAgICAgICAgIFxcYDtcbiAgICAgICAgICAgICAgICAgIHRhYmxlQm9keS5hcHBlbmRDaGlsZChyb3cpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIG5vdGlmaWNhdGlvbnM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlcnJvcicpLnRleHRDb250ZW50ID0gJ0Vycm9yIGZldGNoaW5nIG5vdGlmaWNhdGlvbnM6ICcgKyBlcnJvci5tZXNzYWdlO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuICAgICAgICA8L3NjcmlwdD5cbiAgICAgIDwvaGVhZD5cbiAgICAgIDxib2R5PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmFja1wiPjxhIGhyZWY9XCIvXCI+4oaQIEJhY2sgdG8gSG9tZTwvYT48L2Rpdj5cbiAgICAgICAgPGgxPk5vdGlmaWNhdGlvbnMgRGFzaGJvYXJkPC9oMT5cbiAgICAgICAgPGRpdiBpZD1cImVycm9yXCIgc3R5bGU9XCJjb2xvcjogcmVkO1wiPjwvZGl2PlxuICAgICAgICA8dGFibGU+XG4gICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICA8dGg+SUQ8L3RoPlxuICAgICAgICAgICAgICA8dGg+VHlwZTwvdGg+XG4gICAgICAgICAgICAgIDx0aD5NZXNzYWdlPC90aD5cbiAgICAgICAgICAgICAgPHRoPlJlYWQ8L3RoPlxuICAgICAgICAgICAgICA8dGg+VGltZTwvdGg+XG4gICAgICAgICAgICA8L3RyPlxuICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgPHRib2R5IGlkPVwibm90aWZpY2F0aW9uc1RhYmxlXCI+XG4gICAgICAgICAgICA8IS0tIERhdGEgd2lsbCBiZSBsb2FkZWQgaGVyZSAtLT5cbiAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICA8L3RhYmxlPlxuICAgICAgPC9ib2R5PlxuICAgIDwvaHRtbD5cbiAgYCk7XG59KTtcblxuLy8gQVBJIGRvY3VtZW50YXRpb25cbmFwcC51c2UoJy9hcGktZG9jcycsIHN3YWdnZXJVaS5zZXJ2ZSwgc3dhZ2dlclVpLnNldHVwKHN3YWdnZXJEb2N1bWVudCwge1xuICBjdXN0b21Dc3M6ICcuc3dhZ2dlci11aSAudG9wYmFyIHsgZGlzcGxheTogbm9uZSB9JyxcbiAgY3VzdG9tU2l0ZVRpdGxlOiAnU3BlbmRTeW5jIEFQSSdcbn0pKTtcblxuLy8gQXV0aGVudGljYXRpb24gbWlkZGxld2FyZVxuYXBwLnVzZShhdXRoZW50aWNhdGUpO1xuXG4vLyBBUEkgcm91dGVzXG5hcHAudXNlKCcvYXBpL3YxJywgcm91dGVzKTtcblxuLy8gRXJyb3IgaGFuZGxlclxuYXBwLnVzZSgoZXJyLCByZXEsIHJlcywgbmV4dCkgPT4ge1xuICBjb25zb2xlLmVycm9yKGVycik7XG4gIGNvbnN0IHN0YXR1c0NvZGUgPSBlcnIuc3RhdHVzQ29kZSB8fCA1MDA7XG4gIGNvbnN0IGVycm9yUmVzcG9uc2UgPSBlcnIudG9KU09OID8gZXJyLnRvSlNPTigpIDoge1xuICAgIGVycm9yOiB7XG4gICAgICBtZXNzYWdlOiBlcnIubWVzc2FnZSxcbiAgICAgIHN0YXR1czogc3RhdHVzQ29kZVxuICAgIH1cbiAgfTtcbiAgcmVzLnN0YXR1cyhzdGF0dXNDb2RlKS5qc29uKGVycm9yUmVzcG9uc2UpO1xufSk7XG5cbi8vIDQwNCBoYW5kbGVyXG5hcHAudXNlKChyZXEsIHJlcykgPT4ge1xuICByZXMuc3RhdHVzKDQwNCkuanNvbih7XG4gICAgZXJyb3I6IHtcbiAgICAgIG1lc3NhZ2U6IGBSb3V0ZSBub3QgZm91bmQ6ICR7cmVxLm1ldGhvZH0gJHtyZXEucGF0aH1gLFxuICAgICAgc3RhdHVzOiA0MDRcbiAgICB9XG4gIH0pO1xufSk7XG5cbi8vIFN0YXJ0IHNlcnZlclxuaWYgKCFtb2R1bGUucGFyZW50KSB7XG4gIGNvbnN0IHNlcnZlciA9IGFwcC5saXN0ZW4oY29uZmlnLnBvcnQsICgpID0+IHtcbiAgICBjb25zb2xlLmxvZyhgQVBJIEdhdGV3YXkgbGlzdGVuaW5nIG9uIHBvcnQgJHtjb25maWcucG9ydH1gKTtcbiAgfSk7XG5cbiAgLy8gSGFuZGxlIGdyYWNlZnVsIHNodXRkb3duXG4gIHByb2Nlc3Mub24oJ1NJR1RFUk0nLCAoKSA9PiB7XG4gICAgY29uc29sZS5sb2coJ1NJR1RFUk0gc2lnbmFsIHJlY2VpdmVkOiBjbG9zaW5nIEhUVFAgc2VydmVyJyk7XG4gICAgc2VydmVyLmNsb3NlKCgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdIVFRQIHNlcnZlciBjbG9zZWQnKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYXBwOyAiXSwibWFwcGluZ3MiOiJjQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsTUFBTUEsT0FBTyxHQUFHQyxPQUFPLENBQUMsU0FBUyxDQUFDO0FBQ2xDLE1BQU1DLE1BQU0sR0FBR0QsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUNoQyxNQUFNRSxNQUFNLEdBQUdGLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDaEMsTUFBTUcsSUFBSSxHQUFHSCxPQUFPLENBQUMsTUFBTSxDQUFDO0FBQzVCLE1BQU1JLFNBQVMsR0FBR0osT0FBTyxDQUFDLG9CQUFvQixDQUFDO0FBQy9DLE1BQU1LLFNBQVMsR0FBR0wsT0FBTyxDQUFDLG9CQUFvQixDQUFDO0FBQy9DLE1BQU1NLGVBQWUsR0FBR04sT0FBTyxDQUFDLGdCQUFnQixDQUFDO0FBQ2pELE1BQU1PLE1BQU0sR0FBR1AsT0FBTyxDQUFDLFVBQVUsQ0FBQztBQUNsQyxNQUFNLEVB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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUcsQ0FBQztBQUNKLENBQUMsQ0FBQzs7QUFFRnJCLEdBQUcsQ0FBQ1UsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDQyxHQUFHLEVBQUVDLEdBQUcsS0FBSztFQUNwQ0EsR0FBRyxDQUFDUyxJQUFJLENBQUM7QUFDWDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUcsQ0FBQztBQUNKLENBQUMsQ0FBQzs7QUFFRnJCLEdBQUcsQ0FBQ1UsR0FBRyxDQUFDLGlCQUFpQixFQUFFLENBQUNDLEdBQUcsRUFBRUMsR0FBRyxLQUFLO0VBQ3ZDQSxHQUFHLENBQUNTLElBQUksQ0FBQztBQUNYO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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