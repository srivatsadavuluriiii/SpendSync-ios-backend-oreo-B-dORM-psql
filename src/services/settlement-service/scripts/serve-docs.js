/**
 * Documentation Server
 * 
 * This script serves the swagger documentation as static files
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

// Create express app
const app = express();
const PORT = process.env.PORT || 3030;

// Check if docs exist, if not generate them
const docsPath = path.join(__dirname, '../docs/swagger.json');
if (!fs.existsSync(docsPath)) {
  console.log('Documentation not found. Generating...');
  require('child_process').execSync('npm run docs', { stdio: 'inherit' });
}

// Load the swagger document
const swaggerDocument = require(docsPath);

// Serve the Swagger UI
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SpendSync API Documentation'
}));

// Start the server
app.listen(PORT, () => {
  console.log(`Documentation server running at http://localhost:${PORT}`);
}); 