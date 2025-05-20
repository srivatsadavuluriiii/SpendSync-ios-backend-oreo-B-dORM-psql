export const config = {
    port: process.env.PORT || 4003,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/settlements',
    expenseServiceUrl: process.env.EXPENSE_SERVICE_URL || 'http://localhost:4002',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:4001',
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4006'
};
