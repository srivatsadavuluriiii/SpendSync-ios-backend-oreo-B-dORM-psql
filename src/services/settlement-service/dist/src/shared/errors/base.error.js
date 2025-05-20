"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceError = exports.DatabaseError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.BaseError = void 0;
class BaseError extends Error {
    constructor(message, statusCode, errorCode, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
        this.isOperational = true; // Used to distinguish operational errors from programmer errors
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                code: this.errorCode,
                statusCode: this.statusCode,
                timestamp: this.timestamp,
                details: this.details
            }
        };
    }
    static isOperationalError(error) {
        if (error instanceof BaseError) {
            return error.isOperational;
        }
        return false;
    }
}
exports.BaseError = BaseError;
class ValidationError extends BaseError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends BaseError {
    constructor(message, details = null) {
        super(message, 401, 'AUTHENTICATION_ERROR', details);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends BaseError {
    constructor(message, details = null) {
        super(message, 403, 'AUTHORIZATION_ERROR', details);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends BaseError {
    constructor(message, details = null) {
        super(message, 404, 'NOT_FOUND_ERROR', details);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends BaseError {
    constructor(message, details = null) {
        super(message, 409, 'CONFLICT_ERROR', details);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends BaseError {
    constructor(message, details = null) {
        super(message, 429, 'RATE_LIMIT_ERROR', details);
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends BaseError {
    constructor(message, details = null) {
        super(message, 500, 'DATABASE_ERROR', details);
        this.isOperational = false; // Database errors might be programmer errors
    }
}
exports.DatabaseError = DatabaseError;
class ServiceError extends BaseError {
    constructor(message, statusCode = 500, errorCode = 'SERVICE_ERROR', details = null) {
        super(message, statusCode, errorCode, details);
    }
}
exports.ServiceError = ServiceError;
