"use strict";
/**
 * Shared Error Classes
 *
 * This module defines custom error classes used across the application
 * to standardize error handling and responses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = exports.InternalServerError = exports.ServiceUnavailableError = exports.ConflictError = exports.ValidationError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.NotFoundError = exports.APIError = void 0;
/**
 * Base API Error Class
 */
class APIError extends Error {
    constructor(message, statusCode, isOperational = true, errorCode = null) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errorCode = errorCode || `ERR_${statusCode}`;
        // Capture stack trace, excluding constructor call
        Error.captureStackTrace(this, this.constructor);
    }
    /**
     * Serialize error for JSON response
     */
    toJSON() {
        return {
            error: {
                name: this.name,
                message: this.message,
                code: this.errorCode,
                statusCode: this.statusCode,
                ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
            }
        };
    }
}
exports.APIError = APIError;
/**
 * Error for resource not found situations
 */
class NotFoundError extends APIError {
    constructor(message = 'Resource not found', errorCode = 'ERR_NOT_FOUND') {
        super(message, 404, true, errorCode);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Error for bad request situations
 */
class BadRequestError extends APIError {
    constructor(message = 'Bad request', errorCode = 'ERR_BAD_REQUEST') {
        super(message, 400, true, errorCode);
        this.name = 'BadRequestError';
    }
}
exports.BadRequestError = BadRequestError;
/**
 * Error for unauthorized access attempts
 */
class UnauthorizedError extends APIError {
    constructor(message = 'Unauthorized access', errorCode = 'ERR_UNAUTHORIZED') {
        super(message, 401, true, errorCode);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
/**
 * Error for forbidden access attempts
 */
class ForbiddenError extends APIError {
    constructor(message = 'Forbidden access', errorCode = 'ERR_FORBIDDEN') {
        super(message, 403, true, errorCode);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
/**
 * Error for validation failures
 */
class ValidationError extends APIError {
    constructor(message = 'Validation failed', errors = {}, errorCode = 'ERR_VALIDATION') {
        super(message, 422, true, errorCode);
        this.name = 'ValidationError';
        this.errors = errors;
    }
    /**
     * @override
     */
    toJSON() {
        const json = super.toJSON();
        json.error.details = this.errors;
        return json;
    }
}
exports.ValidationError = ValidationError;
/**
 * Error for conflicts (e.g., duplicate resources)
 */
class ConflictError extends APIError {
    constructor(message = 'Resource conflict', errorCode = 'ERR_CONFLICT') {
        super(message, 409, true, errorCode);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
/**
 * Error for service unavailable situations
 */
class ServiceUnavailableError extends APIError {
    constructor(message = 'Service unavailable', errorCode = 'ERR_SERVICE_UNAVAILABLE') {
        super(message, 503, true, errorCode);
        this.name = 'ServiceUnavailableError';
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
/**
 * Error for internal server errors
 */
class InternalServerError extends APIError {
    constructor(message = 'Internal server error', isOperational = false, errorCode = 'ERR_INTERNAL') {
        super(message, 500, isOperational, errorCode);
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
/**
 * Error for database operation failures
 */
class DatabaseError extends APIError {
    constructor(message = 'Database operation failed', originalError = null, errorCode = 'ERR_DATABASE') {
        super(message, 500, true, errorCode);
        this.name = 'DatabaseError';
        this.originalError = originalError;
    }
    /**
     * @override
     */
    toJSON() {
        const json = super.toJSON();
        if (process.env.NODE_ENV === 'development' && this.originalError) {
            json.error.originalError = {
                message: this.originalError.message,
                stack: this.originalError.stack
            };
        }
        return json;
    }
}
exports.DatabaseError = DatabaseError;

// Additional error types
class ExternalServiceError extends APIError {
    constructor(message = 'External service error', service = 'unknown', errorCode = 'ERR_EXTERNAL_SERVICE') {
        super(message, 502, true, errorCode);
        this.name = 'ExternalServiceError';
        this.service = service;
    }
}

class RateLimitError extends APIError {
    constructor(message = 'Too many requests', errorCode = 'ERR_RATE_LIMIT') {
        super(message, 429, true, errorCode);
        this.name = 'RateLimitError';
    }
}

class CacheError extends APIError {
    constructor(message = 'Cache error', errorCode = 'ERR_CACHE') {
        super(message, 500, true, errorCode);
        this.name = 'CacheError';
    }
}

class FileSystemError extends APIError {
    constructor(message = 'File system error', errorCode = 'ERR_FILE_SYSTEM') {
        super(message, 500, true, errorCode);
        this.name = 'FileSystemError';
    }
}

class NetworkError extends APIError {
    constructor(message = 'Network error', errorCode = 'ERR_NETWORK') {
        super(message, 503, true, errorCode);
        this.name = 'NetworkError';
    }
}

class TimeoutError extends APIError {
    constructor(message = 'Request timeout', errorCode = 'ERR_TIMEOUT') {
        super(message, 504, true, errorCode);
        this.name = 'TimeoutError';
    }
}

// Export additional error types
exports.ExternalServiceError = ExternalServiceError;
exports.RateLimitError = RateLimitError;
exports.CacheError = CacheError;
exports.FileSystemError = FileSystemError;
exports.NetworkError = NetworkError;
exports.TimeoutError = TimeoutError;
//# sourceMappingURL=index.js.map