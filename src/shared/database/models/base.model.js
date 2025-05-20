/**
 * Base Model
 * 
 * Provides common functionality for all models
 */
const { v4: uuidv4 } = require('uuid');

class BaseModel {
  /**
   * Generate a new unique ID
   * @returns {string} UUID
   */
  static generateId() {
    return uuidv4();
  }

  /**
   * Create a timestamp for the current time
   * @returns {string} ISO string timestamp
   */
  static timestamp() {
    return new Date().toISOString();
  }

  /**
   * Format the model for JSON responses
   * @param {Object} data - Raw model data
   * @returns {Object} Formatted model data
   */
  static toJSON(data) {
    // This should be overridden by specific models
    return { ...data };
  }
}

module.exports = BaseModel; 