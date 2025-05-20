/**
 * Expense Splits Schema
 * 
 * This schema defines how expenses are split among users within a group.
 * It supports multiple splitting methods including equal, percentage-based,
 * and custom amount assignments.
 */

const { DataTypes } = require('sequelize');

/**
 * Expense Splits Table Schema
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} Sequelize model
 */
module.exports = (sequelize) => {
  const ExpenseSplit = sequelize.define(
    'ExpenseSplit',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique identifier for the expense split'
      },
      
      expenseId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Expenses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Reference to the parent expense'
      },
      
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who is part of this split'
      },
      
      splitType: {
        type: DataTypes.ENUM('equal', 'percentage', 'fixed', 'share'),
        allowNull: false,
        defaultValue: 'equal',
        comment: 'Method used to split this expense'
      },
      
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Exact amount this user owes (when splitType is fixed)'
      },
      
      percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 100
        },
        comment: 'Percentage of the total expense this user owes (when splitType is percentage)'
      },
      
      shares: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0
        },
        comment: 'Number of shares assigned to this user (when splitType is share)'
      },
      
      note: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Optional note explaining this split'
      },
      
      isPaid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this split has been paid (settled)'
      },
      
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When this split was paid (if applicable)'
      },
      
      settlementId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'Settlements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Reference to the settlement that paid this split (if applicable)'
      }
    },
    {
      tableName: 'expense_splits',
      timestamps: true,
      indexes: [
        // For quick lookup of all splits for an expense
        {
          name: 'expense_splits_expense_id_idx',
          fields: ['expenseId']
        },
        // For quick lookup of all splits for a user
        {
          name: 'expense_splits_user_id_idx',
          fields: ['userId']
        },
        // For quick lookup of all unsettled splits
        {
          name: 'expense_splits_is_paid_idx',
          fields: ['isPaid']
        },
        // For finding splits by expense and user
        {
          name: 'expense_splits_expense_user_idx',
          fields: ['expenseId', 'userId'],
          unique: true
        }
      ]
    }
  );

  /**
   * Associate the ExpenseSplit model with other models
   * @param {Object} models - All models
   */
  ExpenseSplit.associate = (models) => {
    // An expense split belongs to an expense
    ExpenseSplit.belongsTo(models.Expense, {
      foreignKey: 'expenseId',
      as: 'expense'
    });

    // An expense split belongs to a user
    ExpenseSplit.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // An expense split may be associated with a settlement
    ExpenseSplit.belongsTo(models.Settlement, {
      foreignKey: 'settlementId',
      as: 'settlement'
    });
  };

  /**
   * Calculate the actual amount based on split type
   * This is called before validation
   */
  ExpenseSplit.beforeValidate((split, options) => {
    // If splitType is 'equal', amount will be calculated at the expense level
    // after all splits are created to ensure they add up exactly to the expense total
    
    // Ensure appropriate fields are set based on splitType
    if (split.splitType === 'equal') {
      split.percentage = null;
      split.shares = null;
      // amount will be set by the expense service
    } else if (split.splitType === 'percentage') {
      split.shares = null;
      // amount will be calculated by the expense service
    } else if (split.splitType === 'share') {
      split.percentage = null;
      // amount will be calculated by the expense service based on total shares
    } else if (split.splitType === 'fixed') {
      split.percentage = null;
      split.shares = null;
      // amount must be provided directly
    }
  });

  return ExpenseSplit;
}; 