"use strict";
/**
 * CORS Middleware
 *
 * Configures Cross-Origin Resource Sharing for the API.
 */
const cors = require('cors');
// List of allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://spendsync.com'];
// CORS options
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, etc)
        if (!origin) {
            return callback(null, true);
        }
        // Check if origin is in the allowed list
        if (allowedOrigins.indexOf(origin) !== -1 ||
            // Allow development origins
            (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost'))) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token'],
    credentials: true, // Allow cookies to be sent
    maxAge: 86400, // Cache preflight request for 24 hours
    preflightContinue: false
};
// Create CORS middleware
const corsMiddleware = cors(corsOptions);
module.exports = corsMiddleware;
