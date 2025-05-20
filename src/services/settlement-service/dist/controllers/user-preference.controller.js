/**
 * User Preference Controller
 *
 * Handles HTTP requests related to user preferences
 */
const userPreferenceService = require('../services/user-preference.service');
const { BadRequestError } = require('../../../../shared/errors');
/**
 * Get user preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
async function getUserPreferences(req, res, next) {
    try {
        // Use authenticated user's ID from auth middleware
        const userId = req.user.id;
        const preferences = await userPreferenceService.getUserPreferences(userId);
        res.json({
            success: true,
            data: preferences
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Update user preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
async function updateUserPreferences(req, res, next) {
    try {
        const userId = req.user.id;
        const updatedData = req.body;
        if (!updatedData || Object.keys(updatedData).length === 0) {
            throw new BadRequestError('Update data is required');
        }
        const updatedPreferences = await userPreferenceService.updateUserPreferences(userId, updatedData);
        res.json({
            success: true,
            data: updatedPreferences
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Update specific section of user preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
async function updatePreferenceSection(req, res, next) {
    try {
        const userId = req.user.id;
        const { section } = req.params;
        const sectionData = req.body;
        if (!sectionData || Object.keys(sectionData).length === 0) {
            throw new BadRequestError('Section data is required');
        }
        const validSections = ['notifications', 'displaySettings', 'privacySettings'];
        if (!validSections.includes(section)) {
            throw new BadRequestError(`Invalid section: ${section}. Valid sections are: ${validSections.join(', ')}`);
        }
        const updatedPreferences = await userPreferenceService.updatePreferenceSection(userId, section, sectionData);
        res.json({
            success: true,
            data: updatedPreferences
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Reset user preferences to defaults
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
async function resetUserPreferences(req, res, next) {
    try {
        const userId = req.user.id;
        const preferences = await userPreferenceService.resetUserPreferences(userId);
        res.json({
            success: true,
            message: 'Preferences reset to defaults',
            data: preferences
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Get notification settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
async function getNotificationSettings(req, res, next) {
    try {
        const userId = req.user.id;
        const notifications = await userPreferenceService.getNotificationSettings(userId);
        res.json({
            success: true,
            data: notifications
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Set default currency
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
async function setDefaultCurrency(req, res, next) {
    try {
        const userId = req.user.id;
        const { currency } = req.body;
        if (!currency) {
            throw new BadRequestError('Currency is required');
        }
        // Validate currency format (e.g., USD, EUR, GBP)
        if (!/^[A-Z]{3}$/.test(currency)) {
            throw new BadRequestError('Invalid currency format. Must be a 3-letter code (e.g., USD)');
        }
        const updatedPreferences = await userPreferenceService.updateUserPreferences(userId, { defaultCurrency: currency });
        res.json({
            success: true,
            message: `Default currency updated to ${currency}`,
            data: updatedPreferences
        });
    }
    catch (error) {
        next(error);
    }
}
/**
 * Set settlement algorithm preference
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
async function setSettlementAlgorithm(req, res, next) {
    try {
        const userId = req.user.id;
        const { algorithm } = req.body;
        if (!algorithm) {
            throw new BadRequestError('Algorithm is required');
        }
        const validAlgorithms = ['minCashFlow', 'greedy', 'friendPreference'];
        if (!validAlgorithms.includes(algorithm)) {
            throw new BadRequestError(`Invalid algorithm: ${algorithm}. Valid algorithms are: ${validAlgorithms.join(', ')}`);
        }
        const updatedPreferences = await userPreferenceService.updateUserPreferences(userId, { settlementAlgorithm: algorithm });
        res.json({
            success: true,
            message: `Settlement algorithm updated to ${algorithm}`,
            data: updatedPreferences
        });
    }
    catch (error) {
        next(error);
    }
}
module.exports = {
    getUserPreferences,
    updateUserPreferences,
    updatePreferenceSection,
    resetUserPreferences,
    getNotificationSettings,
    setDefaultCurrency,
    setSettlementAlgorithm
};
export {};
//# sourceMappingURL=user-preference.controller.js.map