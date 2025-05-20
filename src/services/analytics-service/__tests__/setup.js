import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createLogger } from 'winston';
import { jest } from '@jest/globals';
import Redis from 'ioredis';

// Disable logging during tests
export const logger = createLogger({
  silent: true
});

// Setup MongoDB Memory Server
let mongoServer;

// Global test setup
export const setupTestDB = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
};

// Global test teardown
export const teardownTestDB = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

// Test data generators
export const generateTestExpenses = (count = 100) => {
  const expenses = [];
  const categories = ['food', 'transport', 'entertainment', 'utilities', 'shopping'];
  const startDate = new Date(2023, 0, 1);
  const endDate = new Date();

  for (let i = 0; i < count; i++) {
    expenses.push({
      userId: 'test-user-' + Math.floor(i / 10),
      category: categories[Math.floor(Math.random() * categories.length)],
      amount: Math.random() * 1000,
      timestamp: new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())),
      description: `Test expense ${i}`,
      eventType: 'EXPENSE_CREATED'
    });
  }
  return expenses;
};

// Performance test helpers
export const measureExecutionTime = async (fn) => {
  const start = process.hrtime();
  await fn();
  const [seconds, nanoseconds] = process.hrtime(start);
  return seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
};

// API test helpers
export const createTestServer = () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  return app;
};

// Mock data for different test scenarios
export const mockData = {
  regularSpending: generateTestExpenses(100),
  largeDataset: generateTestExpenses(10000),
  edgeCases: [
    {
      userId: 'test-user-edge',
      category: 'food',
      amount: 0,
      timestamp: new Date(),
      description: 'Zero amount expense',
      eventType: 'EXPENSE_CREATED'
    },
    {
      userId: 'test-user-edge',
      category: 'food',
      amount: 999999.99,
      timestamp: new Date(),
      description: 'Very large amount',
      eventType: 'EXPENSE_CREATED'
    }
  ]
};

// Performance thresholds
export const performanceThresholds = {
  queryTime: 1000, // milliseconds
  memoryUsage: 100 * 1024 * 1024, // 100MB
  responseTime: 200 // milliseconds
};

// Mock Redis
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    pipeline: jest.fn(),
    keys: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
    ping: jest.fn()
  };

  mockRedis.pipeline.mockReturnValue({
    setex: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([])
  });

  return jest.fn(() => mockRedis);
});

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock Prometheus client
jest.mock('prom-client', () => ({
  Histogram: jest.fn().mockImplementation(() => ({
    startTimer: jest.fn().mockReturnValue(jest.fn()),
    observe: jest.fn()
  })),
  Counter: jest.fn().mockImplementation(() => ({
    inc: jest.fn()
  })),
  Gauge: jest.fn().mockImplementation(() => ({
    set: jest.fn()
  })),
  collectDefaultMetrics: jest.fn()
}));

let mongod;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
});

// Clear database and mocks between tests
beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }

  // Clear all mocks
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from database
  await mongoose.disconnect();
  
  // Stop in-memory database
  if (mongod) {
    await mongod.stop();
  }
});

// Global test timeout
jest.setTimeout(30000); 