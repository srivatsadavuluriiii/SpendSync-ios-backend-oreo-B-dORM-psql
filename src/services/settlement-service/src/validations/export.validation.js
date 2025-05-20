/**
 * Export Validation Schemas
 * 
 * Defines validation rules for data export requests.
 */

const { query, param } = require('express-validator');
const { isValidObjectId } = require('mongoose');

// Common validation rule for MongoDB ID
const isMongoId = (value) => isValidObjectId(value);

/**
 * Validation rules for exporting user settlements
 */
const exportUserSettlementsValidation = [
  query('format')
    .optional()
    .isIn(['csv', 'excel', 'json']).withMessage('Format must be one of: csv, excel, json'),
  
  query('dataType')
    .optional()
    .isIn(['settlements', 'balances', 'all']).withMessage('Data type must be one of: settlements, balances, all'),
  
  query('detailLevel')
    .optional()
    .isIn(['basic', 'detailed', 'full']).withMessage('Detail level must be one of: basic, detailed, full'),
  
  query('dateFrom')
    .optional()
    .isISO8601().withMessage('Date From must be a valid date in YYYY-MM-DD format'),
  
  query('dateTo')
    .optional()
    .isISO8601().withMessage('Date To must be a valid date in YYYY-MM-DD format')
    .custom((value, { req }) => {
      // If dateFrom is also provided, ensure dateTo is after dateFrom
      if (req.query.dateFrom && new Date(value) < new Date(req.query.dateFrom)) {
        throw new Error('Date To must be after Date From');
      }
      return true;
    }),
  
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled']).withMessage('Status must be one of: pending, completed, cancelled'),
  
  query('type')
    .optional()
    .isIn(['paid', 'received', 'all']).withMessage('Type must be one of: paid, received, all')
];

/**
 * Validation rules for exporting group settlements
 */
const exportGroupSettlementsValidation = [
  param('groupId')
    .notEmpty().withMessage('Group ID is required')
    .custom(isMongoId).withMessage('Invalid group ID format'),
  
  query('format')
    .optional()
    .isIn(['csv', 'excel', 'json']).withMessage('Format must be one of: csv, excel, json'),
  
  query('detailLevel')
    .optional()
    .isIn(['basic', 'detailed', 'full']).withMessage('Detail level must be one of: basic, detailed, full'),
  
  query('dateFrom')
    .optional()
    .isISO8601().withMessage('Date From must be a valid date in YYYY-MM-DD format'),
  
  query('dateTo')
    .optional()
    .isISO8601().withMessage('Date To must be a valid date in YYYY-MM-DD format')
    .custom((value, { req }) => {
      // If dateFrom is also provided, ensure dateTo is after dateFrom
      if (req.query.dateFrom && new Date(value) < new Date(req.query.dateFrom)) {
        throw new Error('Date To must be after Date From');
      }
      return true;
    }),
  
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'cancelled']).withMessage('Status must be one of: pending, completed, cancelled')
];

module.exports = {
  exportUserSettlementsValidation,
  exportGroupSettlementsValidation
}; 