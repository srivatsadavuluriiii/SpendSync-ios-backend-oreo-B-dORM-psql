/**
 * Get user preferences, create with defaults if not exists
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User preferences
 */
export function getUserPreferences(userId: string): Promise<Object>;
/**
 * Update user preferences
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user preferences
 */
export function updateUserPreferences(userId: string, updateData: Object): Promise<Object>;
/**
 * Update a specific preference section (e.g., notifications, displaySettings)
 * @param {string} userId - User ID
 * @param {string} section - Preference section to update
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user preferences
 */
export function updatePreferenceSection(userId: string, section: string, updateData: Object): Promise<Object>;
/**
 * Reset user preferences to defaults
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Default user preferences
 */
export function resetUserPreferences(userId: string): Promise<Object>;
/**
 * Get notification settings for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notification settings
 */
export function getNotificationSettings(userId: string): Promise<Object>;
/**
 * Get preferences for multiple users
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<Object>} Map of user IDs to preferences
 */
export function getBulkUserPreferences(userIds: string[]): Promise<Object>;
