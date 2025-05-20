const { BadRequestError } = require('../errors');

/**
 * Creates a validation middleware using the provided schema
 * @param {Object} schema - Joi schema object
 * @returns {Function} Express middleware function
 */
const validate = (schema) => (req, res, next) => {
  // Determine which parts of the request to validate
  const validationTargets = {
    params: req.params,
    query: req.query,
    body: req.body
  };

  // If schema has specific targets (e.g., body, query, params), validate only those
  const schemaKeys = Object.keys(schema);
  const hasSpecificTargets = ['body', 'query', 'params'].some(key => schemaKeys.includes(key));

  if (hasSpecificTargets) {
    // Validate only specified targets
    const validationPromises = schemaKeys.map(key => {
      if (schema[key] && validationTargets[key]) {
        return schema[key].validateAsync(validationTargets[key], {
          abortEarly: false,
          stripUnknown: true
        });
      }
      return Promise.resolve(validationTargets[key]);
    });

    Promise.all(validationPromises)
      .then(validatedValues => {
        // Update request with validated and sanitized values
        schemaKeys.forEach((key, index) => {
          if (validationTargets[key]) {
            validationTargets[key] = validatedValues[index];
          }
        });
        next();
      })
      .catch(error => {
        // Format validation errors
        const errors = error.details?.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        })) || [{ message: error.message }];

        next(new BadRequestError('Validation failed', errors));
      });
  } else {
    // Validate entire request body against schema
    schema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true
    })
      .then(validatedBody => {
        req.body = validatedBody;
        next();
      })
      .catch(error => {
        const errors = error.details?.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        })) || [{ message: error.message }];

        next(new BadRequestError('Validation failed', errors));
      });
  }
};

module.exports = validate; 