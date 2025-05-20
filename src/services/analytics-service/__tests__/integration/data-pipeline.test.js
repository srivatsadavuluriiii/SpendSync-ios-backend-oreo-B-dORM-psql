import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, generateTestExpenses } from '../setup.js';
import AnalyticsEvent from '../../src/models/AnalyticsEvent.js';
import SpendingReport from '../../src/models/SpendingReport.js';

describe('Data Processing Pipeline Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await AnalyticsEvent.deleteMany({});
    await SpendingReport.deleteMany({});
  });

  describe('Data Ingestion Pipeline', () => {
    test('should successfully ingest and process batch expense data', async () => {
      const testExpenses = generateTestExpenses(100);
      
      // Batch insert expenses
      await AnalyticsEvent.insertMany(testExpenses);
      
      // Verify data was properly stored
      const storedExpenses = await AnalyticsEvent.find({});
      expect(storedExpenses).toHaveLength(100);
      
      // Verify data integrity
      const randomExpense = testExpenses[0];
      const storedExpense = await AnalyticsEvent.findOne({
        userId: randomExpense.userId,
        timestamp: randomExpense.timestamp
      });
      
      expect(storedExpense).toBeDefined();
      expect(storedExpense.amount).toBe(randomExpense.amount);
      expect(storedExpense.category).toBe(randomExpense.category);
    });

    test('should handle duplicate expense entries correctly', async () => {
      const testExpense = generateTestExpenses(1)[0];
      
      // Try to insert the same expense twice
      await AnalyticsEvent.create(testExpense);
      await expect(AnalyticsEvent.create(testExpense)).rejects.toThrow();
      
      // Verify only one record exists
      const count = await AnalyticsEvent.countDocuments({
        userId: testExpense.userId,
        timestamp: testExpense.timestamp
      });
      expect(count).toBe(1);
    });
  });

  describe('Data Aggregation Pipeline', () => {
    test('should generate accurate daily spending reports', async () => {
      const testExpenses = generateTestExpenses(50);
      await AnalyticsEvent.insertMany(testExpenses);

      // Group expenses by date
      const pipeline = [
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              category: '$category'
            },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ];

      const dailyReport = await AnalyticsEvent.aggregate(pipeline);
      expect(dailyReport.length).toBeGreaterThan(0);
      
      // Verify report structure
      const sampleReport = dailyReport[0];
      expect(sampleReport._id).toHaveProperty('date');
      expect(sampleReport._id).toHaveProperty('category');
      expect(sampleReport).toHaveProperty('totalAmount');
      expect(sampleReport).toHaveProperty('count');
    });

    test('should calculate correct monthly category totals', async () => {
      const testExpenses = generateTestExpenses(100);
      await AnalyticsEvent.insertMany(testExpenses);

      const pipeline = [
        {
          $group: {
            _id: {
              month: { $month: '$timestamp' },
              category: '$category'
            },
            totalAmount: { $sum: '$amount' }
          }
        }
      ];

      const monthlyTotals = await AnalyticsEvent.aggregate(pipeline);
      
      // Verify totals
      monthlyTotals.forEach(total => {
        expect(total.totalAmount).toBeGreaterThan(0);
        expect(total._id.month).toBeLessThanOrEqual(12);
        expect(total._id.month).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Report Generation Pipeline', () => {
    test('should generate and store spending reports', async () => {
      const testExpenses = generateTestExpenses(100);
      await AnalyticsEvent.insertMany(testExpenses);

      // Generate report
      const reportData = {
        userId: testExpenses[0].userId,
        period: 'monthly',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        totalSpending: testExpenses.reduce((sum, exp) => sum + exp.amount, 0),
        categoryBreakdown: {},
        timestamp: new Date()
      };

      const report = await SpendingReport.create(reportData);
      
      // Verify report was stored
      expect(report._id).toBeDefined();
      expect(report.userId).toBe(reportData.userId);
      expect(report.totalSpending).toBe(reportData.totalSpending);
    });

    test('should update existing reports with new data', async () => {
      const testExpenses = generateTestExpenses(50);
      await AnalyticsEvent.insertMany(testExpenses);

      // Create initial report
      const initialReport = await SpendingReport.create({
        userId: testExpenses[0].userId,
        period: 'monthly',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        totalSpending: 1000,
        categoryBreakdown: {},
        timestamp: new Date()
      });

      // Update report
      const updatedTotal = 1500;
      await SpendingReport.findByIdAndUpdate(
        initialReport._id,
        { totalSpending: updatedTotal },
        { new: true }
      );

      // Verify update
      const report = await SpendingReport.findById(initialReport._id);
      expect(report.totalSpending).toBe(updatedTotal);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid data gracefully', async () => {
      const invalidExpense = {
        userId: 'test-user',
        amount: 'invalid-amount', // Should be a number
        timestamp: new Date(),
        category: 'food'
      };

      await expect(AnalyticsEvent.create(invalidExpense)).rejects.toThrow();
    });

    test('should handle missing required fields', async () => {
      const incompleteExpense = {
        userId: 'test-user',
        // Missing amount and category
        timestamp: new Date()
      };

      await expect(AnalyticsEvent.create(incompleteExpense)).rejects.toThrow();
    });
  });
}); 