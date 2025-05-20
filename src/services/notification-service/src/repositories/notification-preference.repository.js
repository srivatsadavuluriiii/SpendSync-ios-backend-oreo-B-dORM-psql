/**
 * Notification Preference Repository
 * 
 * Handles data access for notification preferences
 */
const BaseRepository = require('../../../../shared/database/repositories/base.repository');
const NotificationPreferenceModel = require('../models/notification-preference.model');
const { DatabaseError } = require('../../../../shared/errors');

class NotificationPreferenceRepository extends BaseRepository {
  constructor() {
    super('notification_preferences');
  }

  /**
   * Get notification preferences for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Notification preferences
   */
  async getNotificationPreferences(userId) {
    try {
      const query = { userId };
      const preferences = await this.getCollection().findOne(query);
      
      if (preferences) {
        return NotificationPreferenceModel.toJSON(preferences);
      }
      
      // If no preferences found, create default preferences
      return this.createDefaultPreferences(userId);
    } catch (error) {
      throw new DatabaseError(`Failed to get notification preferences for user ${userId}`, error);
    }
  }

  /**
   * Create default preferences for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created preferences
   */
  async createDefaultPreferences(userId) {
    try {
      const preferences = NotificationPreferenceModel.create({ userId });
      
      await this.create(preferences);
      
      return NotificationPreferenceModel.toJSON(preferences);
    } catch (error) {
      throw new DatabaseError(`Failed to create default notification preferences for user ${userId}`, error);
    }
  }

  /**
   * Update notification preferences for a user
   * @param {string} userId - User ID
   * @param {Object} preferencesData - New preferences data
   * @returns {Promise<Object>} Updated preferences
   */
  async updateNotificationPreferences(userId, preferencesData) {
    try {
      // Get existing preferences
      const existingPreferences = await this.getCollection().findOne({ userId });
      
      // Data to update
      const updateData = {
        ...preferencesData,
        updatedAt: NotificationPreferenceModel.timestamp()
      };
      
      if (existingPreferences) {
        // Update existing preferences
        const query = { userId };
        let update;
        
        // If updating notification types, we need to handle merging correctly
        if (updateData.notificationTypes) {
          // Create deep copy of existing notification types
          const mergedTypes = { ...existingPreferences.notificationTypes };
          
          // Update each type that was provided
          Object.entries(updateData.notificationTypes).forEach(([type, settings]) => {
            if (!mergedTypes[type]) {
              mergedTypes[type] = {};
            }
            // Update each channel setting
            Object.entries(settings).forEach(([channel, enabled]) => {
              mergedTypes[type][channel] = enabled;
            });
          });
          
          // Remove from updateData and set in special merge operation
          const { notificationTypes, ...restOfUpdate } = updateData;
          
          update = {
            $set: {
              ...restOfUpdate,
              notificationTypes: mergedTypes
            }
          };
        } else {
          update = { $set: updateData };
        }
        
        await this.getCollection().updateOne(query, update);
        
        // Get updated document
        const updatedPreferences = await this.getCollection().findOne(query);
        return NotificationPreferenceModel.toJSON(updatedPreferences);
      }
      
      // Create new preferences with the provided updates
      const defaultPrefs = NotificationPreferenceModel.create({ 
        userId,
        ...updateData 
      });
      
      await this.create(defaultPrefs);
      
      return NotificationPreferenceModel.toJSON(defaultPrefs);
    } catch (error) {
      throw new DatabaseError(`Failed to update notification preferences for user ${userId}`, error);
    }
  }
}

// Export singleton instance
module.exports = new NotificationPreferenceRepository(); 