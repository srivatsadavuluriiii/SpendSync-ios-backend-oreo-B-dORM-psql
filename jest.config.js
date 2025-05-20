/**
 * Jest configuration for SpendSync microservices
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['jest-extended/all'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|js)',
    '**/?(*.)+(spec|test).(ts|js)',
    '**/tests/contracts/**/*.pact.test.js',
    '**/tests/pact/providers/**/*.provider.js'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.jsx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { 
          targets: { node: 'current' },
          modules: 'commonjs'
        }],
        '@babel/preset-typescript'
      ],
      plugins: [
        ['@babel/plugin-transform-runtime', {
          regenerator: true,
          helpers: true,
          corejs: false
        }],
        '@babel/plugin-proposal-class-properties',
        '@babel/plugin-proposal-private-methods',
        '@babel/plugin-proposal-private-property-in-object'
      ]
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@babel/runtime)/)'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/node_modules/**',
    '!src/**/dist/**',
    '!src/**/test/**'
  ],
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  verbose: true,
  // Set timeout for long-running tests
  testTimeout: 30000,
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Global variables available in all test files
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
      isolatedModules: true,
      useESM: true
    }
  },
  // Module name mapper for microservices
  moduleNameMapper: {
    '^@user-service/(.*)$': '<rootDir>/src/services/user-service/src/$1',
    '^@expense-service/(.*)$': '<rootDir>/src/services/expense-service/src/$1',
    '^@notification-service/(.*)$': '<rootDir>/src/services/notification-service/src/$1',
    '^@settlement-service/(.*)$': '<rootDir>/src/services/settlement-service/src/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1'
  }
}; 