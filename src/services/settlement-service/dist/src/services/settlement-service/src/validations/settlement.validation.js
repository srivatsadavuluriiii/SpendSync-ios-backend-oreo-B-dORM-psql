"use strict";
/**
 * Settlement Validation Schemas
 *
 * Defines validation rules for settlement-related requests.
 */
const { body, param, query } = require('express-validator');
const { isValidObjectId } = require('mongoose');
// Common validation rules
const isMongoId = (value) => isValidObjectId(value);
const isCurrency = (value) => /^[A-Z]{3}$/.test(value);
const isValidStatus = (value) => ['pending', 'completed', 'cancelled'].includes(value);
const isValidAlgorithm = (value) => ['minCashFlow', 'greedy', 'friendPreference'].includes(value);
/**
 * Validation rules for creating a settlement
 */
const createSettlementValidation = [
    body('payerId')
        .notEmpty().withMessage('Payer ID is required')
        .custom(isMongoId).withMessage('Invalid payer ID format'),
    body('receiverId')
        .notEmpty().withMessage('Receiver ID is required')
        .custom(isMongoId).withMessage('Invalid receiver ID format')
        .custom((value, { req }) => {
        // Payer and receiver cannot be the same
        return value !== req.body.payerId;
    }).withMessage('Payer and receiver cannot be the same user'),
    body('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 0.01 }).withMessage('Amount must be a positive number')
        .toFloat(),
    body('currency')
        .optional()
        .custom(isCurrency).withMessage('Currency must be a 3-letter code (e.g., USD)'),
    body('groupId')
        .notEmpty().withMessage('Group ID is required')
        .custom(isMongoId).withMessage('Invalid group ID format'),
    body('notes')
        .optional()
        .isString().withMessage('Notes must be a string')
        .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
        .trim()
];
/**
 * Validation rules for updating settlement status
 */
const updateSettlementStatusValidation = [
    param('settlementId')
        .notEmpty().withMessage('Settlement ID is required')
        .custom(isMongoId).withMessage('Invalid settlement ID format'),
    body('status')
        .notEmpty().withMessage('Status is required')
        .custom(isValidStatus).withMessage('Invalid status, must be one of: pending, completed, cancelled')
];
/**
 * Validation rules for getting settlement suggestions
 */
const getSettlementSuggestionsValidation = [
    param('groupId')
        .notEmpty().withMessage('Group ID is required')
        .custom(isMongoId).withMessage('Invalid group ID format'),
    query('algorithm')
        .optional()
        .custom(isValidAlgorithm).withMessage('Invalid algorithm, must be one of: minCashFlow, greedy, friendPreference'),
    query('includeFriendships')
        .optional()
        .isBoolean().withMessage('includeFriendships must be a boolean value')
        .toBoolean(),
    query('includeExplanation')
        .optional()
        .isBoolean().withMessage('includeExplanation must be a boolean value')
        .toBoolean()
];
/**
 * Validation rules for getting settlements by group
 */
const getGroupSettlementsValidation = [
    param('groupId')
        .notEmpty().withMessage('Group ID is required')
        .custom(isMongoId).withMessage('Invalid group ID format'),
    query('status')
        .optional()
        .custom(isValidStatus).withMessage('Invalid status, must be one of: pending, completed, cancelled'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be a number between 1 and 100')
        .toInt(),
    query('offset')
        .optional()
        .isInt({ min: 0 }).withMessage('Offset must be a non-negative number')
        .toInt(),
    query('sortBy')
        .optional()
        .isIn(['createdAt', 'amount', 'updatedAt']).withMessage('Invalid sortBy parameter'),
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc']).withMessage('sortOrder must be "asc" or "desc"')
];
/**
 * Validation rules for getting user settlements
 */
const getUserSettlementsValidation = [
    query('type')
        .optional()
        .isIn(['paid', 'received', 'all']).withMessage('Type must be one of: paid, received, all'),
    query('status')
        .optional()
        .custom(isValidStatus).withMessage('Invalid status, must be one of: pending, completed, cancelled'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be a number between 1 and 100')
        .toInt(),
    query('offset')
        .optional()
        .isInt({ min: 0 }).withMessage('Offset must be a non-negative number')
        .toInt()
];
/**
 * Validation rules for getting a settlement by ID
 */
const getSettlementByIdValidation = [
    param('settlementId')
        .notEmpty().withMessage('Settlement ID is required')
        .custom(isMongoId).withMessage('Invalid settlement ID format')
];
module.exports = {
    createSettlementValidation,
    updateSettlementStatusValidation,
    getSettlementSuggestionsValidation,
    getGroupSettlementsValidation,
    getUserSettlementsValidation,
    getSettlementByIdValidation
};
