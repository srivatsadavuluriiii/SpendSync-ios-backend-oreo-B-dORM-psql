/**
 * Shared Error Classes
 *
 * This module defines custom error classes used across the application
 * to standardize error handling and responses.
 */
/**
 * Base API Error Class
 */
export class APIError extends Error {
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
/**
 * Error for resource not found situations
 */
export class NotFoundError extends APIError {
    constructor(message = 'Resource not found', errorCode = 'ERR_NOT_FOUND') {
        super(message, 404, true, errorCode);
        this.name = 'NotFoundError';
    }
}
/**
 * Error for bad request situations
 */
export class BadRequestError extends APIError {
    constructor(message = 'Bad request', errorCode = 'ERR_BAD_REQUEST') {
        super(message, 400, true, errorCode);
        this.name = 'BadRequestError';
    }
}
/**
 * Error for unauthorized access attempts
 */
export class UnauthorizedError extends APIError {
    constructor(message = 'Unauthorized access', errorCode = 'ERR_UNAUTHORIZED') {
        super(message, 401, true, errorCode);
        this.name = 'UnauthorizedError';
    }
}
/**
 * Error for forbidden access attempts
 */
export class ForbiddenError extends APIError {
    constructor(message = 'Forbidden access', errorCode = 'ERR_FORBIDDEN') {
        super(message, 403, true, errorCode);
        this.name = 'ForbiddenError';
    }
}
/**
 * Error for validation failures
 */
export class ValidationError extends APIError {
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
/**
 * Error for conflicts (e.g., duplicate resources)
 */
export class ConflictError extends APIError {
    constructor(message = 'Resource conflict', errorCode = 'ERR_CONFLICT') {
        super(message, 409, true, errorCode);
        this.name = 'ConflictError';
    }
}
/**
 * Error for service unavailable situations
 */
export class ServiceUnavailableError extends APIError {
    constructor(message = 'Service unavailable', errorCode = 'ERR_SERVICE_UNAVAILABLE') {
        super(message, 503, true, errorCode);
        this.name = 'ServiceUnavailableError';
    }
}
/**
 * Error for internal server errors
 */
export class InternalServerError extends APIError {
    constructor(message = 'Internal server error', isOperational = false, errorCode = 'ERR_INTERNAL') {
        super(message, 500, isOperational, errorCode);
        this.name = 'InternalServerError';
    }
}
/**
 * Error for database operation failures
 */
export class DatabaseError extends APIError {
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
