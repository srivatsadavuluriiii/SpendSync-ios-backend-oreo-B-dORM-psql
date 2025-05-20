/**
 * Integration test for Expense-Settlement Service interaction using mocks
 */

const express = require('express');
const request = require('supertest');

// Create a simple express app for testing
const app = express();

// Mock expense endpoint
app.get('/api/v1/expenses/:expenseId', (req, res) => {
  const expenseId = req.params.expenseId;
  
  res.json({
    success: true,
    data: {
      id: expenseId,
      title: 'Test Expense',
      amount: 100,
      currency: 'USD',
      payerId: 'user1',
      groupId: 'group1',
      participants: ['user1', 'user2', 'user3'],
      splitType: 'equal',
      createdAt: new Date().toISOString()
    }
  });
});

// Mock settlement endpoint
app.get('/api/v1/settlements/suggestions/:groupId', (req, res) => {
  const groupId = req.params.groupId;
  const algorithm = req.query.algorithm || 'minCashFlow';
  
  res.json({
    success: true,
    data: {
      settlements: [
        {
          from: 'user2',
          to: 'user1',
          amount: 33.33,
          currency: 'USD'
        },
        {
          from: 'user3',
          to: 'user1',
          amount: 33.33,
          currency: 'USD'
        }
      ],
      algorithm,
      preferredCurrency: 'USD'
    }
  });
});

// Create settlement from expense endpoint
app.post('/api/v1/settlements/from-expense/:expenseId', (req, res) => {
  const expenseId = req.params.expenseId;
  
  res.status(201).json({
    success: true,
    data: {
      settlementIds: ['settlement1', 'settlement2'],
      sourceExpense: expenseId,
      createdAt: new Date().toISOString()
    }
  });
});

describe('Expense-Settlement Integration', () => {
  test('should retrieve expense details', async () => {
    const response = await request(app)
      .get('/api/v1/expenses/exp123')
      .expect('Content-Type', /json/)
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('id', 'exp123');
    expect(response.body.data).toHaveProperty('amount', 100);
  });
  
  test('should retrieve settlement suggestions for a group', async () => {
    const response = await request(app)
      .get('/api/v1/settlements/suggestions/group1')
      .expect('Content-Type', /json/)
      .expect(200);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('settlements');
    expect(Array.isArray(response.body.data.settlements)).toBe(true);
    expect(response.body.data.settlements).toHaveLength(2);
  });
  
  test('should create settlements from an expense', async () => {
    const response = await request(app)
      .post('/api/v1/settlements/from-expense/exp123')
      .expect('Content-Type', /json/)
      .expect(201);
    
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('settlementIds');
    expect(response.body.data).toHaveProperty('sourceExpense', 'exp123');
  });
}); 