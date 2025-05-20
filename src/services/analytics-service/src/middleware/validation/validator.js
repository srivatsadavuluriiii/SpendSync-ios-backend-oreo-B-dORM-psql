import { schemas } from './schemas.js';

export class ValidationError extends Error {
  constructor(details) {
    super('Validation Error');
    this.name = 'ValidationError';
    this.details = details;
    this.status = 400;
  }
}

export const validate = (schemaName, property = 'body') => {
  return async (req, res, next) => {
    try {
      const schema = schemas[schemaName];
      if (!schema) {
        throw new Error(`Schema ${schemaName} not found`);
      }

      const targetSchema = schema[property];
      if (!targetSchema) {
        throw new Error(`Schema for ${property} not found in ${schemaName}`);
      }

      const validationOptions = {
        abortEarly: false, // Return all errors
        stripUnknown: true, // Remove unknown fields
        convert: true // Convert types when possible
      };

      const value = await targetSchema.validateAsync(req[property], validationOptions);
      
      // Replace request data with validated data
      req[property] = value;
      
      next();
    } catch (error) {
      if (error.isJoi) {
        const details = error.details.map(detail => ({
          field: detail.context.key,
          message: detail.message,
          value: detail.context.value
        }));
        
        next(new ValidationError(details));
      } else {
        next(error);
      }
    }
  };
}; 