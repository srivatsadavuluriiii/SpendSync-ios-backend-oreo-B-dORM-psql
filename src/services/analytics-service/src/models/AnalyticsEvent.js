import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  groupId: {
    type: String,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['EXPENSE_CREATED', 'EXPENSE_PAID', 'SETTLEMENT_MADE', 'BUDGET_UPDATED', 'CATEGORY_SPENDING'],
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  category: {
    type: String,
    index: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Create compound indexes for common queries
analyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ groupId: 1, eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ category: 1, timestamp: -1 });

// Add methods for aggregating spending patterns
analyticsEventSchema.statics.getSpendingByCategory = async function(userId, startDate, endDate) {
  return this.aggregate([
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
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);
};

// Method to get spending trends over time
analyticsEventSchema.statics.getSpendingTrends = async function(userId, interval = 'month', months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        userId,
        timestamp: { $gte: startDate },
        eventType: 'EXPENSE_CREATED'
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          ...(interval === 'week' && { week: { $week: '$timestamp' } })
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, ...(interval === 'week' && { '_id.week': 1 }) }
    }
  ]);
};

// Method to predict future expenses based on historical data
analyticsEventSchema.statics.predictFutureExpenses = async function(userId, category, months = 3) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12); // Use last 12 months for prediction

  const historicalData = await this.aggregate([
    {
      $match: {
        userId,
        category,
        timestamp: { $gte: startDate },
        eventType: 'EXPENSE_CREATED'
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' }
        },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  // Simple moving average prediction
  const values = historicalData.map(d => d.totalAmount);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const trend = values.length >= 2 ? 
    (values[values.length - 1] - values[0]) / values.length : 
    0;

  return Array(months).fill(0).map((_, i) => ({
    month: i + 1,
    predictedAmount: avg + (trend * i)
  }));
};

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

export default AnalyticsEvent; 