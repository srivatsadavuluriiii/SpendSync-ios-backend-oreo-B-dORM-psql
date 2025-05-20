import { createLogger, format, transports } from 'winston';

// Configure Winston logger
export const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new transports.File({ 
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Error codes enum
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST'
}

// Base custom error class
export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number,
    errorCode: ErrorCode,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, details);
  }
}

export class PayloadTooLargeError extends BaseError {
  constructor(message: string) {
    super(message, 413, ErrorCode.PAYLOAD_TOO_LARGE, true);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string) {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED, true);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 500, ErrorCode.DATABASE_ERROR, true, details);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(message: string, details?: any) {
    super(message, 502, ErrorCode.EXTERNAL_SERVICE_ERROR, true, details);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(message, 401, ErrorCode.UNAUTHORIZED, true);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string) {
    super(message, 403, ErrorCode.FORBIDDEN, true);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404, ErrorCode.NOT_FOUND, true);
  }
}

// Circuit breaker error
export class CircuitBreakerError extends BaseError {
  constructor(serviceName: string) {
    super(
      `Circuit breaker open for service: ${serviceName}`,
      503,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      true
    );
  }
}

// Error handler middleware
export const errorHandler = (err: any, req: any, res: any, next: any) => {
  // Log error with stack trace and request details
  logger.error('Error occurred:', {
    error: {
      name: err.name,
      message: err.message,
      code: err.errorCode,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
      headers: {
        ...req.headers,
        authorization: undefined // Don't log auth headers
      }
    }
  });

  // Determine if error is operational
  const isOperational = err instanceof BaseError && err.isOperational;

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      code: err.errorCode || ErrorCode.INTERNAL_ERROR,
      message: isOperational ? err.message : 'Internal Server Error',
      details: process.env.NODE_ENV === 'development' ? err.details : undefined,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  // Send response
  res.status(err.statusCode || 500).json(errorResponse);

  // If error is not operational, perform application specific logging and exit
  if (!isOperational) {
    logger.error('Non-operational error occurred:', {
      error: err,
      stack: err.stack
    });
    
    // In production, you might want to restart the process
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Format validation error details
export const formatValidationError = (error: any) => {
  if (!error.details) {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: error.message,
      fields: []
    };
  }

  return {
    code: ErrorCode.VALIDATION_ERROR,
    message: 'Validation failed',
    fields: error.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type,
      value: detail.context?.value
    }))
  };
}; 