import mongoose from 'mongoose';
import { 
  setupTestDB, 
  teardownTestDB, 
  generateTestExpenses, 
  measureExecutionTime,
  performanceThresholds 
} from '../setup.js';
import AnalyticsEvent from '../../src/models/AnalyticsEvent.js';
import SpendingReport from '../../src/models/SpendingReport.js';

describe('Large Dataset Performance Tests', () => {
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

  describe('Data Ingestion Performance', () => {
    test('should handle bulk insertion within time threshold', async () => {
      const largeDataset = generateTestExpenses(10000);
      
      const executionTime = await measureExecutionTime(async () => {
        await AnalyticsEvent.insertMany(largeDataset, { ordered: false });
      });

      expect(executionTime).toBeLessThan(performanceThresholds.queryTime);
      
      // Verify data integrity
      const count = await AnalyticsEvent.countDocuments();
      expect(count).toBe(10000);
    });

    test('should maintain performance with concurrent insertions', async () => {
      const batchSize = 1000;
      const concurrentBatches = 5;
      const batches = Array.from({ length: concurrentBatches }, () => 
        generateTestExpenses(batchSize)
      );

      const executionTime = await measureExecutionTime(async () => {
        await Promise.all(batches.map(batch => 
          AnalyticsEvent.insertMany(batch, { ordered: false })
        ));
      });

      expect(executionTime).toBeLessThan(performanceThresholds.queryTime * 2);
      
      // Verify all data was inserted
      const count = await AnalyticsEvent.countDocuments();
      expect(count).toBe(batchSize * concurrentBatches);
    });
  });

  describe('Query Performance', () => {
    beforeEach(async () => {
      // Insert large dataset for query testing
      const largeDataset = generateTestExpenses(10000);
      await AnalyticsEvent.insertMany(largeDataset, { ordered: false });
    });

    test('should efficiently query and aggregate large datasets', async () => {
      const executionTime = await measureExecutionTime(async () => {
        const result = await AnalyticsEvent.aggregate([
          {
            $group: {
              _id: {
                category: '$category',
                month: { $month: '$timestamp' }
              },
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          { $sort: { totalAmount: -1 } }
        ]);

        expect(result.length).toBeGreaterThan(0);
      });

      expect(executionTime).toBeLessThan(performanceThresholds.queryTime);
    });

    test('should maintain performance with complex queries', async () => {
      const executionTime = await measureExecutionTime(async () => {
        const result = await AnalyticsEvent.aggregate([
          {
            $match: {
              timestamp: {
                $gte: new Date(new Date().getFullYear(), 0, 1),
                $lt: new Date()
              }
            }
          },
          {
            $group: {
              _id: {
                category: '$category',
                month: { $month: '$timestamp' },
                day: { $dayOfMonth: '$timestamp' }
              },
              dailyTotal: { $sum: '$amount' }
            }
          },
          {
            $group: {
              _id: {
                category: '$_id.category',
                month: '$_id.month'
              },
              avgDailySpending: { $avg: '$dailyTotal' },
              totalSpending: { $sum: '$dailyTotal' }
            }
          },
          { $sort: { '_id.month': 1, totalSpending: -1 } }
        ]);

        expect(result.length).toBeGreaterThan(0);
      });

      expect(executionTime).toBeLessThan(performanceThresholds.queryTime * 2);
    });
  });

  describe('Memory Usage', () => {
    test('should efficiently process large datasets in batches', async () => {
      const totalRecords = 50000;
      const batchSize = 5000;
      const batches = Math.ceil(totalRecords / batchSize);
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < batches; i++) {
        const batch = generateTestExpenses(batchSize);
        await AnalyticsEvent.insertMany(batch, { ordered: false });
        
        // Check memory usage after each batch
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - initialMemory;
        
        expect(memoryIncrease).toBeLessThan(performanceThresholds.memoryUsage);
      }

      // Verify total records
      const count = await AnalyticsEvent.countDocuments();
      expect(count).toBe(totalRecords);
    });

    test('should handle memory-intensive aggregations', async () => {
      // Insert test data
      const testData = generateTestExpenses(20000);
      await AnalyticsEvent.insertMany(testData, { ordered: false });

      const initialMemory = process.memoryUsage().heapUsed;

      await AnalyticsEvent.aggregate([
        {
          $group: {
            _id: {
              userId: '$userId',
              category: '$category',
              month: { $month: '$timestamp' }
            },
            transactions: { $push: '$$ROOT' }
          }
        },
        {
          $project: {
            userId: '$_id.userId',
            category: '$_id.category',
            month: '$_id.month',
            transactionCount: { $size: '$transactions' },
            totalAmount: { $sum: '$transactions.amount' },
            avgAmount: { $avg: '$transactions.amount' }
          }
        }
      ]);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      expect(memoryIncrease).toBeLessThan(performanceThresholds.memoryUsage);
    });
  });

  describe('Concurrent Operations', () => {
    beforeEach(async () => {
      // Insert base dataset
      const baseData = generateTestExpenses(5000);
      await AnalyticsEvent.insertMany(baseData);
    });

    test('should handle concurrent read operations', async () => {
      const concurrentQueries = 10;
      const queries = Array.from({ length: concurrentQueries }, () => ({
        category: ['food', 'transport', 'entertainment'][Math.floor(Math.random() * 3)]
      }));

      const executionTime = await measureExecutionTime(async () => {
        await Promise.all(queries.map(query => 
          AnalyticsEvent.find({ category: query.category })
        ));
      });

      expect(executionTime).toBeLessThan(performanceThresholds.queryTime * 2);
    });

    test('should handle mixed read/write operations', async () => {
      const operations = [
        ...Array(5).fill(() => AnalyticsEvent.find({ category: 'food' })),
        ...Array(3).fill(() => AnalyticsEvent.insertMany(generateTestExpenses(100))),
        ...Array(2).fill(() => AnalyticsEvent.aggregate([
          { $group: { _id: '$category', total: { $sum: '$amount' } } }
        ]))
      ];

      const executionTime = await measureExecutionTime(async () => {
        await Promise.all(operations.map(op => op()));
      });

      expect(executionTime).toBeLessThan(performanceThresholds.queryTime * 3);
    });
  });
}); 