/**
 * SpendSync Test Scenarios
 * 
 * This script simulates various real-world scenarios to test integration
 * between services and complex database queries.
 */
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:4050/api/v1';
const TEST_USER = {
  email: 'test@example.com',
  password: 'Password123!',
  name: 'Test User'
};
let authToken = null;

// Helper methods
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

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
  validateStatus: () => true // Don't throw on errors
});

api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Test scenarios
const scenarios = {
  // User Service Tests
  async registerUser() {
    log('Scenario: User Registration');
    const response = await api.post('/auth/register', TEST_USER);
    log(`Response: ${response.status} - ${JSON.stringify(response.data, null, 2)}`, 
        response.status === 201 ? 'success' : 'error');
    return response;
  },
  
  async loginUser() {
    log('Scenario: User Login');
    const response = await api.post('/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.status === 200 && response.data.token) {
      authToken = response.data.token;
      log('Successfully logged in and stored auth token', 'success');
    } else {
      log(`Failed to login: ${JSON.stringify(response.data)}`, 'error');
    }
    
    return response;
  },
  
  // Expense Service Tests
  async createGroup() {
    log('Scenario: Creating a new group');
    const groupData = {
      name: 'Weekend Trip',
      description: 'Trip to the mountains',
      members: [] // Would normally include other user IDs
    };
    
    const response = await api.post('/groups', groupData);
    log(`Response: ${response.status} - ${JSON.stringify(response.data, null, 2)}`,
        response.status === 201 ? 'success' : 'error');
    
    return response.data?.data?.id;
  },
  
  async createExpense(groupId) {
    log('Scenario: Creating a complex expense with custom splits');
    const expenseData = {
      groupId,
      description: 'Dinner at Italian Restaurant',
      amount: 120.50,
      currency: 'USD',
      paidBy: 'currentUser', // In a real app, this would be a user ID
      date: new Date().toISOString(),
      category: 'food',
      // Complex split example
      splitType: 'custom',
      splits: [
        { userId: 'currentUser', amount: 50.25 },
        { userId: 'user2', amount: 40.25 },
        { userId: 'user3', amount: 30.00 }
      ]
    };
    
    const response = await api.post('/expenses', expenseData);
    log(`Response: ${response.status} - ${JSON.stringify(response.data, null, 2)}`,
        response.status === 201 ? 'success' : 'error');
    
    return response.data?.data?.id;
  },
  
  // Settlement Service Tests
  async generateSettlements(groupId) {
    log('Scenario: Generating optimal settlements for a group');
    const response = await api.post(`/settlements/generate/${groupId}`);
    log(`Response: ${response.status} - ${JSON.stringify(response.data, null, 2)}`,
        response.status === 200 ? 'success' : 'error');
    
    return response.data?.data?.settlementIds;
  },
  
  async processSettlement(settlementId) {
    log('Scenario: Processing a settlement payment');
    const paymentData = {
      paymentMethodId: 'pm_card_visa', // Simulated payment method ID
      settlementId
    };
    
    const response = await api.post(`/settlements/${settlementId}/pay`, paymentData);
    log(`Response: ${response.status} - ${JSON.stringify(response.data, null, 2)}`,
        response.status === 200 ? 'success' : 'error');
    
    return response;
  },
  
  // Analytics Service Tests
  async getSpendingAnalytics() {
    log('Scenario: Getting complex spending analytics with filters');
    const params = {
      timeframe: 'last3Months',
      groupBy: 'category',
      includeCategories: 'food,transport,accommodation',
      excludeGroups: '',
      aggregation: 'sum'
    };
    
    const response = await api.get('/analytics/spending', { params });
    log(`Response: ${response.status} - ${JSON.stringify(response.data, null, 2)}`,
        response.status === 200 ? 'success' : 'error');
    
    return response;
  },
  
  // Complex Multi-Service Scenario
  async complexWorkflow() {
    log('COMPLEX WORKFLOW: Trip Expense Management', 'info');
    log('Step 1: Login user', 'info');
    await this.loginUser();
    
    log('Step 2: Create a new group', 'info');
    const groupId = await this.createGroup();
    
    log('Step 3: Add multiple expenses with different split types', 'info');
    const expenseId1 = await this.createExpense(groupId);
    
    log('Step 4: Generate settlements', 'info');
    const settlementIds = await this.generateSettlements(groupId);
    
    if (settlementIds && settlementIds.length > 0) {
      log('Step 5: Process a settlement payment', 'info');
      await this.processSettlement(settlementIds[0]);
    }
    
    log('Step 6: Get spending analytics', 'info');
    await this.getSpendingAnalytics();
    
    log('Complex workflow complete!', 'success');
  }
};

// Execute a specific scenario
const runScenario = async (scenarioName) => {
  try {
    log(`Running scenario: ${scenarioName}`, 'info');
    await scenarios[scenarioName]();
  } catch (error) {
    log(`Error running ${scenarioName}: ${error.message}`, 'error');
    console.error(error);
  }
};

// Run all scenarios in sequence
const runAllScenarios = async () => {
  try {
    log('Running test scenarios without health check', 'info');
    
    // Skip health check and run full workflow directly
    await scenarios.complexWorkflow();
  } catch (error) {
    log(`Error running scenarios: ${error.message}`, 'error');
    console.error(error);
  }
};

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length > 0 && scenarios[args[0]]) {
  runScenario(args[0]);
} else {
  runAllScenarios();
} 