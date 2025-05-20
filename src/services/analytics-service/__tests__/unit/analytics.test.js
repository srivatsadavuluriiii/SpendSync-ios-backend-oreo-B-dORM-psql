import { SimpleLinearRegression } from 'ml-regression-simple-linear';
import { generateTestExpenses } from '../setup.js';
import AnalyticsEvent from '../../src/models/AnalyticsEvent.js';
import SpendingReport from '../../src/models/SpendingReport.js';

describe('Analytics Algorithms Unit Tests', () => {
  describe('Spending Pattern Analysis', () => {
    const testData = generateTestExpenses(100);

    test('should calculate correct spending by category', () => {
      const categoryTotals = {};
      testData.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      });

      Object.entries(categoryTotals).forEach(([category, total]) => {
        expect(total).toBeGreaterThan(0);
        expect(typeof total).toBe('number');
      });
    });

    test('should identify top spending categories', () => {
      const categoryTotals = {};
      testData.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
      });

      const sortedCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([category]) => category);

      expect(sortedCategories.length).toBeGreaterThan(0);
      expect(sortedCategories[0]).toBeDefined();
    });
  });

  describe('Trend Analysis', () => {
    test('should calculate month-over-month changes correctly', () => {
      const monthlyData = [1000, 1200, 900, 1500];
      const momChanges = monthlyData.map((amount, i) => {
        if (i === 0) return 0;
        return ((amount - monthlyData[i - 1]) / monthlyData[i - 1]) * 100;
      });

      expect(momChanges[1]).toBe(20); // (1200 - 1000) / 1000 * 100
      expect(momChanges[2]).toBe(-25); // (900 - 1200) / 1200 * 100
      expect(momChanges[3]).toBe(66.67); // (1500 - 900) / 900 * 100
    });

    test('should detect significant spending changes', () => {
      const monthlyData = [1000, 2000, 1800, 3000];
      const significantChangeThreshold = 50;

      const changes = monthlyData.map((amount, i) => {
        if (i === 0) return 0;
        return ((amount - monthlyData[i - 1]) / monthlyData[i - 1]) * 100;
      });

      const significantChanges = changes.filter(change => Math.abs(change) > significantChangeThreshold);
      expect(significantChanges.length).toBeGreaterThan(0);
    });
  });

  describe('Prediction Algorithms', () => {
    test('should predict future spending using linear regression', () => {
      const monthlyData = [1000, 1100, 1250, 1400];
      const months = [0, 1, 2, 3];

      const regression = new SimpleLinearRegression(months, monthlyData);
      const prediction = regression.predict(4);

      expect(prediction).toBeGreaterThan(monthlyData[monthlyData.length - 1]);
      expect(typeof prediction).toBe('number');
    });

    test('should calculate prediction confidence score', () => {
      const monthlyData = [1000, 1100, 1250, 1400];
      const months = [0, 1, 2, 3];

      const regression = new SimpleLinearRegression(months, monthlyData);
      const r2Score = regression.score(months, monthlyData);

      expect(r2Score).toBeGreaterThanOrEqual(0);
      expect(r2Score).toBeLessThanOrEqual(1);
    });
  });

  describe('Budget Analysis', () => {
    test('should calculate budget variance correctly', () => {
      const budget = 1000;
      const actualSpending = 1200;
      const variance = ((actualSpending - budget) / budget) * 100;

      expect(variance).toBe(20);
    });

    test('should identify over-budget categories', () => {
      const budgets = {
        food: 500,
        transport: 300,
        entertainment: 200
      };

      const spending = {
        food: 600,
        transport: 250,
        entertainment: 300
      };

      const overBudgetCategories = Object.entries(spending)
        .filter(([category, amount]) => amount > budgets[category])
        .map(([category]) => category);

      expect(overBudgetCategories).toContain('food');
      expect(overBudgetCategories).toContain('entertainment');
      expect(overBudgetCategories).not.toContain('transport');
    });
  });

  describe('Data Aggregation', () => {
    test('should aggregate daily spending correctly', () => {
      const expenses = [
        { amount: 100, timestamp: new Date('2024-01-01') },
        { amount: 200, timestamp: new Date('2024-01-01') },
        { amount: 150, timestamp: new Date('2024-01-02') }
      ];

      const dailyTotals = {};
      expenses.forEach(expense => {
        const date = expense.timestamp.toISOString().split('T')[0];
        dailyTotals[date] = (dailyTotals[date] || 0) + expense.amount;
      });

      expect(dailyTotals['2024-01-01']).toBe(300);
      expect(dailyTotals['2024-01-02']).toBe(150);
    });

    test('should calculate moving averages', () => {
      const dailySpending = [100, 200, 150, 300, 250];
      const windowSize = 3;
      const movingAverages = [];

      for (let i = 0; i <= dailySpending.length - windowSize; i++) {
        const window = dailySpending.slice(i, i + windowSize);
        const average = window.reduce((a, b) => a + b, 0) / windowSize;
        movingAverages.push(average);
      }

      expect(movingAverages[0]).toBe(150); // (100 + 200 + 150) / 3
      expect(movingAverages[1]).toBe(216.67); // (200 + 150 + 300) / 3
      expect(movingAverages[2]).toBe(233.33); // (150 + 300 + 250) / 3
    });
  });
}); 