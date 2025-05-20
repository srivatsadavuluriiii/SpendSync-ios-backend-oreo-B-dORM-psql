/**
 * Database Configuration
 * 
 * Contains configuration for connecting to MongoDB database
 */
const env = process.env.NODE_ENV || 'development';

// Default configurations for different environments
const configs = {
  development: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DBNAME || 'spendsync_dev',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  test: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DBNAME || 'spendsync_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  production: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DBNAME || 'spendsync',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      retryWrites: true,
      w: 'majority'
    }
  }
};

// Export the configuration for the current environment
module.exports = configs[env]; 