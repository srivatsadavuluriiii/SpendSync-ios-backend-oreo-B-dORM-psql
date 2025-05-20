import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import logger from './utils/logger.js';
import connectDB from './utils/database.js';

// Import routes
import paymentRoutes from './routes/index.js';
import walletRoutes from './routes/wallet.routes.js';
import bankRoutes from './routes/bank.routes.js';

const app = express();

// Connect to MongoDB
connectDB();

// Rate limiting
const limiter = rateLimit(config.rateLimiting);

// Middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(express.json());
app.use(morgan('combined', { stream: logger.stream }));
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: config.app.name,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/bank', bankRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong!',
    ...(config.app.env !== 'production' && { stack: err.stack })
  });
});

// Start server
const server = app.listen(config.app.port, () => {
  logger.info(`${config.app.name} listening on port ${config.app.port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
}); 