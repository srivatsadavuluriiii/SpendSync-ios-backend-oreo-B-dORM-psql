/**
 * Jest Configuration
 */

export default {
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // The root directory that Jest should scan for tests and modules
  rootDir: '.',
  
  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The glob patterns Jest uses to detect test files
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  
  // An array of regexp pattern strings that are matched against all test paths
  testPathIgnorePatterns: ['/node_modules/'],
  
  // An array of regexp pattern strings that are matched against all file paths before tests are executed
  transformIgnorePatterns: ['/node_modules/'],
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ['/node_modules/'],
  
  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ['text', 'lcov'],
  
  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',
  
  // An object that configures minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Display individual test results with the test suite hierarchy
  displayName: 'Settlement Service Tests'
}; 