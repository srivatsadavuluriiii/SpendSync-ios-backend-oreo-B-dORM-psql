import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/index.js';
import AnalyticsEvent from '../src/models/AnalyticsEvent.js';

describe('Insights Endpoints', () => {
  beforeEach(async () => {
    await AnalyticsEvent.deleteMany({});
  });

  describe('GET /insights', () => {
    it('should return 401 without user ID', async () => {
      const response = await request(app)
        .get('/insights')
        .expect(401);

      expect(response.body.error).toBe('User ID is required');
    });

    it('should generate insights from spending patterns', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 150, category: 'groceries', timestamp: new Date() },
        { amount: 200, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/insights')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body).toHaveProperty('insights');
      expect(Array.isArray(response.body.insights)).toBe(true);
    });

    it('should identify significant spending changes', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 300, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/insights')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body.insights.some(insight => 
        insight.type === 'SPENDING_CHANGE'
      )).toBe(true);
    });

    it('should handle empty data gracefully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get('/insights')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body.insights).toEqual([]);
    });
  });

  describe('GET /insights/recommendations', () => {
    it('should return spending recommendations', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 150, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/insights/recommendations')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    it('should identify high-frequency spending categories', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = Array(5).fill(null).map(() => ({
        amount: 50,
        category: 'groceries',
        timestamp: new Date()
      }));

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/insights/recommendations')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body.recommendations.some(rec => 
        rec.type === 'HIGH_FREQUENCY'
      )).toBe(true);
    });

    it('should identify irregular large expenses', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 1000, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/insights/recommendations')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body.recommendations.some(rec => 
        rec.type === 'LARGE_EXPENSE'
      )).toBe(true);
    });
  });

  describe('Data Analysis Quality', () => {
    it('should provide meaningful insights for varied spending patterns', async () => {
      const userId = new mongoose.Types.ObjectId();
      const transactions = [
        { amount: 100, category: 'groceries', timestamp: new Date() },
        { amount: 200, category: 'groceries', timestamp: new Date() },
        { amount: 300, category: 'groceries', timestamp: new Date() },
        { amount: 50, category: 'groceries', timestamp: new Date() }
      ];

      for (const t of transactions) {
        await new AnalyticsEvent({
          userId,
          eventType: 'EXPENSE_CREATED',
          ...t
        }).save();
      }

      const response = await request(app)
        .get('/insights')
        .query({ userId: userId.toString() })
        .expect(200);

      expect(response.body.insights.length).toBeGreaterThan(0);
      expect(response.body.insights.some(insight => 
        insight.type === 'TREND'
      )).toBe(true);
    });
  });
}); 