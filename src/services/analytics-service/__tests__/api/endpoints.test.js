import request from 'supertest';
import { 
  setupTestDB, 
  teardownTestDB, 
  generateTestExpenses,
  performanceThresholds 
} from '../setup.js';
import app from '../../src/index.js';
import AnalyticsEvent from '../../src/models/AnalyticsEvent.js';

describe('API Endpoint Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await AnalyticsEvent.deleteMany({});
  });

  describe('Health Check Endpoint', () => {
    test('should return service health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'UP',
        service: 'analytics-service',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Spending Analytics Endpoints', () => {
    beforeEach(async () => {
      const testData = generateTestExpenses(100);
      await AnalyticsEvent.insertMany(testData);
    });

    test('should return spending patterns with valid user ID', async () => {
      const userId = 'test-user-1';
      const response = await request(app)
        .get('/analytics/spending')
        .set('user-id', userId)
        .expect(200);

      expect(response.body).toHaveProperty('timeframe');
      expect(response.body).toHaveProperty('totalSpending');
      expect(response.body).toHaveProperty('categoryBreakdown');
      expect(response.body.categoryBreakdown).toBeInstanceOf(Array);
    });

    test('should handle missing user ID', async () => {
      const response = await request(app)
        .get('/analytics/spending')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'User ID is required');
    });

    test('should handle date range filters', async () => {
      const userId = 'test-user-1';
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-01-31').toISOString();

      const response = await request(app)
        .get('/analytics/spending')
        .set('user-id', userId)
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.timeframe.startDate).toBe(startDate);
      expect(response.body.timeframe.endDate).toBe(endDate);
    });
  });

  describe('Insights Endpoints', () => {
    beforeEach(async () => {
      const testData = generateTestExpenses(200);
      await AnalyticsEvent.insertMany(testData);
    });

    test('should generate financial insights', async () => {
      const userId = 'test-user-1';
      const response = await request(app)
        .get('/analytics/insights')
        .set('user-id', userId)
        .expect(200);

      expect(response.body).toHaveProperty('insights');
      expect(response.body.insights).toBeInstanceOf(Array);
      expect(response.body.insights.length).toBeGreaterThan(0);

      // Verify insight structure
      const insight = response.body.insights[0];
      expect(insight).toHaveProperty('type');
      expect(insight).toHaveProperty('message');
      expect(insight).toHaveProperty('severity');
    });

    test('should return savings recommendations', async () => {
      const userId = 'test-user-1';
      const response = await request(app)
        .get('/analytics/insights/recommendations')
        .set('user-id', userId)
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
      expect(response.body.recommendations).toBeInstanceOf(Array);

      // Verify recommendation structure
      if (response.body.recommendations.length > 0) {
        const recommendation = response.body.recommendations[0];
        expect(recommendation).toHaveProperty('category');
        expect(recommendation).toHaveProperty('message');
        expect(recommendation).toHaveProperty('priority');
      }
    });
  });

  describe('Predictions Endpoints', () => {
    beforeEach(async () => {
      const testData = generateTestExpenses(300);
      await AnalyticsEvent.insertMany(testData);
    });

    test('should generate spending predictions', async () => {
      const userId = 'test-user-1';
      const response = await request(app)
        .get('/analytics/predictions')
        .set('user-id', userId)
        .expect(200);

      expect(response.body).toHaveProperty('predictions');
      expect(response.body.predictions).toBeInstanceOf(Array);

      // Verify prediction structure
      const prediction = response.body.predictions[0];
      expect(prediction).toHaveProperty('category');
      expect(prediction).toHaveProperty('predictedAmount');
      expect(prediction).toHaveProperty('confidence');
    });

    test('should handle prediction timeframe parameter', async () => {
      const userId = 'test-user-1';
      const response = await request(app)
        .get('/analytics/predictions')
        .set('user-id', userId)
        .query({ months: 3 })
        .expect(200);

      expect(response.body.predictions.length).toBe(3);
      response.body.predictions.forEach(prediction => {
        expect(prediction).toHaveProperty('month');
        expect(prediction).toHaveProperty('predictedAmount');
      });
    });
  });

  describe('Budget Analysis Endpoints', () => {
    beforeEach(async () => {
      const testData = generateTestExpenses(150);
      await AnalyticsEvent.insertMany(testData);
    });

    test('should return budget analysis', async () => {
      const userId = 'test-user-1';
      const response = await request(app)
        .get('/analytics/budgets')
        .set('user-id', userId)
        .expect(200);

      expect(response.body).toHaveProperty('budgetAnalysis');
      expect(response.body.budgetAnalysis).toHaveProperty('overview');
      expect(response.body.budgetAnalysis).toHaveProperty('categoryBreakdown');
    });

    test('should handle budget comparison periods', async () => {
      const userId = 'test-user-1';
      const response = await request(app)
        .get('/analytics/budgets/comparison')
        .set('user-id', userId)
        .query({ period: 'month' })
        .expect(200);

      expect(response.body).toHaveProperty('currentPeriod');
      expect(response.body).toHaveProperty('previousPeriod');
      expect(response.body).toHaveProperty('variance');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid date parameters', async () => {
      const userId = 'test-user-1';
      const response = await request(app)
        .get('/analytics/spending')
        .set('user-id', userId)
        .query({ startDate: 'invalid-date' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle invalid category filters', async () => {
      const userId = 'test-user-1';
      const response = await request(app)
        .get('/analytics/spending')
        .set('user-id', userId)
        .query({ category: 'invalid-category' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance Requirements', () => {
    test('should respond within performance threshold', async () => {
      const userId = 'test-user-1';
      const startTime = Date.now();

      await request(app)
        .get('/analytics/insights')
        .set('user-id', userId)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(performanceThresholds.responseTime);
    });

    test('should handle concurrent requests efficiently', async () => {
      const userId = 'test-user-1';
      const concurrentRequests = 10;

      const requests = Array(concurrentRequests).fill().map(() =>
        request(app)
          .get('/analytics/spending')
          .set('user-id', userId)
      );

      const startTime = Date.now();
      await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(performanceThresholds.responseTime * concurrentRequests);
    });
  });
}); 