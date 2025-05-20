/**
 * Type definitions for shared middleware
 */
import { Request, Response, NextFunction } from 'express';
import { User } from './index';

/**
 * Extended Express Request with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
  isServiceRequest?: boolean;
  serviceId?: string;
}

/**
 * Authentication options
 */
export interface AuthOptions {
  required?: boolean;
  roles?: string[];
}

/**
 * Validation schema (Joi or similar)
 */
export interface ValidationSchema {
  validate: (data: any) => { 
    error?: { 
      details: Array<{ 
        message: string;
        path: string[];
        type: string;
      }> 
    };
    value: any;
  };
}

/**
 * Middleware functions
 */
export namespace Middleware {
  /**
   * Authentication middleware for user authentication
   */
  export function authenticate(options?: AuthOptions): (req: Request, res: Response, next: NextFunction) => void;

  /**
   * Async handler middleware to handle errors in async route handlers
   */
  export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): 
    (req: Request, res: Response, next: NextFunction) => Promise<void>;

  /**
   * Service authentication middleware for inter-service authentication
   */
  export function serviceAuth(req: Request, res: Response, next: NextFunction): void;

  /**
   * Validation middleware for request validation
   * @param schema - Validation schema (Joi schema or similar)
   * @param source - Source of data to validate (body, query, params)
   */
  export function validate(
    schema: ValidationSchema, 
    source?: 'body' | 'query' | 'params' | 'all'
  ): (req: Request, res: Response, next: NextFunction) => void;

  /**
   * Error handling middleware
   */
  export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void;

  /**
   * Rate limiting middleware
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
   */
  export function requestLogger(req: Request, res: Response, next: NextFunction): void;

  /**
   * Correlation ID middleware
   * Adds a unique correlation ID to each request for tracing
   */
  export function correlationId(req: Request, res: Response, next: NextFunction): void;
} 