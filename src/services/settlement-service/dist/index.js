/// <reference path="./types/modules.d.ts" />
/// <reference path="./types/middleware.d.ts" />
/**
 * Settlement Service
 *
 * Main entry point for the Settlement Service that handles
 * debt optimization and settlement tracking
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { json } from 'express';
import mongoose from 'mongoose';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
const app = express();
// Middleware
app.use(cors());
app.use(helmet());
app.use(json());
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
const PORT = 4003;
// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
// Connect to MongoDB
async function startServer() {
    try {
        if (config.env !== 'development') {
            await mongoose.connect(config.mongodb.uri);
            logger.info('Connected to MongoDB');
        }
        else {
            logger.warn('Running in development mode without MongoDB connection');
        }
        const server = app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
        });
        server.on('error', (error) => {
            logger.error('Server error:', error);
            process.exit(1);
        });
    }
    catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer().catch((error) => {
    logger.error('Failed to start application:', error);
    process.exit(1);
});
export { app };
//# sourceMappingURL=index.js.map