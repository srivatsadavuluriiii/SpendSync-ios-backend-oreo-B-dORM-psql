/**
 * Shared Error Classes
 *
 * This module defines custom error classes used across the application
 * to standardize error handling and responses.
 */
/**
 * Base API Error Class
 */
export declare class APIError extends Error {
    statusCode: number;
    isOperational: boolean;
    errorCode: string;
    constructor(message: string, statusCode: number, isOperational?: boolean, errorCode?: string | null);
    /**
     * Serialize error for JSON response
     */
    toJSON(): Record<string, any>;
}
/**
 * Error for resource not found situations
 */
export declare class NotFoundError extends APIError {
    constructor(message?: string, errorCode?: string);
}
/**
 * Error for bad request situations
 */
export declare class BadRequestError extends APIError {
    constructor(message?: string, errorCode?: string);
}
/**
 * Error for unauthorized access attempts
 */
export declare class UnauthorizedError extends APIError {
    constructor(message?: string, errorCode?: string);
}
/**
 * Error for forbidden access attempts
 */
export declare class ForbiddenError extends APIError {
    constructor(message?: string, errorCode?: string);
}
/**
 * Error for validation failures
 */
export declare class ValidationError extends APIError {
    errors: Record<string, any>;
    constructor(message?: string, errors?: Record<string, any>, errorCode?: string);
    /**
     * @override
     */
    toJSON(): Record<string, any>;
}
/**
 * Error for conflicts (e.g., duplicate resources)
 */
export declare class ConflictError extends APIError {
    constructor(message?: string, errorCode?: string);
}
/**
 * Error for service unavailable situations
 */
export declare class ServiceUnavailableError extends APIError {
    constructor(message?: string, errorCode?: string);
}
/**
 * Error for internal server errors
 */
export declare class InternalServerError extends APIError {
    constructor(message?: string, isOperational?: boolean, errorCode?: string);
}
/**
 * Error for database operation failures
 */
export declare class DatabaseError extends APIError {
    originalError: Error | null;
    constructor(message?: string, originalError?: Error | null, errorCode?: string);
    /**
     * @override
     */
    toJSON(): Record<string, any>;
}
