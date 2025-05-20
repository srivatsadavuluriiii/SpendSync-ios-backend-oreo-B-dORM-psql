/**
 * TypeScript declaration file for shared middleware
 */
declare module '../../../../shared/middleware' {
  import { Request, Response, NextFunction } from 'express';
  import { 
    AuthOptions, 
    ValidationSchema,
    AuthenticatedRequest 
  } from '../../../../types/middleware';
  
  /**
   * Authentication middleware
   */
  export function authenticate(options?: AuthOptions): (req: Request, res: Response, next: NextFunction) => void;
  
  /**
   * Async handler middleware
   */
  export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): 
    (req: Request, res: Response, next: NextFunction) => Promise<void>;
  
  /**
   * Service authentication middleware
   */
  export function serviceAuth(req: Request, res: Response, next: NextFunction): void;
  
  /**
   * Validation middleware
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
   */
  export function correlationId(req: Request, res: Response, next: NextFunction): void;
}