/**
 * Jest Configuration for Integration Tests
 */

const baseConfig = require('../../jest.config');

module.exports = {
  ...baseConfig,
  testMatch: ['**/__tests__/**/*.integration.js', '**/*.integration.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  // Increase timeout for integration tests
  testTimeout: 30000,
  // Run tests sequentially in the current process
  runInBand: true,
  // Display individual test results
  verbose: true,
  // Integration tests setup file
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.integration.js'],
  // Display name
  displayName: 'Settlement Service Integration Tests'
}; 