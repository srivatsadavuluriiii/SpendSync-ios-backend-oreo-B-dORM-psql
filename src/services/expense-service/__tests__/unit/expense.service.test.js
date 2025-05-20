/**
 * Unit tests for Expense Service
 */

const expenseService = require('../../src/services/expense.service');

// Mock repositories
jest.mock('../../src/repositories/expense.repository', () => ({
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByGroupId: jest.fn()
}));

// Import the mocked repository
const expenseRepository = require('../../src/repositories/expense.repository');

describe('Expense Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExpense', () => {
    it('should create a new expense with splits', async () => {
      // Mock data
      const expenseData = {
        amount: 100,
        currency: 'USD',
        description: 'Dinner',
        paidBy: 'user1',
        groupId: 'group1',
        splitBetween: ['user1', 'user2', 'user3']
      };

      // Mock repository response
      const createdExpense = { id: 'expense1', ...expenseData };
      expenseRepository.create.mockResolvedValue(createdExpense);

      // Call service
      const result = await expenseService.createExpense(expenseData);

      // Assert
      expect(expenseRepository.create).toHaveBeenCalledWith(expenseData);
      expect(result).toEqual(createdExpense);
    });

    it('should throw error if required fields are missing', async () => {
      // Call service with invalid data
      await expect(expenseService.createExpense({}))
        .rejects.toThrow('Invalid expense data');
    });
  });

  describe('getExpense', () => {
    it('should return expense by ID', async () => {
      // Mock data
      const expenseId = 'expense1';
      const expense = {
        id: expenseId,
        amount: 100,
        currency: 'USD',
        description: 'Dinner',
        paidBy: 'user1',
        groupId: 'group1',
        splitBetween: ['user1', 'user2', 'user3']
      };

      // Mock repository response
      expenseRepository.findById.mockResolvedValue(expense);

      // Call service
      const result = await expenseService.getExpense(expenseId);

      // Assert
      expect(expenseRepository.findById).toHaveBeenCalledWith(expenseId);
      expect(result).toEqual(expense);
    });

    it('should throw error if expense is not found', async () => {
      // Mock repository response
      expenseRepository.findById.mockResolvedValue(null);

      // Call service
      await expect(expenseService.getExpense('non-existent'))
        .rejects.toThrow('Expense not found');
    });
  });

  describe('updateExpense', () => {
    it('should update an expense', async () => {
      // Mock data
      const expenseId = 'expense1';
      const updateData = {
        amount: 150,
        description: 'Updated dinner'
      };
      const existingExpense = {
        id: expenseId,
        amount: 100,
        currency: 'USD',
        description: 'Dinner',
        paidBy: 'user1'
      };
      const updatedExpense = { ...existingExpense, ...updateData };

      // Mock repository responses
      expenseRepository.findById.mockResolvedValue(existingExpense);
      expenseRepository.update.mockResolvedValue(updatedExpense);

      // Call service
      const result = await expenseService.updateExpense(expenseId, updateData);

      // Assert
      expect(expenseRepository.findById).toHaveBeenCalledWith(expenseId);
      expect(expenseRepository.update).toHaveBeenCalledWith(expenseId, updateData);
      expect(result).toEqual(updatedExpense);
    });

    it('should throw error if expense is not found', async () => {
      // Mock repository response
      expenseRepository.findById.mockResolvedValue(null);

      // Call service
      await expect(expenseService.updateExpense('non-existent', {}))
        .rejects.toThrow('Expense not found');
    });
  });

  describe('deleteExpense', () => {
    it('should delete an expense', async () => {
      // Mock data
      const expenseId = 'expense1';
      const existingExpense = {
        id: expenseId,
        amount: 100,
        currency: 'USD',
        description: 'Dinner',
        paidBy: 'user1'
      };

      // Mock repository responses
      expenseRepository.findById.mockResolvedValue(existingExpense);
      expenseRepository.delete.mockResolvedValue(true);

      // Call service
      const result = await expenseService.deleteExpense(expenseId);

      // Assert
      expect(expenseRepository.findById).toHaveBeenCalledWith(expenseId);
      expect(expenseRepository.delete).toHaveBeenCalledWith(expenseId);
      expect(result).toBe(true);
    });

    it('should throw error if expense is not found', async () => {
      // Mock repository response
      expenseRepository.findById.mockResolvedValue(null);

      // Call service
      await expect(expenseService.deleteExpense('non-existent'))
        .rejects.toThrow('Expense not found');
    });
  });

  describe('getExpensesByGroup', () => {
    it('should return expenses for a group', async () => {
      // Mock data
      const groupId = 'group1';
      const expenses = [
        {
          id: 'expense1',
          amount: 100,
          currency: 'USD',
          description: 'Dinner',
          paidBy: 'user1',
          groupId
        },
        {
          id: 'expense2',
          amount: 50,
          currency: 'USD',
          description: 'Drinks',
          paidBy: 'user2',
          groupId
        }
      ];

      // Mock repository response
      expenseRepository.findByGroupId.mockResolvedValue(expenses);

      // Call service
      const result = await expenseService.getExpensesByGroup(groupId);

      // Assert
      expect(expenseRepository.findByGroupId).toHaveBeenCalledWith(groupId);
      expect(result).toEqual(expenses);
    });

    it('should throw error if groupId is not provided', async () => {
      await expect(expenseService.getExpensesByGroup())
        .rejects.toThrow('Group ID is required');
    });
  });
}); 