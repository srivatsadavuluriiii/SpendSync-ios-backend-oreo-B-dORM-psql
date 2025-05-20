/**
 * Base Repository
 * 
 * Provides common CRUD operations for MongoDB collections
 */
const { ObjectId } = require('mongodb');
const { DatabaseError, NotFoundError } = require('../../errors');
const dbConnection = require('../connection');

class BaseRepository {
  /**
   * Create a new repository instance
   * @param {string} collectionName - MongoDB collection name
   */
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  /**
   * Get the MongoDB collection
   * @returns {Object} MongoDB Collection
   */
  getCollection() {
    return dbConnection.getCollection(this.collectionName);
  }

  /**
   * Find a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Document or null if not found
   */
  async findById(id) {
    try {
      const collection = this.getCollection();
      const query = this._buildIdQuery(id);
      return await collection.findOne(query);
    } catch (error) {
      throw new DatabaseError(`Failed to find document in ${this.collectionName}`, error);
    }
  }

  /**
   * Find a document by ID and throw if not found
   * @param {string} id - Document ID
   * @throws {NotFoundError} If document not found
   * @returns {Promise<Object>} Document
   */
  async findByIdOrFail(id) {
    const document = await this.findById(id);
    if (!document) {
      throw new NotFoundError(`Document with ID ${id} not found in ${this.collectionName}`);
    }
    return document;
  }

  /**
   * Find documents by custom query
   * @param {Object} query - MongoDB query
   * @param {Object} options - Additional options (sort, projection, etc.)
   * @returns {Promise<Array>} Array of documents
   */
  async find(query = {}, options = {}) {
    try {
      const collection = this.getCollection();
      const { sort, projection, limit, skip } = options;
      
      let cursor = collection.find(query);
      
      if (projection) {
        cursor = cursor.project(projection);
      }
      
      if (sort) {
        cursor = cursor.sort(sort);
      }
      
      if (limit) {
        cursor = cursor.limit(limit);
      }
      
      if (skip) {
        cursor = cursor.skip(skip);
      }
      
      return await cursor.toArray();
    } catch (error) {
      throw new DatabaseError(`Failed to find documents in ${this.collectionName}`, error);
    }
  }

  /**
   * Count documents by query
   * @param {Object} query - MongoDB query
   * @returns {Promise<number>} Document count
   */
  async count(query = {}) {
    try {
      const collection = this.getCollection();
      return await collection.countDocuments(query);
    } catch (error) {
      throw new DatabaseError(`Failed to count documents in ${this.collectionName}`, error);
    }
  }

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @returns {Promise<Object>} Created document
   */
  async create(data) {
    try {
      const collection = this.getCollection();
      const result = await collection.insertOne(data);
      
      if (!result.acknowledged) {
        throw new DatabaseError(`Failed to create document in ${this.collectionName}`);
      }
      
      return { ...data, _id: result.insertedId };
    } catch (error) {
      throw new DatabaseError(`Failed to create document in ${this.collectionName}`, error);
    }
  }

  /**
   * Update a document
   * @param {string} id - Document ID
   * @param {Object} data - Update data
   * @param {boolean} [upsert=false] - Whether to create if not exists
   * @returns {Promise<Object|null>} Updated document or null if not found
   */
  async update(id, data, upsert = false) {
    try {
      const collection = this.getCollection();
      const query = this._buildIdQuery(id);
      
      // Don't modify the ID
      const updateData = { ...data };
      delete updateData._id;
      
      const result = await collection.findOneAndUpdate(
        query,
        { $set: updateData },
        { returnDocument: 'after', upsert }
      );
      
      return result.value;
    } catch (error) {
      throw new DatabaseError(`Failed to update document in ${this.collectionName}`, error);
    }
  }

  /**
   * Update a document and throw if not found
   * @param {string} id - Document ID
   * @param {Object} data - Update data
   * @throws {NotFoundError} If document not found
   * @returns {Promise<Object>} Updated document
   */
  async updateOrFail(id, data) {
    const document = await this.update(id, data);
    if (!document) {
      throw new NotFoundError(`Document with ID ${id} not found in ${this.collectionName}`);
    }
    return document;
  }

  /**
   * Delete a document
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} Whether document was found and deleted
   */
  async delete(id) {
    try {
      const collection = this.getCollection();
      const query = this._buildIdQuery(id);
      
      const result = await collection.deleteOne(query);
      return result.deletedCount > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to delete document in ${this.collectionName}`, error);
    }
  }

  /**
   * Delete a document and throw if not found
   * @param {string} id - Document ID
   * @throws {NotFoundError} If document not found
   * @returns {Promise<void>}
   */
  async deleteOrFail(id) {
    const deleted = await this.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Document with ID ${id} not found in ${this.collectionName}`);
    }
  }

  /**
   * Build an ID query based on the type of ID
   * @param {string} id - Document ID
   * @returns {Object} MongoDB query
   * @private
   */
  _buildIdQuery(id) {
    try {
      // Check if it's a valid ObjectId
      if (ObjectId.isValid(id)) {
        return { _id: new ObjectId(id) };
      }
      // Otherwise treat as string ID
      return { _id: id };
    } catch (error) {
      return { _id: id };
    }
  }
}

module.exports = BaseRepository; 