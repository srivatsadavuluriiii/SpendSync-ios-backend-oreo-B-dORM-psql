/**
 * Unit tests for User Service
 */

const { createUser, getUser, updateUser, deleteUser, getUsersByGroup } = require('../../src/services/user.service');

// Mock user repository
jest.mock('../../src/repositories/user.repository', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByGroupId: jest.fn()
}));

const userRepository = require('../../src/repositories/user.repository');

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    test('should create a new user', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };
      
      const mockCreatedUser = {
        id: 'user-123',
        ...userData,
        createdAt: new Date().toISOString()
      };
      
      userRepository.create.mockResolvedValue(mockCreatedUser);
      
      // Act
      const result = await createUser(userData);
      
      // Assert
      expect(userRepository.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockCreatedUser);
    });
    
    test('should throw an error if user with email already exists', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };
      
      userRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });
      
      // Act & Assert
      await expect(createUser(userData)).rejects.toThrow('User with this email already exists');
      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
    });
  });
  
  describe('getUser', () => {
    test('should return a user by ID', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };
      
      userRepository.findById.mockResolvedValue(mockUser);
      
      // Act
      const result = await getUser(userId);
      
      // Assert
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockUser);
    });
    
    test('should throw an error if user does not exist', async () => {
      // Arrange
      const userId = 'non-existent-user';
      userRepository.findById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(getUser(userId)).rejects.toThrow('User not found');
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateUser', () => {
    test('should update an existing user', async () => {
      const userId = 'user-123';
      const updateData = { firstName: 'Updated' };
      const mockUser = { id: userId, email: 'test@example.com' };
      const updatedUser = { ...mockUser, ...updateData };
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(updatedUser);
      const result = await updateUser(userId, updateData);
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.update).toHaveBeenCalledWith(userId, updateData);
      expect(result).toEqual(updatedUser);
    });
    test('should throw an error if user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(updateUser('missing-id', { firstName: 'X' })).rejects.toThrow('User not found');
    });
    test('should throw an error if userId or updateData is missing', async () => {
      await expect(updateUser(null, { firstName: 'X' })).rejects.toThrow('User ID and update data are required');
      await expect(updateUser('user-123', null)).rejects.toThrow('User ID and update data are required');
    });
  });

  describe('deleteUser', () => {
    test('should delete an existing user', async () => {
      const userId = 'user-123';
      const mockUser = { id: userId };
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.delete.mockResolvedValue(true);
      const result = await deleteUser(userId);
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.delete).toHaveBeenCalledWith(userId);
      expect(result).toBe(true);
    });
    test('should throw an error if user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(deleteUser('missing-id')).rejects.toThrow('User not found');
    });
    test('should throw an error if userId is missing', async () => {
      await expect(deleteUser(null)).rejects.toThrow('User ID is required');
    });
  });

  describe('getUsersByGroup', () => {
    test('should return users for a group', async () => {
      const groupId = 'group-1';
      const mockUsers = [
        { id: 'user-1', groupId },
        { id: 'user-2', groupId }
      ];
      userRepository.findByGroupId.mockResolvedValue(mockUsers);
      const result = await getUsersByGroup(groupId);
      expect(userRepository.findByGroupId).toHaveBeenCalledWith(groupId);
      expect(result).toEqual(mockUsers);
    });
    test('should throw an error if groupId is missing', async () => {
      await expect(getUsersByGroup(null)).rejects.toThrow('Group ID is required');
    });
  });
}); 