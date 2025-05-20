import express from 'express';
import { body, query, validationResult } from 'express-validator';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import moment from 'moment';

const router = express.Router();

// Validate budget parameters
const validateBudgetParams = [
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('period')
    .optional()
    .isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
    .withMessage('Period must be DAILY, WEEKLY, MONTHLY, or YEARLY'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Get budget analysis
router.get('/analysis', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const period = req.query.period || 'MONTHLY';
    let startDate, endDate;

    // Set date range based on period
    switch (period) {
      case 'DAILY':
        startDate = moment().startOf('day').toDate();
        endDate = moment().endOf('day').toDate();
        break;
      case 'WEEKLY':
        startDate = moment().startOf('week').toDate();
        endDate = moment().endOf('week').toDate();
        break;
      case 'YEARLY':
        startDate = moment().startOf('year').toDate();
        endDate = moment().endOf('year').toDate();
        break;
      default: // MONTHLY
        startDate = moment().startOf('month').toDate();
        endDate = moment().endOf('month').toDate();
    }

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
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get budget targets (this would typically come from a Budget model)
    // For now, using mock data
    const budgetTargets = {
      'Food': 500,
      'Transportation': 200,
      'Entertainment': 150,
      'Shopping': 300
    };

    // Calculate budget status for each category
    const budgetAnalysis = spendingData.map(category => {
      const target = budgetTargets[category._id] || 0;
      const spent = category.totalAmount;
      const remaining = Math.max(target - spent, 0);
      const percentageUsed = target > 0 ? (spent / target) * 100 : 0;

      return {
        category: category._id,
        budgetTarget: target,
        spent,
        remaining,
        percentageUsed: percentageUsed.toFixed(2),
        status: percentageUsed > 90 ? 'CRITICAL' : 
                percentageUsed > 75 ? 'WARNING' : 
                'GOOD',
        transactionCount: category.count
      };
    });

    // Generate overall summary
    const totalBudget = Object.values(budgetTargets).reduce((sum, target) => sum + target, 0);
    const totalSpent = spendingData.reduce((sum, cat) => sum + cat.totalAmount, 0);

    res.json({
      period,
      timeframe: {
        startDate,
        endDate
      },
      summary: {
        totalBudget,
        totalSpent,
        remaining: Math.max(totalBudget - totalSpent, 0),
        percentageUsed: ((totalSpent / totalBudget) * 100).toFixed(2)
      },
      categoryAnalysis: budgetAnalysis,
      recommendations: generateBudgetRecommendations(budgetAnalysis)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error analyzing budget' });
  }
});

// Get budget vs actual comparison
router.get('/comparison', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Get last 6 months of data
    const startDate = moment().subtract(6, 'months').startOf('month').toDate();
    const endDate = moment().endOf('month').toDate();

    const monthlySpending = await AnalyticsEvent.aggregate([
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
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            category: '$category'
          },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Mock budget data (would come from Budget model)
    const monthlyBudgets = {
      'Food': 500,
      'Transportation': 200,
      'Entertainment': 150,
      'Shopping': 300
    };

    // Process data by month
    const comparisonByMonth = {};
    monthlySpending.forEach(spending => {
      const monthKey = `${spending._id.year}-${spending._id.month}`;
      if (!comparisonByMonth[monthKey]) {
        comparisonByMonth[monthKey] = {
          month: moment(`${spending._id.year}-${spending._id.month}`, 'YYYY-M').format('MMMM YYYY'),
          categories: {}
        };
      }

      const budget = monthlyBudgets[spending._id.category] || 0;
      comparisonByMonth[monthKey].categories[spending._id.category] = {
        budget,
        actual: spending.totalAmount,
        difference: budget - spending.totalAmount,
        percentageUsed: budget > 0 ? ((spending.totalAmount / budget) * 100).toFixed(2) : 0
      };
    });

    res.json({
      timeframe: {
        startDate,
        endDate
      },
      monthlyComparisons: Object.values(comparisonByMonth)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating budget comparison' });
  }
});

// Helper function to generate budget recommendations
function generateBudgetRecommendations(budgetAnalysis) {
  const recommendations = [];

  budgetAnalysis.forEach(category => {
    const percentageUsed = parseFloat(category.percentageUsed);

    if (percentageUsed > 90) {
      recommendations.push({
        category: category.category,
        type: 'ALERT',
        message: `You've used ${percentageUsed}% of your ${category.category} budget`,
        action: 'Consider immediate spending reduction',
        priority: 'HIGH'
      });
    } else if (percentageUsed > 75) {
      recommendations.push({
        category: category.category,
        type: 'WARNING',
        message: `You've used ${percentageUsed}% of your ${category.category} budget`,
        action: 'Monitor spending closely',
        priority: 'MEDIUM'
      });
    } else if (percentageUsed < 25 && category.transactionCount > 0) {
      recommendations.push({
        category: category.category,
        type: 'OPTIMIZATION',
        message: `You're well under budget for ${category.category}`,
        action: 'Consider reallocating budget to high-usage categories',
        priority: 'LOW'
      });
    }
  });

  return recommendations;
}

export default router; 