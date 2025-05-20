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

class ValidationError extends BaseError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends BaseError {
  constructor(message, details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

class AuthorizationError extends BaseError {
  constructor(message, details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

class NotFoundError extends BaseError {
  constructor(message, details = null) {
    super(message, 404, 'NOT_FOUND_ERROR', details);
  }
}

class ConflictError extends BaseError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

class RateLimitError extends BaseError {
  constructor(message, details = null) {
    super(message, 429, 'RATE_LIMIT_ERROR', details);
  }
}

class DatabaseError extends BaseError {
  constructor(message, details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
    this.isOperational = false; // Database errors might be programmer errors
  }
}

class ServiceError extends BaseError {
  constructor(message, statusCode = 500, errorCode = 'SERVICE_ERROR', details = null) {
    super(message, statusCode, errorCode, details);
  }
}

module.exports = {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ServiceError
}; 