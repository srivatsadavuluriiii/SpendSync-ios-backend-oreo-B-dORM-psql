const express = require('express');
const app = express();
const PORT = 3002; // Match the port expected by the gateway for Expense Service
const axios = require('axios');

// In-memory storage for expenses
const expenses = [];
const balances = {};

// Enable JSON parsing
app.use(express.json());

// Health check endpoint - this is used by the circuit breaker
app.get('/health', (req, res) => {
  res.json({ status: 'UP' });
});

// Get expenses
app.get('/api/v1/expenses', (req, res) => {
  const { userId, groupId } = req.query;
  
  let result = [...expenses];
  
  if (userId) {
    result = result.filter(exp => 
      exp.paidBy === userId || exp.participants.some(p => p.userId === userId)
    );
  }
  
  if (groupId) {
    result = result.filter(exp => exp.groupId === groupId);
  }
  
  res.json({
    success: true,
    count: result.length,
    expenses: result
  });
});

// Create expense
app.post('/api/v1/expenses', async (req, res) => {
  const { description, amount, paidBy, groupId, participants, currency = 'USD' } = req.body;
  
  if (!description || !amount || !paidBy || !participants || !Array.isArray(participants)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid expense data'
      }
    });
  }
  
  // Generate ID
  const expenseId = Date.now().toString();
  
  // Create expense object
  const expense = {
    id: expenseId,
    description,
    amount: parseFloat(amount),
    currency,
    paidBy,
    groupId,
    participants,
    createdAt: new Date().toISOString()
  };
  
  expenses.push(expense);
  
  // Update balances
  updateBalances(expense);
  
  // Notify users about the new expense
  try {
    await notifyParticipants(expense);
  } catch (error) {
    console.error('Failed to notify participants:', error.message);
  }
  
  res.status(201).json({
    success: true,
    expense
  });
});

// Calculate balances within a group
app.get('/api/v1/expenses/balances', (req, res) => {
  const { groupId } = req.query;
  
  // Filter balances by group if specified
  const result = {};
  
  if (groupId) {
    Object.entries(balances).forEach(([userId, userBalances]) => {
      if (userBalances[groupId]) {
        result[userId] = { [groupId]: userBalances[groupId] };
      }
    });
  } else {
    Object.assign(result, balances);
  }
  
  res.json({
    success: true,
    balances: result
  });
});

// Internal: Update balances based on expense
function updateBalances(expense) {
  const { amount, paidBy, participants, groupId } = expense;
  const totalParticipants = participants.length;
  const sharePerPerson = amount / totalParticipants;
  
  // Ensure payer has a balance record
  if (!balances[paidBy]) {
    balances[paidBy] = {};
  }
  
  if (!balances[paidBy][groupId]) {
    balances[paidBy][groupId] = { owes: {}, isOwed: {} };
  }
  
  // Process each participant
  participants.forEach(participant => {
    const { userId } = participant;
    
    // Skip the payer
    if (userId === paidBy) return;
    
    // Ensure participant has a balance record
    if (!balances[userId]) {
      balances[userId] = {};
    }
    
    if (!balances[userId][groupId]) {
      balances[userId][groupId] = { owes: {}, isOwed: {} };
    }
    
    // Update payer's balance (they are owed money)
    if (!balances[paidBy][groupId].isOwed[userId]) {
      balances[paidBy][groupId].isOwed[userId] = 0;
    }
    balances[paidBy][groupId].isOwed[userId] += sharePerPerson;
    
    // Update participant's balance (they owe money)
    if (!balances[userId][groupId].owes[paidBy]) {
      balances[userId][groupId].owes[paidBy] = 0;
    }
    balances[userId][groupId].owes[paidBy] += sharePerPerson;
  });
}

// Internal: Notify participants about a new expense
async function notifyParticipants(expense) {
  try {
    // Call notification service
    await axios.post('http://localhost:3004/api/v1/notifications', {
      type: 'expense_created',
      data: {
        expenseId: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        paidBy: expense.paidBy,
        groupId: expense.groupId
      },
      recipients: [expense.paidBy, ...expense.participants.map(p => p.userId)]
    });
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Failed to send notification:', error.message);
    // Continue execution even if notification fails (fault tolerance)
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Mock Expense Service running on port ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Get expenses: http://localhost:${PORT}/api/v1/expenses`);
  console.log(`Create expense: http://localhost:${PORT}/api/v1/expenses (POST)`);
  console.log(`Get balances: http://localhost:${PORT}/api/v1/expenses/balances`);
}); 