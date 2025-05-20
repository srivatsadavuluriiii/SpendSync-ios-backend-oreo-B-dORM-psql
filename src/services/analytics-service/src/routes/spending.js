import express from 'express';
import { body, query, validationResult } from 'express-validator';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import SpendingReport from '../models/SpendingReport.js';
import moment from 'moment';

const router = express.Router();

// Middleware to validate request parameters
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Get spending patterns by category
router.get('/by-category', validateDateRange, async (req, res) => {
  try {
    const userId = req.headers['user-id']; // Assuming user ID is passed in headers
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate) : moment().subtract(1, 'month').toDate();
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const spendingByCategory = await AnalyticsEvent.getSpendingByCategory(userId, startDate, endDate);

    // Calculate percentages and format response
    const totalSpending = spendingByCategory.reduce((sum, cat) => sum + cat.totalAmount, 0);
    const formattedData = spendingByCategory.map(cat => ({
      category: cat._id,
      amount: cat.totalAmount,
      percentage: ((cat.totalAmount / totalSpending) * 100).toFixed(2),
      count: cat.count
    }));

    res.json({
      timeframe: {
        startDate,
        endDate
      },
      totalSpending,
      categories: formattedData
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching spending patterns' });
  }
});

// Get spending trends over time
router.get('/trends', validateDateRange, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const interval = req.query.interval || 'month';
    const months = parseInt(req.query.months) || 6;

    const trends = await AnalyticsEvent.getSpendingTrends(userId, interval, months);

    // Format the trends data
    const formattedTrends = trends.map(t => ({
      period: interval === 'week' 
        ? `Week ${t._id.week}, ${t._id.year}`
        : `${moment().month(t._id.month - 1).format('MMMM')} ${t._id.year}`,
      amount: t.totalAmount,
      count: t.count
    }));

    res.json({
      interval,
      months,
      trends: formattedTrends
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching spending trends' });
  }
});

// Get latest spending report
router.get('/report', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const reportType = req.query.type || 'MONTHLY';
    const report = await SpendingReport.getLatestReport(userId, reportType);

    if (!report) {
      return res.status(404).json({ error: 'No report found' });
    }

    // Generate fresh insights based on the report data
    const insights = report.generateInsights();

    res.json({
      ...report.toObject(),
      insights
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching spending report' });
  }
});

// Get unusual spending patterns
router.get('/unusual', validateDateRange, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate) : moment().subtract(1, 'month').toDate();
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get spending data
    const spendingData = await AnalyticsEvent.aggregate([
      {
        $match: {
          userId,
          timestamp: { $gte: startDate, $lte: endDate },
          eventType: 'EXPENSE_CREATED'
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate standard deviation for each category
    const categoryStats = {};
    spendingData.forEach(item => {
      if (!categoryStats[item._id.category]) {
        categoryStats[item._id.category] = {
          amounts: [],
          dates: []
        };
      }
      categoryStats[item._id.category].amounts.push(item.amount);
      categoryStats[item._id.category].dates.push(item._id.date);
    });

    // Find unusual spending (> 2 standard deviations)
    const unusualSpending = [];
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const mean = stats.amounts.reduce((a, b) => a + b, 0) / stats.amounts.length;
      const stdDev = Math.sqrt(
        stats.amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / stats.amounts.length
      );

      stats.amounts.forEach((amount, index) => {
        const deviation = (amount - mean) / stdDev;
        if (deviation > 2) {
          unusualSpending.push({
            category,
            amount,
            date: stats.dates[index],
            deviation: deviation.toFixed(2)
          });
        }
      });
    });

    res.json({
      timeframe: {
        startDate,
        endDate
      },
      unusualSpending: unusualSpending.sort((a, b) => b.deviation - a.deviation)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error analyzing unusual spending' });
  }
});

export default router; 