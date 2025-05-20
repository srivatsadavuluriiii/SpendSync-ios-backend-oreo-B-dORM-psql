/**
 * User Preference Service
 *
 * Manages user preferences related to settlement service
 */
const UserPreference = require('../models/user-preference.model');
const { generateCacheKey, cacheResult, del } = require('./cache.service');
const { BadRequestError } = require('../../../../shared/errors');
const { metrics, timers } = require('../config/monitoring');
/**
 * Get user preferences, create with defaults if not exists
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User preferences
 */
async function getUserPreferences(userId) {
    if (!userId) {
        throw new BadRequestError('User ID is required');
    }
    const cacheKey = generateCacheKey('userPreferences', userId);
    return cacheResult(async () => {
        // Check if user already has preferences
        const existingPreferences = await UserPreference.findOne({ userId });
        if (existingPreferences) {
            return existingPreferences;
        }
        // Create default preferences if none exist
        const defaultPreferences = {
            userId,
            defaultCurrency: 'USD',
            settlementAlgorithm: 'minCashFlow',
            notifications: {
                email: true,
                push: true,
                reminderFrequency: 'medium'
            },
            displaySettings: {
                theme: 'system'
            }
        };
        return UserPreference.create(defaultPreferences);
    }, cacheKey);
}
/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user preferences
 */
async function updateUserPreferences(userId, updateData) {
    if (!userId) {
        throw new BadRequestError('User ID is required');
    }
    if (!updateData || Object.keys(updateData).length === 0) {
        throw new BadRequestError('Update data is required');
    }
    // Ensure userId cannot be changed
    if (updateData.userId) {
        delete updateData.userId;
    }
    const timer = timers.createDbTimer('findOneAndUpdate', 'userPreferences');
    try {
        // Find and update, create if not exists (upsert)
        const preferences = await UserPreference.findOneAndUpdate({ userId }, { $set: updateData }, {
            new: true, // Return updated document
            upsert: true // Create if not exists
        });
        // Invalidate cache
        const cacheKey = generateCacheKey('userPreferences', userId);
        await del(cacheKey);
        return preferences;
    }
    finally {
        timer();
    }
}
/**
 * Update a specific preference section (e.g., notifications, displaySettings)
 * @param {string} userId - User ID
 * @param {string} section - Preference section to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user preferences
 */
async function updatePreferenceSection(userId, section, updateData) {
    // Validate section
    const validSections = ['notifications', 'displaySettings'];
    if (!validSections.includes(section)) {
        throw new BadRequestError(`Invalid section. Must be one of: ${validSections.join(', ')}`);
    }
    // Create a properly structured update with section as key
    const sectionUpdate = {
        [`${section}`]: updateData
    };
    return updateUserPreferences(userId, sectionUpdate);
}
/**
 * Reset user preferences to defaults
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Default user preferences
 */
async function resetUserPreferences(userId) {
    const defaultPreferences = {
        defaultCurrency: 'USD',
        settlementAlgorithm: 'minCashFlow',
        notifications: {
            email: true,
            push: true,
            reminderFrequency: 'medium'
        },
        displaySettings: {
            theme: 'system'
        }
    };
    return updateUserPreferences(userId, defaultPreferences);
}
/**
 * Get notification settings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notification settings
 */
async function getNotificationSettings(userId) {
    const preferences = await getUserPreferences(userId);
    return preferences.notifications || {};
}
/**
 * Get preferences for multiple users
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<Object>} Map of user IDs to preferences
 */
async function getBulkUserPreferences(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new BadRequestError('User IDs array is required');
    }
    const timer = timers.createDbTimer('find', 'userPreferences');
    try {
        // Find all existing preferences
        const existingPreferences = await UserPreference.find({
            userId: { $in: userIds }
        });
        // Create a map for fast lookup
        const preferencesMap = {};
        // Add all existing preferences to the map
        existingPreferences.forEach(pref => {
            preferencesMap[pref.userId] = pref;
        });
        // Create default preferences for users that don't have them
        for (const userId of userIds) {
            if (!preferencesMap[userId]) {
                preferencesMap[userId] = await getUserPreferences(userId);
            }
        }
        return preferencesMap;
    }
    finally {
        timer();
    }
}
module.exports = {
    getUserPreferences,
    updateUserPreferences,
    updatePreferenceSection,
    resetUserPreferences,
    getNotificationSettings,
    getBulkUserPreferences
};
export {};
//# sourceMappingURL=user-preference.service.js.map