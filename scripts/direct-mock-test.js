/**
 * SpendSync Direct Mock Service Tests
 * 
 * This script tests the mock services directly without going through the API Gateway
 */
const axios = require('axios');

// Helper for colored logging
const log = (msg, type = 'info') => {
  const colors = {
    info: '\x1b[34m', // blue
    success: '\x1b[32m', // green
    error: '\x1b[31m', // red
    warn: '\x1b[33m' // yellow
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}[${type.toUpperCase()}] ${msg}${reset}`);
};

// Create API clients for each service
const userApi = axios.create({
  baseURL: 'http://localhost:4001/api',
  timeout: 5000,
  validateStatus: () => true
});

const expenseApi = axios.create({
  baseURL: 'http://localhost:4002/api',
  timeout: 5000,
  validateStatus: () => true
});

const settlementApi = axios.create({
  baseURL: 'http://localhost:4003/api',
  timeout: 5000,
  validateStatus: () => true
});

const analyticsApi = axios.create({
  baseURL: 'http://localhost:4006/api',
  timeout: 5000,
  validateStatus: () => true
});

// Test scenarios
const testUserService = async () => {
  log('Testing User Service', 'info');
  
  // Test health endpoint
  try {
    const healthResponse = await userApi.get('/health');
    log(`Health check: ${healthResponse.status} - ${JSON.stringify(healthResponse.data)}`, 
        healthResponse.status === 200 ? 'success' : 'error');
  } catch (error) {
    log(`Health check error: ${error.message}`, 'error');
  }
  
  // Test user registration
  try {
    const regResponse = await userApi.post('/auth/register', {
      email: 'newuser@example.com',
      password: 'Password123!',
      name: 'New Test User'
    });
    
    log(`Registration: ${regResponse.status} - ${JSON.stringify(regResponse.data)}`,
        regResponse.status === 201 ? 'success' : 'error');
        
    if (regResponse.status === 201 && regResponse.data.token) {
      log('Registration successful and received token', 'success');
    }
  } catch (error) {
    log(`Registration error: ${error.message}`, 'error');
  }
  
  // Test user login
  try {
    const loginResponse = await userApi.post('/auth/login', {
      email: 'test@example.com',
      password: 'Password123!'
    });
    
    log(`Login: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`,
        loginResponse.status === 200 ? 'success' : 'error');
        
    if (loginResponse.status === 200 && loginResponse.data.token) {
      log('Login successful and received token', 'success');
    }
  } catch (error) {
    log(`Login error: ${error.message}`, 'error');
  }
};

const testExpenseService = async () => {
  log('Testing Expense Service', 'info');
  
  // Test group creation
  try {
    const groupResponse = await expenseApi.post('/groups', {
      name: 'Weekend Trip',
      description: 'Trip to the mountains',
      members: ['user1', 'user2', 'user3']
    });
    
    log(`Group creation: ${groupResponse.status} - ${JSON.stringify(groupResponse.data)}`,
        groupResponse.status === 201 ? 'success' : 'error');
    
    const groupId = groupResponse.data?.data?.id;
    
    if (groupId) {
      // Test expense creation with the group
      try {
        const expenseResponse = await expenseApi.post('/expenses', {
          groupId,
          description: 'Dinner at Italian Restaurant',
          amount: 120.50,
          currency: 'USD',
          paidBy: 'user1',
          date: new Date().toISOString(),
          category: 'food',
          splitType: 'custom',
          splits: [
            { userId: 'user1', amount: 50.25 },
            { userId: 'user2', amount: 40.25 },
            { userId: 'user3', amount: 30.00 }
          ]
        });
        
        log(`Expense creation: ${expenseResponse.status} - ${JSON.stringify(expenseResponse.data)}`,
            expenseResponse.status === 201 ? 'success' : 'error');
      } catch (error) {
        log(`Expense creation error: ${error.message}`, 'error');
      }
      
      // Test getting expenses for a group
      try {
        const groupExpensesResponse = await expenseApi.get(`/groups/${groupId}/expenses`);
        
        log(`Group expenses: ${groupExpensesResponse.status} - ${JSON.stringify(groupExpensesResponse.data)}`,
            groupExpensesResponse.status === 200 ? 'success' : 'error');
      } catch (error) {
        log(`Group expenses error: ${error.message}`, 'error');
      }
    }
  } catch (error) {
    log(`Group creation error: ${error.message}`, 'error');
  }
};

const testSettlementService = async () => {
  log('Testing Settlement Service', 'info');
  
  // We need a group with expenses first
  try {
    // Create a group via expense service
    const groupResponse = await expenseApi.post('/groups', {
      name: 'Weekend Trip',
      description: 'Trip to the mountains',
      members: ['user1', 'user2', 'user3']
    });
    
    const groupId = groupResponse.data?.data?.id;
    
    if (groupId) {
      // Create an expense
      await expenseApi.post('/expenses', {
        groupId,
        description: 'Dinner at Italian Restaurant',
        amount: 120.50,
        paidBy: 'user1',
        splitType: 'custom',
        splits: [
          { userId: 'user1', amount: 50.25 },
          { userId: 'user2', amount: 40.25 },
          { userId: 'user3', amount: 30.00 }
        ]
      });
      
      // Test settlement generation
      try {
        const settlementResponse = await settlementApi.post(`/settlements/generate/${groupId}`);
        
        log(`Settlement generation: ${settlementResponse.status} - ${JSON.stringify(settlementResponse.data)}`,
            settlementResponse.status === 200 ? 'success' : 'error');
        
        const settlementIds = settlementResponse.data?.data?.settlementIds;
        
        if (settlementIds && settlementIds.length > 0) {
          // Test settlement payment
          try {
            const paymentResponse = await settlementApi.post(`/settlements/${settlementIds[0]}/pay`, {
              paymentMethodId: 'pm_card_visa'
            });
            
            log(`Settlement payment: ${paymentResponse.status} - ${JSON.stringify(paymentResponse.data)}`,
                paymentResponse.status === 200 ? 'success' : 'error');
          } catch (error) {
            log(`Settlement payment error: ${error.message}`, 'error');
          }
        }
      } catch (error) {
        log(`Settlement generation error: ${error.message}`, 'error');
      }
    }
  } catch (error) {
    log(`Group creation error: ${error.message}`, 'error');
  }
};

const testAnalyticsService = async () => {
  log('Testing Analytics Service', 'info');
  
  // Test analytics
  try {
    const analyticsResponse = await analyticsApi.get('/analytics/spending', {
      params: {
        timeframe: 'last3Months',
        groupBy: 'category',
        includeCategories: 'food,transport,accommodation',
        aggregation: 'sum'
      }
    });
    
    log(`Analytics: ${analyticsResponse.status} - ${JSON.stringify(analyticsResponse.data)}`,
        analyticsResponse.status === 200 ? 'success' : 'error');
  } catch (error) {
    log(`Analytics error: ${error.message}`, 'error');
  }
};

// Run all tests
const runAllTests = async () => {
  try {
    // Test each service
    await testUserService();
    await testExpenseService();
    await testSettlementService();
    await testAnalyticsService();
    
    log('All tests completed', 'success');
  } catch (error) {
    log(`Error running tests: ${error.message}`, 'error');
    console.error(error);
  }
};

// Run the tests
runAllTests(); 