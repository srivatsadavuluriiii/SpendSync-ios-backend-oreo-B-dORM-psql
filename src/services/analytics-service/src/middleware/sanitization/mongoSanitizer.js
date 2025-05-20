import { escape } from 'mongo-sanitize';

/**
 * Recursively sanitize an object's values
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip internal MongoDB operators
    if (key.startsWith('$')) {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = escape(value);
    }
  }
  return sanitized;
};

/**
 * Middleware to sanitize MongoDB queries
 */
export const sanitizeQuery = () => {
  return (req, res, next) => {
    try {
      // Sanitize query parameters
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }

      // Sanitize request body
      if (req.body) {
        req.body = sanitizeObject(req.body);
      }

      // Sanitize URL parameters
      if (req.params) {
        req.params = sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Sanitize MongoDB aggregation pipeline
 * @param {Array} pipeline - Aggregation pipeline to sanitize
 * @returns {Array} - Sanitized pipeline
 */
export const sanitizeAggregation = (pipeline) => {
  return pipeline.map(stage => {
    const sanitized = {};
    for (const [key, value] of Object.entries(stage)) {
      // Preserve MongoDB operators
      if (key.startsWith('$')) {
        if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  });
};

/**
 * Sanitize individual MongoDB query
 * @param {Object} query - Query to sanitize
 * @returns {Object} - Sanitized query
 */
export const sanitizeMongoQuery = (query) => {
  return sanitizeObject(query);
}; 