import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

/**
 * Interface for validation schema structure
 */
export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

/**
 * Creates a validation middleware using the provided schema
 * @param schema Validation schema for request components
 */
export const validateRequest = (schema: ValidationSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationObject: any = {};
      
      if (schema.body) {
        validationObject.body = req.body;
      }
      if (schema.query) {
        validationObject.query = req.query;
      }
      if (schema.params) {
        validationObject.params = req.params;
      }
      if (schema.headers) {
        validationObject.headers = req.headers;
      }

      const validatedData = await Joi.object(schema).validateAsync(validationObject, {
        abortEarly: false,
        stripUnknown: true,
      });

      // Attach validated data to request
      Object.assign(req, validatedData);
      
      next();
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        next(new ValidationError(error.message, error.details));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Size limit middleware factory
 * @param limit Size limit in bytes or human readable format (e.g., '50kb')
 */
export const sizeLimit = (limit: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSize = typeof limit === 'string' ? 
      parseSize(limit) : 
      limit;

    if (contentLength > maxSize) {
      return next(new ValidationError(`Payload size exceeds limit of ${limit}`));
    }
    next();
  };
};

/**
 * Parse human readable size to bytes
 * @param size Size string (e.g., '50kb')
 */
function parseSize(size: string): number {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.match(/^(\d+)(\w+)$/);
  if (!match) {
    throw new Error('Invalid size format');
  }

  const [, value, unit] = match;
  const multiplier = units[unit.toLowerCase() as keyof typeof units];
  
  if (!multiplier) {
    throw new Error('Invalid size unit');
  }

  return parseInt(value, 10) * multiplier;
}

/**
 * MongoDB query sanitization
 * @param obj Object to sanitize
 */
export const sanitizeMongoQuery = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeMongoQuery);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Remove MongoDB operators from user input
    if (key.startsWith('$')) {
      continue;
    }

    // Recursively sanitize nested objects
    sanitized[key] = sanitizeMongoQuery(value);
  }

  return sanitized;
};

/**
 * Sanitize aggregation pipeline
 * @param pipeline Aggregation pipeline to sanitize
 */
export const sanitizeAggregatePipeline = (pipeline: any[]): any[] => {
  return pipeline.map(stage => {
    const sanitizedStage: any = {};
    
    for (const [operator, value] of Object.entries(stage)) {
      // Only allow valid MongoDB aggregation operators
      if (operator.startsWith('$') && isValidAggregationOperator(operator)) {
        sanitizedStage[operator] = sanitizeMongoQuery(value);
      }
    }
    
    return sanitizedStage;
  });
};

/**
 * Check if aggregation operator is valid
 * @param operator Operator to check
 */
function isValidAggregationOperator(operator: string): boolean {
  const validOperators = new Set([
    '$match', '$group', '$sort', '$limit', '$skip',
    '$project', '$unwind', '$lookup', '$count'
  ]);
  return validOperators.has(operator);
} 