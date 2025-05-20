/**
 * Split Service
 * 
 * This service handles the complex logic of splitting expenses among users
 * according to various splitting methods.
 */

const { BadRequestError } = require('../../../../shared/errors');
const { roundToTwoDecimals } = require('../utils/math.utils');

class SplitService {
  /**
   * Calculate split amounts for an expense
   * @param {Object} expense - The expense object
   * @param {Array} splits - Array of split objects
   * @returns {Array} Updated splits with calculated amounts
   */
  calculateSplitAmounts(expense, splits) {
    // Validate the expense and splits
    this._validateExpenseAndSplits(expense, splits);
    
    // Group splits by type
    const splitsByType = this._groupSplitsByType(splits);
    
    // Calculate amounts based on split type
    let remainingAmount = expense.amount;
    let processedSplits = [];
    
    // Process fixed amount splits first (they have explicitly set amounts)
    if (splitsByType.fixed && splitsByType.fixed.length > 0) {
      const fixedSplits = this._processFixedSplits(splitsByType.fixed, expense);
      processedSplits = [...processedSplits, ...fixedSplits];
      
      // Calculate remaining amount after fixed splits
      const fixedTotal = fixedSplits.reduce((sum, split) => sum + split.amount, 0);
      remainingAmount -= fixedTotal;
      
      if (remainingAmount < 0) {
        throw new BadRequestError('Total of fixed amounts exceeds expense amount');
      }
    }
    
    // Process percentage splits
    if (splitsByType.percentage && splitsByType.percentage.length > 0) {
      const percentageSplits = this._processPercentageSplits(
        splitsByType.percentage, 
        expense,
        remainingAmount
      );
      processedSplits = [...processedSplits, ...percentageSplits];
      
      // Calculate remaining amount after percentage splits
      const percentageTotal = percentageSplits.reduce((sum, split) => sum + split.amount, 0);
      remainingAmount -= percentageTotal;
      
      if (remainingAmount < 0) {
        throw new BadRequestError('Total of percentage amounts exceeds remaining expense amount');
      }
    }
    
    // Process share splits
    if (splitsByType.share && splitsByType.share.length > 0) {
      const shareSplits = this._processShareSplits(
        splitsByType.share, 
        expense,
        remainingAmount
      );
      processedSplits = [...processedSplits, ...shareSplits];
      
      // Calculate remaining amount after share splits
      const shareTotal = shareSplits.reduce((sum, split) => sum + split.amount, 0);
      remainingAmount -= shareTotal;
    }
    
    // Process equal splits last
    if (splitsByType.equal && splitsByType.equal.length > 0) {
      const equalSplits = this._processEqualSplits(
        splitsByType.equal, 
        expense,
        remainingAmount
      );
      processedSplits = [...processedSplits, ...equalSplits];
      
      // At this point, remainingAmount should be 0 or very close due to rounding
      const equalTotal = equalSplits.reduce((sum, split) => sum + split.amount, 0);
      remainingAmount -= equalTotal;
    }
    
    // Handle any remaining amount due to rounding errors (add to first split)
    if (Math.abs(remainingAmount) > 0.01 && processedSplits.length > 0) {
      processedSplits[0].amount = roundToTwoDecimals(processedSplits[0].amount + remainingAmount);
    }
    
    // Combine all processed splits
    return processedSplits;
  }
  
  /**
   * Validate expense and splits
   * @param {Object} expense - The expense object
   * @param {Array} splits - Array of split objects
   * @private
   */
  _validateExpenseAndSplits(expense, splits) {
    if (!expense || !expense.amount || expense.amount <= 0) {
      throw new BadRequestError('Invalid expense amount');
    }
    
    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      throw new BadRequestError('No splits provided');
    }
    
    // Check for duplicate users
    const userIds = splits.map(split => split.userId);
    const uniqueUserIds = new Set(userIds);
    if (userIds.length !== uniqueUserIds.size) {
      throw new BadRequestError('Duplicate users in splits');
    }
  }
  
  /**
   * Group splits by type
   * @param {Array} splits - Array of split objects
   * @returns {Object} Splits grouped by type
   * @private
   */
  _groupSplitsByType(splits) {
    const result = {};
    
    splits.forEach(split => {
      if (!result[split.splitType]) {
        result[split.splitType] = [];
      }
      
      result[split.splitType].push(split);
    });
    
    return result;
  }
  
  /**
   * Process fixed amount splits
   * @param {Array} splits - Array of fixed amount splits
   * @param {Object} expense - The expense object
   * @returns {Array} Processed splits with calculated amounts
   * @private
   */
  _processFixedSplits(splits, expense) {
    return splits.map(split => {
      if (!split.amount || split.amount <= 0) {
        throw new BadRequestError(`Invalid fixed amount for user ${split.userId}`);
      }
      
      return {
        ...split,
        amount: roundToTwoDecimals(split.amount)
      };
    });
  }
  
  /**
   * Process percentage splits
   * @param {Array} splits - Array of percentage splits
   * @param {Object} expense - The expense object
   * @param {number} remainingAmount - Remaining amount to split
   * @returns {Array} Processed splits with calculated amounts
   * @private
   */
  _processPercentageSplits(splits, expense, remainingAmount) {
    // Validate percentage total
    const percentageTotal = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
    
    if (Math.abs(percentageTotal - 100) > 0.01) {
      throw new BadRequestError('Percentage splits must total 100%');
    }
    
    return splits.map(split => {
      if (!split.percentage || split.percentage <= 0) {
        throw new BadRequestError(`Invalid percentage for user ${split.userId}`);
      }
      
      const amount = (split.percentage / 100) * remainingAmount;
      
      return {
        ...split,
        amount: roundToTwoDecimals(amount)
      };
    });
  }
  
  /**
   * Process share splits
   * @param {Array} splits - Array of share splits
   * @param {Object} expense - The expense object
   * @param {number} remainingAmount - Remaining amount to split
   * @returns {Array} Processed splits with calculated amounts
   * @private
   */
  _processShareSplits(splits, expense, remainingAmount) {
    const totalShares = splits.reduce((sum, split) => sum + (split.shares || 0), 0);
    
    if (totalShares <= 0) {
      throw new BadRequestError('Total shares must be greater than 0');
    }
    
    const processedSplits = splits.map(split => {
      if (!split.shares || split.shares <= 0) {
        throw new BadRequestError(`Invalid shares for user ${split.userId}`);
      }
      
      const amount = (split.shares / totalShares) * remainingAmount;
      
      return {
        ...split,
        amount: roundToTwoDecimals(amount)
      };
    });
    
    // Handle rounding errors by distributing the difference
    const calculatedTotal = processedSplits.reduce((sum, split) => sum + split.amount, 0);
    const difference = remainingAmount - calculatedTotal;
    
    if (Math.abs(difference) > 0.01) {
      // Add difference to the user with the most shares
      const maxShareSplit = processedSplits.reduce(
        (max, split) => split.shares > max.shares ? split : max, 
        processedSplits[0]
      );
      
      const maxShareIndex = processedSplits.findIndex(
        split => split.userId === maxShareSplit.userId
      );
      
      processedSplits[maxShareIndex].amount = roundToTwoDecimals(
        processedSplits[maxShareIndex].amount + difference
      );
    }
    
    return processedSplits;
  }
  
  /**
   * Process equal splits
   * @param {Array} splits - Array of equal splits
   * @param {Object} expense - The expense object
   * @param {number} remainingAmount - Remaining amount to split
   * @returns {Array} Processed splits with calculated amounts
   * @private
   */
  _processEqualSplits(splits, expense, remainingAmount) {
    const splitCount = splits.length;
    const equalAmount = remainingAmount / splitCount;
    
    const processedSplits = splits.map(split => ({
      ...split,
      amount: roundToTwoDecimals(equalAmount)
    }));
    
    // Handle rounding errors by distributing the difference
    const calculatedTotal = processedSplits.reduce((sum, split) => sum + split.amount, 0);
    const difference = remainingAmount - calculatedTotal;
    
    if (Math.abs(difference) > 0.01) {
      processedSplits[0].amount = roundToTwoDecimals(
        processedSplits[0].amount + difference
      );
    }
    
    return processedSplits;
  }
  
  /**
   * Validate split total matches expense amount
   * @param {Array} splits - Processed splits with calculated amounts
   * @param {Object} expense - The expense object
   * @returns {boolean} Whether totals match
   */
  validateSplitTotal(splits, expense) {
    const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
    return Math.abs(totalSplitAmount - expense.amount) < 0.01;
  }
  
  /**
   * Create a visualization of how the expense was split
   * @param {Object} expense - The expense object
   * @param {Array} splits - Array of processed splits
   * @returns {Object} Visualization data for UI rendering
   */
  generateSplitVisualization(expense, splits) {
    // Group by split type for visualization
    const visualization = {
      expenseTotal: expense.amount,
      currency: expense.currency,
      splitsByType: {},
      splitsByUser: {}
    };
    
    // Group by split type
    splits.forEach(split => {
      if (!visualization.splitsByType[split.splitType]) {
        visualization.splitsByType[split.splitType] = {
          count: 0,
          total: 0,
          details: []
        };
      }
      
      visualization.splitsByType[split.splitType].count++;
      visualization.splitsByType[split.splitType].total += split.amount;
      visualization.splitsByType[split.splitType].details.push({
        userId: split.userId,
        amount: split.amount,
        percentage: split.percentage,
        shares: split.shares
      });
      
      // Group by user
      visualization.splitsByUser[split.userId] = {
        amount: split.amount,
        splitType: split.splitType,
        percentageOfTotal: (split.amount / expense.amount) * 100
      };
    });
    
    return visualization;
  }
}

module.exports = new SplitService(); 