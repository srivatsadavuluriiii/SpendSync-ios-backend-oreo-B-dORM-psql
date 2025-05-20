/**
 * Integration Test Setup for Jest
 * 
 * This file contains Jest-specific setup for integration tests
 */

const { setupDB, teardownDB, setupMockServices, teardownMocks } = require('./setup');

// Set test environment
process.env.NODE_ENV = 'test';
// Use test port
process.env.PORT = 0; // Let server pick a random port

// Global setup - runs before all tests
beforeAll(async () => {
  // Setup database
  await setupDB();
  // Setup mock services
  setupMockServices();
});

// Global teardown - runs after all tests
afterAll(async () => {
  // Clean up mocks
  teardownMocks();
  // Tear down database
  await teardownDB();
});

// Reset the state before each test
beforeEach(async () => {
  // This is where you would reset collections if needed
}); 