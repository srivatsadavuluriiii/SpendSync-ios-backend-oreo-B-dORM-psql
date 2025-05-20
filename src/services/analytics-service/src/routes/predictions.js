import express from 'express';
import { query, validationResult } from 'express-validator';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import moment from 'moment';
import SimpleLinearRegression from 'ml-regression-simple-linear';
import * as math from 'mathjs';

const router = express.Router();

// Validate prediction parameters
const validatePredictionParams = [
  query('months')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Months must be between 1 and 12'),
  query('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Get overall expense predictions
router.get('/', validatePredictionParams, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const months = parseInt(req.query.months) || 3;

    // Get historical data for the last 12 months
    const startDate = moment().subtract(12, 'months').startOf('month').toDate();
    const endDate = moment().endOf('month').toDate();

    const monthlyData = await AnalyticsEvent.aggregate([
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
            month: { $month: '$timestamp' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Prepare data for regression
    const xValues = monthlyData.map((_, index) => index);
    const yValues = monthlyData.map(d => d.totalAmount);

    // Calculate trend using linear regression
    const regression = new SimpleLinearRegression(xValues, yValues);
    
    // Calculate confidence intervals using standard error
    const predictions = [];
    const yMean = math.mean(yValues);
    const residuals = yValues.map((y, i) => y - regression.predict(i));
    const standardError = math.sqrt(residuals.reduce((acc, r) => acc + r * r, 0) / (yValues.length - 2));

    // Generate predictions with confidence intervals
    for (let i = 1; i <= months; i++) {
      const predictedMonth = moment().add(i, 'months');
      const x = xValues.length + i - 1;
      const predictedValue = regression.predict(x);
      
      // Calculate 95% confidence interval
      const xMean = math.mean(xValues);
      const sumSquaredX = xValues.reduce((acc, x) => acc + Math.pow(x - xMean, 2), 0);
      const seY = standardError * math.sqrt(1 + 1/xValues.length + 
        Math.pow(x - xMean, 2) / sumSquaredX);
      const marginOfError = 1.96 * seY;

      predictions.push({
        month: predictedMonth.format('MMMM YYYY'),
        amount: predictedValue,
        confidence: {
          lower: predictedValue - marginOfError,
          upper: predictedValue + marginOfError,
          interval: '95%'
        },
        trend: regression.slope > 0 ? 'increasing' : 'decreasing',
        trendStrength: Math.abs(regression.score(xValues, yValues))
      });
    }

    res.json({
      predictions,
      metadata: {
        historicalMonths: monthlyData.length,
        r2Score: regression.score(xValues, yValues),
        trend: {
          slope: regression.slope,
          intercept: regression.intercept
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating predictions' });
  }
});

// Get category-specific predictions
router.get('/by-category', validatePredictionParams, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    const months = parseInt(req.query.months) || 3;
    const category = req.query.category;

    // Get historical data
    const startDate = moment().subtract(12, 'months').startOf('month').toDate();
    const endDate = moment().endOf('month').toDate();

    const matchQuery = {
      userId,
      timestamp: { $gte: startDate, $lte: endDate },
      eventType: 'EXPENSE_CREATED'
    };
    if (category) {
      matchQuery.category = category;
    }

    const categoryData = await AnalyticsEvent.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: {
            category: '$category',
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Group by category and predict
    const categoryPredictions = {};
    const categories = [...new Set(categoryData.map(d => d._id.category))];

    categories.forEach(cat => {
      const catData = categoryData
        .filter(d => d._id.category === cat)
        .map(d => d.totalAmount);

      if (catData.length >= 3) { // Need at least 3 points for meaningful prediction
        const xValues = catData.map((_, i) => i);
        const regression = new SimpleLinearRegression(xValues, catData);

        const predictions = [];
        for (let i = 1; i <= months; i++) {
          const x = xValues.length + i - 1;
          predictions.push({
            month: moment().add(i, 'months').format('MMMM YYYY'),
            amount: regression.predict(x)
          });
        }

        categoryPredictions[cat] = {
          predictions,
          confidence: regression.score(xValues, catData),
          trend: regression.slope > 0 ? 'increasing' : 'decreasing'
        };
      }
    });

    res.json({
      timeframe: {
        startDate,
        endDate,
        predictionMonths: months
      },
      predictions: categoryPredictions
    });
  } catch (error) {
    res.status(500).json({ error: 'Error generating category predictions' });
  }
});

// Get seasonal pattern predictions
router.get('/seasonal', validatePredictionParams, async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Get 24 months of historical data for seasonal analysis
    const startDate = moment().subtract(24, 'months').startOf('month').toDate();
    const endDate = moment().endOf('month').toDate();

    const monthlyData = await AnalyticsEvent.aggregate([
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
            month: { $month: '$timestamp' }
          },
          totalAmount: { $sum: '$amount' },
          categories: { $addToSet: '$category' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Calculate seasonal indices
    const monthlyIndices = Array(12).fill(0);
    const monthCounts = Array(12).fill(0);

    monthlyData.forEach(data => {
      const monthIndex = data._id.month - 1;
      monthlyIndices[monthIndex] += data.totalAmount;
      monthCounts[monthIndex]++;
    });

    // Calculate average for each month
    const seasonalFactors = monthlyIndices.map((total, i) => ({
      month: moment().month(i).format('MMMM'),
      factor: monthCounts[i] > 0 ? total / monthCounts[i] : 0
    }));

    // Calculate overall average
    const overallAverage = seasonalFactors.reduce((sum, factor) => sum + factor.factor, 0) / 12;

    // Normalize seasonal factors
    const normalizedFactors = seasonalFactors.map(factor => ({
      ...factor,
      index: factor.factor / overallAverage
    }));

    res.json({
      seasonalPatterns: normalizedFactors,
      highSpendingMonths: normalizedFactors
        .filter(f => f.index > 1.1)
        .sort((a, b) => b.index - a.index),
      lowSpendingMonths: normalizedFactors
        .filter(f => f.index < 0.9)
        .sort((a, b) => a.index - b.index),
      metadata: {
        historicalMonths: monthlyData.length,
        averageMonthlySpending: overallAverage
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error analyzing seasonal patterns' });
  }
});

export default router; 