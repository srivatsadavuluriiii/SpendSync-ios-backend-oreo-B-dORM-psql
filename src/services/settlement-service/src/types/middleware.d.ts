/**
 * Type declarations for middleware modules
 */

// Declare the module with a non-relative path
declare module 'shared-middleware' {
  import { Request, Response, NextFunction } from 'express';
  
  export function authenticate(req: Request, res: Response, next: NextFunction): void;
  export function asyncHandler(fn: Function): (req: Request, res: Response, next: NextFunction) => Promise<void>;
  export function validate(schema: any): (req: Request, res: Response, next: NextFunction) => void;
  export function serviceAuth(req: Request, res: Response, next: NextFunction): void;
  export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void;
}

// Also declare commonly used modules without types
declare module 'morgan';

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      cache?: {
        redis?: any;
      };
    }
  }
}

export interface CustomRequest extends Request {
  cache?: {
    redis?: any;
  };
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export type RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void; 