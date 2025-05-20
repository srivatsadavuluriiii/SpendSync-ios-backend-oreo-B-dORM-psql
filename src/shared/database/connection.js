/**
 * Database Connection Manager
 * 
 * Manages the connection to MongoDB and provides a client
 * that can be used by repositories.
 */
const { MongoClient } = require('mongodb');
const { DatabaseError } = require('../errors');

class DatabaseConnection {
  constructor() {
    this.client = null;
    this.db = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   * @param {string} uri - MongoDB connection URI
   * @param {string} dbName - Database name
   * @returns {Promise<void>}
   */
  async connect(uri, dbName) {
    try {
      if (this.isConnected) {
        return;
      }

      // Create new MongoDB client
      this.client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      // Connect to the MongoDB server
      await this.client.connect();
      
      // Get database reference
      this.db = this.client.db(dbName);
      this.isConnected = true;
      
      console.log(`Connected to MongoDB database: ${dbName}`);
    } catch (error) {
      throw new DatabaseError('Failed to connect to database', error);
    }
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (!this.isConnected) {
        return;
      }

      await this.client.close();
      this.isConnected = false;
      this.client = null;
      this.db = null;
      
      console.log('Disconnected from MongoDB');
    } catch (error) {
      throw new DatabaseError('Failed to disconnect from database', error);
    }
  }

  /**
   * Get a collection from the database
   * @param {string} name - Collection name
   * @returns {Object} MongoDB Collection
   */
  getCollection(name) {
    if (!this.isConnected) {
      throw new DatabaseError('Not connected to database');
    }
    return this.db.collection(name);
  }

  /**
   * Start a session for transactions
   * @returns {Object} MongoDB ClientSession
   */
  async startSession() {
    if (!this.isConnected) {
      throw new DatabaseError('Not connected to database');
    }
    return this.client.startSession();
  }

  /**
   * Run a transaction
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>} Result of the transaction
   */
  async withTransaction(callback) {
    if (!this.isConnected) {
      throw new DatabaseError('Not connected to database');
    }
    
    const session = await this.startSession();
    try {
      // Start transaction
      session.startTransaction();
      
      // Execute callback
      const result = await callback(session);
      
      // Commit transaction
      await session.commitTransaction();
      
      return result;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      await session.endSession();
    }
  }
}

// Export singleton instance
const dbConnection = new DatabaseConnection();
module.exports = dbConnection; 