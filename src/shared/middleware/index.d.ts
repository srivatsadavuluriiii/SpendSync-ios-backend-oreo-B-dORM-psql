import { Request, Response, NextFunction } from 'express';
import {
  AuthOptions,
  ValidationSchema,
  AuthenticatedRequest
} from '../../types/middleware';

/**
 * Authentication middleware for user authentication
 * Verifies JWT token and attaches user information to request
 * 
 * @param options - Authentication options such as required roles
 */
export function authenticate(options?: AuthOptions): (req: Request, res: Response, next: NextFunction) => void;

/**
 * Async handler middleware to handle errors in async route handlers
 * Catches errors in async functions and forwards them to the error handler
 * 
 * @param fn - Async function to wrap
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): 
  (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Service authentication middleware for inter-service authentication
 * Verifies service-to-service calls using API keys or JWT tokens
 */
export function serviceAuth(req: Request, res: Response, next: NextFunction): void;

/**
 * Validation middleware for request validation
 * Validates request data against a schema
 * 
 * @param schema - Validation schema (Joi schema or similar)
 * @param source - Source of data to validate (defaults to 'body')
 */
export function validate(
  schema: ValidationSchema, 
  source?: 'body' | 'query' | 'params' | 'all'
): (req: Request, res: Response, next: NextFunction) => void;

/**
 * Error handling middleware
 * Processes errors and sends standardized error responses
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void;

/**
 * Rate limiting middleware
 * Limits number of requests from a single IP within a time window
 */
export function rateLimit(options: {
  windowMs?: number;
  max?: number;
  message?: string | object;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
}): (req: Request, res: Response, next: NextFunction) => void;

/**
 * Request logging middleware
 * Logs incoming requests for debugging and monitoring
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void;

/**
 * Correlation ID middleware
 * Adds a unique correlation ID to each request for tracing
 */
export function correlationId(req: Request, res: Response, next: NextFunction): void; 