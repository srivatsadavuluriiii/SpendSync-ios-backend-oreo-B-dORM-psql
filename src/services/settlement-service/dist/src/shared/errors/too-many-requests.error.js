"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TooManyRequestsError = void 0;
/**
 * Custom error class for rate limiting errors
 */
class TooManyRequestsError extends Error {
    constructor(message = 'Too many requests', details = null) {
        super(message);
        this.name = 'TooManyRequestsError';
        this.statusCode = 429;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
