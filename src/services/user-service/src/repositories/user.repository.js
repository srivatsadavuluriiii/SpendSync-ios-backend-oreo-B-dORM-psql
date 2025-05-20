/**
 * User Repository
 * 
 * Handles data access for users
 */
const BaseRepository = require('../../../../shared/database/repositories/base.repository');
const UserModel = require('../models/user.model');
const { ConflictError } = require('../../../../shared/errors');

class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User document or null
   */
  async findByEmail(email) {
    const users = await this.find({ email: email.toLowerCase() });
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData, password) {
    // Check if email is already in use
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('Email is already in use');
    }

    // Hash password
    const passwordHash = await UserModel.hashPassword(password);

    // Create user data
    const user = UserModel.create({
      ...userData,
      email: userData.email.toLowerCase(),
      passwordHash
    });

    // Store in database
    return this.create(user);
  }

  /**
   * Update a user's password
   * @param {string} userId - User ID
   * @param {string} newPassword - New plain text password
   * @returns {Promise<boolean>} Success indicator
   */
  async updatePassword(userId, newPassword) {
    const passwordHash = await UserModel.hashPassword(newPassword);
    
    const user = await this.update(userId, {
      passwordHash,
      updatedAt: UserModel.timestamp()
    });

    return !!user;
  }

  /**
   * Find users by IDs
   * @param {Array<string>} ids - User IDs
   * @returns {Promise<Array>} User documents
   */
  async findByIds(ids) {
    if (!ids || ids.length === 0) {
      return [];
    }

    // Build queries for each ID
    const queries = ids.map(id => this._buildIdQuery(id));
    
    return this.find({ $or: queries });
  }

  /**
   * Search users by name or email
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} User documents
   */
  async search(searchTerm, options = {}) {
    const { limit = 20, skip = 0 } = options;
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }
    
    const query = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    };
    
    return this.find(query, { limit, skip });
  }
}

module.exports = new UserRepository(); 