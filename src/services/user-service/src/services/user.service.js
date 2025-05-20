const userRepository = require('../repositories/user.repository');
const { BadRequestError, NotFoundError } = require('@shared/errors');

/**
 * Create a new user
 * @param {Object} userData User data
 * @returns {Promise<Object>} Created user
 */
async function createUser(userData) {
  if (!userData || !userData.email) {
    throw new BadRequestError('Invalid user data');
  }

  const existingUser = await userRepository.findByEmail(userData.email);
  if (existingUser) {
    throw new BadRequestError('User with this email already exists');
  }

  return userRepository.create(userData);
}

/**
 * Get user by ID
 * @param {string} userId User ID
 * @returns {Promise<Object>} User object
 */
async function getUser(userId) {
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

/**
 * Update user
 * @param {string} userId User ID
 * @param {Object} updateData Update data
 * @returns {Promise<Object>} Updated user
 */
async function updateUser(userId, updateData) {
  if (!userId || !updateData) {
    throw new BadRequestError('User ID and update data are required');
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return userRepository.update(userId, updateData);
}

/**
 * Delete user
 * @param {string} userId User ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteUser(userId) {
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  return userRepository.delete(userId);
}

/**
 * Get users by group
 * @param {string} groupId Group ID
 * @returns {Promise<Array>} List of users
 */
async function getUsersByGroup(groupId) {
  if (!groupId) {
    throw new BadRequestError('Group ID is required');
  }

  return userRepository.findByGroupId(groupId);
}

module.exports = {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getUsersByGroup
}; 