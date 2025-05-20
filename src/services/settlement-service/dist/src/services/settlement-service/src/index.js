/// <reference path="./types/modules.d.ts" />
/// <reference path="./types/middleware.d.ts" />
/**
 * Settlement Service
 *
 * Main entry point for the Settlement Service that handles
 * debt optimization and settlement tracking
 */
import express from 'express';
import { json } from 'express';
import cors from 'cors';
import { config } from './config/config';
const app = express();
// Middleware
app.use(cors());
app.use(json());
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        service: 'settlement-service'
    });
});
// Start server
const port = config.port || 3003;
app.listen(port, () => {
    console.log(`Settlement Service running on port ${port}`);
    console.log(`Health check available at http://localhost:${port}/health`);
});
export { app };
