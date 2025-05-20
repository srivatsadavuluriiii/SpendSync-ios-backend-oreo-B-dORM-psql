/**
 * Swagger Configuration Mock
 * 
 * This file provides mock Swagger UI setup for API documentation
 */

// Mock Swagger UI
const swaggerUi = {
  serve: (req, res, next) => next(),
  setup: (docs, options) => (req, res) => {
    res.send('Swagger UI Mock - API Documentation would be shown here in a real environment');
  }
};

// Mock Swagger docs
const swaggerDocs = {
  openapi: '3.0.0',
  info: {
    title: 'SpendSync Settlement Service API',
    version: '1.0.0',
    description: 'API for managing settlements between users'
  },
  paths: {
    '/api/v1/settlements': {
      get: {
        summary: 'Get all settlements',
        responses: {
          '200': {
            description: 'List of settlements'
          }
        }
      }
    }
  }
};

module.exports = {
  swaggerUi,
  swaggerDocs
}; 