/**
 * Database Module
 * 
 * Exports database components from a single entry point
 */
const dbConnection = require('./connection');
const dbConfig = require('./config');
const BaseRepository = require('./repositories/base.repository');
const BaseModel = require('./models/base.model');

/**
 * Initialize the database connection
 * @returns {Promise<void>}
 */
const initializeDatabase = async () => {
  try {
    await dbConnection.connect(dbConfig.uri, dbConfig.dbName);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Close the database connection
 * @returns {Promise<void>}
 */
const closeDatabase = async () => {
  try {
    await dbConnection.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
};

module.exports = {
  connection: dbConnection,
  config: dbConfig,
  BaseRepository,
  BaseModel,
  initializeDatabase,
  closeDatabase
}; 