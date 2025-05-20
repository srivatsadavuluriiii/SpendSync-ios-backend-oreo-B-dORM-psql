import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/index.js';
import AnalyticsEvent from '../src/models/AnalyticsEvent.js';

describe('Budget Endpoints', () => {
  beforeEach(async () => {
    await AnalyticsEvent.deleteMany({});
  });

  describe('GET /budget/analysis', () => {
    it('should return 401 without user ID', async () => {
      const response = await request(app)
        .get('/budget/analysis')
        .expect(401);

      expect(response.body.error).toBe('User ID is required');
    });

    it('should analyze monthly budget status', async () => {
      // Create test data
      const userId = new mongoose.Types.ObjectId();
      const budgetEvent = new AnalyticsEvent({
        userId,
        eventType: 'BUDGET_UPDATED',
        category: 'groceries',
        amount: 500,
        metadata: new Map([['period', 'monthly']])
      });
      await budgetEvent.save();

      const transactionEvent = new AnalyticsEvent({
        userId,
        eventType: 'EXPENSE_CREATED',
        category: 'groceries',
        amount: 300,
        timestamp: new Date()
      });
      await transactionEvent.save();

      const response = await request(app)
        .get('/budget/analysis')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body).toHaveProperty('analysis');
      expect(response.body.analysis).toHaveProperty('groceries');
      expect(response.body.analysis.groceries).toHaveProperty('status');
      expect(response.body.analysis.groceries).toHaveProperty('percentage');
    });

    it('should handle different time periods', async () => {
      const userId = new mongoose.Types.ObjectId();
      const budgetEvent = new AnalyticsEvent({
        userId,
        eventType: 'BUDGET_UPDATED',
        category: 'groceries',
        amount: 500,
        metadata: new Map([['period', 'monthly']])
      });
      await budgetEvent.save();

      const response = await request(app)
        .get('/budget/analysis')
        .query({ 
          userId: userId.toString(),
          period: 'weekly'
        })
        .expect(200);

      expect(response.body).toHaveProperty('analysis');
    });

    it('should generate budget recommendations', async () => {
      const userId = new mongoose.Types.ObjectId();
      const budgetEvent = new AnalyticsEvent({
        userId,
        eventType: 'BUDGET_UPDATED',
        category: 'groceries',
        amount: 500,
        metadata: new Map([['period', 'monthly']])
      });
      await budgetEvent.save();

      const transactionEvent = new AnalyticsEvent({
        userId,
        eventType: 'EXPENSE_CREATED',
        category: 'groceries',
        amount: 600,
        timestamp: new Date()
      });
      await transactionEvent.save();

      const response = await request(app)
        .get('/budget/analysis')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });
  });

  describe('GET /budget/comparison', () => {
    it('should compare budget vs actual spending', async () => {
      const userId = new mongoose.Types.ObjectId();
      const budgetEvent = new AnalyticsEvent({
        userId,
        eventType: 'BUDGET_UPDATED',
        category: 'groceries',
        amount: 500,
        metadata: new Map([['period', 'monthly']])
      });
      await budgetEvent.save();

      const transactionEvent = new AnalyticsEvent({
        userId,
        eventType: 'EXPENSE_CREATED',
        category: 'groceries',
        amount: 300,
        timestamp: new Date()
      });
      await transactionEvent.save();

      const response = await request(app)
        .get('/budget/comparison')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body).toHaveProperty('comparison');
      expect(response.body.comparison).toHaveProperty('groceries');
      expect(response.body.comparison.groceries).toHaveProperty('budgeted');
      expect(response.body.comparison.groceries).toHaveProperty('actual');
    });

    it('should calculate correct differences and percentages', async () => {
      const userId = new mongoose.Types.ObjectId();
      const budgetEvent = new AnalyticsEvent({
        userId,
        eventType: 'BUDGET_UPDATED',
        category: 'groceries',
        amount: 500,
        metadata: new Map([['period', 'monthly']])
      });
      await budgetEvent.save();

      const transactionEvent = new AnalyticsEvent({
        userId,
        eventType: 'EXPENSE_CREATED',
        category: 'groceries',
        amount: 300,
        timestamp: new Date()
      });
      await transactionEvent.save();

      const response = await request(app)
        .get('/budget/comparison')
        .query({ userId: userId.toString() })
        .expect(200);

      const comparison = response.body.comparison.groceries;
      expect(comparison.difference).toBe(200);
      expect(comparison.percentage).toBe(60);
    });

    it('should handle categories without budget targets', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactionEvent = new AnalyticsEvent({
        userId,
        eventType: 'EXPENSE_CREATED',
        category: 'groceries',
        amount: 300,
        timestamp: new Date()
      });
      await transactionEvent.save();

      const response = await request(app)
        .get('/budget/comparison')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body.comparison.groceries).toHaveProperty('budgeted', 0);
    });
  });

  describe('Budget Analysis Quality', () => {
    it('should provide meaningful analysis for complex spending patterns', async () => {
      const userId = new mongoose.Types.ObjectId();
      const budgetEvent = new AnalyticsEvent({
        userId,
        eventType: 'BUDGET_UPDATED',
        category: 'groceries',
        amount: 500,
        metadata: new Map([['period', 'monthly']])
      });
      await budgetEvent.save();

      // Create multiple transactions with varying amounts
      const transactions = [
        { amount: 100, timestamp: new Date() },
        { amount: 150, timestamp: new Date() },
        { amount: 200, timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          category: 'groceries',
          amount: t.amount,
          timestamp: t.timestamp
        }).save();
      }

      const response = await request(app)
        .get('/budget/analysis')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body.analysis.groceries).toHaveProperty('trend');
      expect(response.body.analysis.groceries).toHaveProperty('insights');
    });
  });
}); 