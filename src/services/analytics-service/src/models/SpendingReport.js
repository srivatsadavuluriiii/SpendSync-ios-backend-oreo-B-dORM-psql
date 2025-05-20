import mongoose from 'mongoose';

const spendingReportSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'],
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalSpending: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'USD'
  },
  categoryBreakdown: [{
    category: String,
    amount: Number,
    percentage: Number,
    count: Number
  }],
  trends: {
    monthOverMonth: Number, // Percentage change
    yearOverYear: Number    // Percentage change
  },
  insights: [{
    type: String,
    enum: ['OVERSPENDING', 'SAVINGS', 'PATTERN', 'RECOMMENDATION'],
    message: String,
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH']
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  }],
  topMerchants: [{
    name: String,
    amount: Number,
    count: Number
  }],
  unusualSpending: [{
    category: String,
    amount: Number,
    deviation: Number, // Standard deviations from mean
    date: Date
  }],
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound indexes for common queries
spendingReportSchema.index({ userId: 1, reportType: 1, startDate: -1 });
spendingReportSchema.index({ userId: 1, generatedAt: -1 });

// Method to get the latest report for a user
spendingReportSchema.statics.getLatestReport = async function(userId, reportType) {
  return this.findOne({
    userId,
    reportType
  }).sort({ generatedAt: -1 });
};

// Method to generate spending insights
spendingReportSchema.methods.generateInsights = function() {
  const insights = [];

  // Check for significant month-over-month changes
  if (Math.abs(this.trends.monthOverMonth) > 20) {
    insights.push({
      type: 'PATTERN',
      message: this.trends.monthOverMonth > 0 
        ? `Your spending increased by ${this.trends.monthOverMonth}% compared to last month`
        : `Your spending decreased by ${Math.abs(this.trends.monthOverMonth)}% compared to last month`,
      severity: Math.abs(this.trends.monthOverMonth) > 50 ? 'HIGH' : 'MEDIUM'
    });
  }

  // Check for unusual spending
  this.unusualSpending.forEach(item => {
    if (item.deviation > 2) {
      insights.push({
        type: 'OVERSPENDING',
        message: `Unusual spending detected in ${item.category} category`,
        severity: item.deviation > 3 ? 'HIGH' : 'MEDIUM',
        metadata: new Map([
          ['category', item.category],
          ['amount', item.amount],
          ['date', item.date]
        ])
      });
    }
  });

  // Add savings opportunities
  const topSpendingCategories = this.categoryBreakdown
    .filter(cat => cat.percentage > 20)
    .map(cat => ({
      category: cat.category,
      percentage: cat.percentage
    }));

  if (topSpendingCategories.length > 0) {
    insights.push({
      type: 'RECOMMENDATION',
      message: `Consider setting a budget for ${topSpendingCategories[0].category} as it represents ${topSpendingCategories[0].percentage}% of your spending`,
      severity: 'MEDIUM'
    });
  }

  return insights;
};

const SpendingReport = mongoose.model('SpendingReport', spendingReportSchema);

export default SpendingReport; 