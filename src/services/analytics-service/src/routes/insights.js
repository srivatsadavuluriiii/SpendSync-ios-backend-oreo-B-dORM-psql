import express from 'express';
import { query, validationResult } from 'express-validator';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import SpendingReport from '../models/SpendingReport.js';
import moment from 'moment';
import SimpleLinearRegression from 'ml-regression-simple-linear';

const router = express.Router();

// Get financial insights
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Get last 3 months of spending data
    const startDate = moment().subtract(3, 'months').toDate();
    const endDate = new Date();

    // Get spending by category
    const categorySpending = await AnalyticsEvent.getSpendingByCategory(userId, startDate, endDate);
    
    // Get monthly trends
    const monthlyTrends = await AnalyticsEvent.getSpendingTrends(userId, 'month', 3);

    // Calculate month-over-month changes
    const monthlyAmounts = monthlyTrends.map(t => t.totalAmount);
    const momChanges = monthlyAmounts.map((amount, i) => {
      if (i === 0) return 0;
      return ((amount - monthlyAmounts[i - 1]) / monthlyAmounts[i - 1]) * 100;
    });

    // Generate insights
    const insights = [];

    // Spending trend insights
    const lastMoMChange = momChanges[momChanges.length - 1];
    if (Math.abs(lastMoMChange) > 20) {
      insights.push({
        type: 'PATTERN',
        message: lastMoMChange > 0
          ? `Your spending increased by ${lastMoMChange.toFixed(1)}% compared to last month`
          : `Your spending decreased by ${Math.abs(lastMoMChange).toFixed(1)}% compared to last month`,
        severity: Math.abs(lastMoMChange) > 50 ? 'HIGH' : 'MEDIUM'
      });
    }

    // Category-based insights
    const topCategories = categorySpending
      .filter(cat => cat.totalAmount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 3);

    topCategories.forEach(cat => {
      insights.push({
        type: 'CATEGORY_INSIGHT',
        message: `${cat._id} represents ${((cat.totalAmount / monthlyAmounts[monthlyAmounts.length - 1]) * 100).toFixed(1)}% of your monthly spending`,
        severity: 'LOW',
        metadata: {
          category: cat._id,
          amount: cat.totalAmount,
          count: cat.count
        }
      });
    });

    // Predict next month's spending
    const regression = new SimpleLinearRegression(
      monthlyTrends.map((_, i) => i),
      monthlyAmounts
    );
    const nextMonthPrediction = regression.predict(monthlyAmounts.length);

    insights.push({
      type: 'PREDICTION',
      message: `Based on your spending patterns, next month's expenses might be around ${nextMonthPrediction.toFixed(2)}`,
      severity: 'LOW',
      metadata: {
        predictedAmount: nextMonthPrediction,
        confidence: regression.score(
          monthlyTrends.map((_, i) => i),
          monthlyAmounts
        )
      }
    });

    res.json({
      timeframe: {
        startDate,
        endDate
      },
      monthlyTrends: monthlyTrends.map((t, i) => ({
        month: moment().month(t._id.month - 1).format('MMMM'),
        amount: t.totalAmount,
        change: momChanges[i]
      })),
      topCategories: topCategories.map(cat => ({
        category: cat._id,
        amount: cat.totalAmount,
        count: cat.count
      })),
      insights: insights
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating insights' });
  }
});

// Get savings recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Get last 6 months of spending data
    const startDate = moment().subtract(6, 'months').toDate();
    const endDate = new Date();

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
            month: { $month: '$timestamp' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Analyze spending patterns and generate recommendations
    const categoryStats = {};
    spendingData.forEach(item => {
      if (!categoryStats[item._id.category]) {
        categoryStats[item._id.category] = {
          amounts: [],
          counts: [],
          total: 0
        };
      }
      categoryStats[item._id.category].amounts.push(item.totalAmount);
      categoryStats[item._id.category].counts.push(item.count);
      categoryStats[item._id.category].total += item.totalAmount;
    });

    const recommendations = [];

    // Analyze each category
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const monthlyAvg = stats.total / stats.amounts.length;
      const monthlyCountAvg = stats.counts.reduce((a, b) => a + b, 0) / stats.counts.length;

      // High frequency, high amount categories
      if (monthlyCountAvg > 5 && monthlyAvg > 100) {
        recommendations.push({
          category,
          type: 'REDUCTION',
          message: `Consider reducing frequency of ${category} expenses`,
          potentialSavings: monthlyAvg * 0.2, // Suggest 20% reduction
          priority: 'HIGH'
        });
      }

      // Irregular but high amount categories
      if (monthlyCountAvg <= 2 && monthlyAvg > 200) {
        recommendations.push({
          category,
          type: 'PLANNING',
          message: `Plan ahead for large ${category} expenses`,
          suggestedAction: 'Set aside monthly for these expenses',
          priority: 'MEDIUM'
        });
      }
    });

    res.json({
      timeframe: {
        startDate,
        endDate
      },
      recommendations: recommendations.sort((a, b) => 
        b.potentialSavings - (a.potentialSavings || 0)
      )
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating recommendations' });
  }
});

export default router; 