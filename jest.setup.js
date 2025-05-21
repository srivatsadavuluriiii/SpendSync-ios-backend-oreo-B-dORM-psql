// Mock Redis using the ioredis we just installed
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    scan: jest.fn().mockReturnValue([0, []]),
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    pipeline: jest.fn().mockReturnValue({
      get: jest.fn(),
      setex: jest.fn(),
      exec: jest.fn().mockResolvedValue([])
    })
  };
  return jest.fn(() => mockRedis);
});

// Mock MongoDB
jest.mock('mongoose', () => {
  const mockMongoose = {
    connect: jest.fn().mockResolvedValue({}),
    model: jest.fn().mockReturnValue({
      findById: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
        lean: jest.fn().mockReturnThis(),
      }),
      create: jest.fn().mockResolvedValue({ _id: 'mockid', save: jest.fn() }),
      updateOne: jest.fn().mockResolvedValue({ nModified: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ n: 1 }),
      startSession: jest.fn().mockReturnValue({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        abortTransaction: jest.fn(),
        endSession: jest.fn()
      })
    }),
    Schema: jest.fn().mockReturnValue({})
  };
  return mockMongoose;
});

// Mock Prometheus metrics
jest.mock('express-prometheus-middleware', () => {
  return jest.fn(() => (req, res, next) => next());
});

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_mock123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_mock123' })
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_mock123', client_secret: 'secret_mock123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_mock123', status: 'succeeded' }),
      cancel: jest.fn().mockResolvedValue({ id: 'pi_mock123', status: 'canceled' })
    }
  }));
});

// Mock Plaid
jest.mock('plaid', () => {
  const PlaidApi = jest.fn().mockImplementation(() => ({
    itemGet: jest.fn().mockResolvedValue({}),
    accountsGet: jest.fn().mockResolvedValue({}),
    transactionsGet: jest.fn().mockResolvedValue({})
  }));
  
  return {
    Configuration: jest.fn(),
    PlaidApi,
    PlaidEnvironments: {
      sandbox: 'https://sandbox.plaid.com',
      development: 'https://development.plaid.com',
      production: 'https://production.plaid.com'
    }
  };
}); 