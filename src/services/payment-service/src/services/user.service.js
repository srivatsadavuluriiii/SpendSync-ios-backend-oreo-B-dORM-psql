import axios from 'axios';
import { NotFoundError } from '../utils/errors.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:4001';

/**
 * Get user by ID from the User Service
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User object
 */
export const getUserById = async (userId) => {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}`);
    return response.data.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }
    throw error;
  }
};

export default {
  getUserById
}; 