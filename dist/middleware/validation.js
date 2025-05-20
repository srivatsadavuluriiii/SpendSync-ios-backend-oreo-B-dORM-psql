"use strict";var _Object$defineProperty = require("@babel/runtime-corejs3/core-js-stable/object/define-property");var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");_Object$defineProperty(exports, "__esModule", { value: true });exports.validateRequest = exports.sizeLimit = exports.sanitizeMongoQuery = exports.sanitizeAggregatePipeline = void 0;var _assign = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/object/assign"));var _parseInt2 = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/parse-int"));var _isArray = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/array/is-array"));var _map = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/map"));var _entries = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/object/entries"));var _startsWith = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/instance/starts-with"));var _set = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/set"));var _express = require("express");
var _joi = _interopRequireDefault(require("joi"));
var _errors = require("../utils/errors");

/**
 * Interface for validation schema structure
 */







/**
 * Creates a validation middleware using the provided schema
 * @param schema Validation schema for request components
 */
const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const validationObject = {};

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

      const validatedData = await _joi.default.object(schema).validateAsync(validationObject, {
        abortEarly: false,
        stripUnknown: true
      });

      // Attach validated data to request
      (0, _assign.default)(req, validatedData);

      next();
    } catch (error) {
      if (error instanceof _joi.default.ValidationError) {
        next(new _errors.ValidationError(error.message, error.details));
      } else {
        next(error);
      }
    }
  };
};

/**
 * Size limit middleware factory
 * @param limit Size limit in bytes or human readable format (e.g., '50kb')
 */exports.validateRequest = validateRequest;
const sizeLimit = (limit) => {
  return (req, res, next) => {
    const contentLength = (0, _parseInt2.default)(req.headers['content-length'] || '0', 10);
    const maxSize = typeof limit === 'string' ?
    parseSize(limit) :
    limit;

    if (contentLength > maxSize) {
      return next(new _errors.ValidationError(`Payload size exceeds limit of ${limit}`));
    }
    next();
  };
};

/**
 * Parse human readable size to bytes
 * @param size Size string (e.g., '50kb')
 */exports.sizeLimit = sizeLimit;
function parseSize(size) {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.match(/^(\d+)(\w+)$/);
  if (!match) {
    throw new Error('Invalid size format');
  }

  const [, value, unit] = match;
  const multiplier = units[unit.toLowerCase()];

  if (!multiplier) {
    throw new Error('Invalid size unit');
  }

  return (0, _parseInt2.default)(value, 10) * multiplier;
}

/**
 * MongoDB query sanitization
 * @param obj Object to sanitize
 */
const sanitizeMongoQuery = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if ((0, _isArray.default)(obj)) {
    return (0, _map.default)(obj).call(obj, sanitizeMongoQuery);
  }

  const sanitized = {};
  for (const [key, value] of (0, _entries.default)(obj)) {
    // Remove MongoDB operators from user input
    if ((0, _startsWith.default)(key).call(key, '$')) {
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
 */exports.sanitizeMongoQuery = sanitizeMongoQuery;
const sanitizeAggregatePipeline = (pipeline) => {
  return (0, _map.default)(pipeline).call(pipeline, (stage) => {
    const sanitizedStage = {};

    for (const [operator, value] of (0, _entries.default)(stage)) {
      // Only allow valid MongoDB aggregation operators
      if ((0, _startsWith.default)(operator).call(operator, '$') && isValidAggregationOperator(operator)) {
        sanitizedStage[operator] = sanitizeMongoQuery(value);
      }
    }

    return sanitizedStage;
  });
};

/**
 * Check if aggregation operator is valid
 * @param operator Operator to check
 */exports.sanitizeAggregatePipeline = sanitizeAggregatePipeline;
function isValidAggregationOperator(operator) {
  const validOperators = new _set.default([
  '$match', '$group', '$sort', '$limit', '$skip',
  '$project', '$unwind', '$lookup', '$count']
  );
  return validOperators.has(operator);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfZXhwcmVzcyIsInJlcXVpcmUiLCJfam9pIiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsIl9lcnJvcnMiLCJ2YWxpZGF0ZVJlcXVlc3QiLCJzY2hlbWEiLCJyZXEiLCJyZXMiLCJuZXh0IiwidmFsaWRhdGlvbk9iamVjdCIsImJvZHkiLCJxdWVyeSIsInBhcmFtcyIsImhlYWRlcnMiLCJ2YWxpZGF0ZWREYXRhIiwiSm9pIiwib2JqZWN0IiwidmFsaWRhdGVBc3luYyIsImFib3J0RWFybHkiLCJzdHJpcFVua25vd24iLCJfYXNzaWduIiwiZGVmYXVsdCIsImVycm9yIiwiVmFsaWRhdGlvbkVycm9yIiwibWVzc2FnZSIsImRldGFpbHMiLCJleHBvcnRzIiwic2l6ZUxpbWl0IiwibGltaXQiLCJjb250ZW50TGVuZ3RoIiwiX3BhcnNlSW50MiIsIm1heFNpemUiLCJwYXJzZVNpemUiLCJzaXplIiwidW5pdHMiLCJiIiwia2IiLCJtYiIsImdiIiwibWF0Y2giLCJFcnJvciIsInZhbHVlIiwidW5pdCIsIm11bHRpcGxpZXIiLCJ0b0xvd2VyQ2FzZSIsInNhbml0aXplTW9uZ29RdWVyeSIsIm9iaiIsIl9pc0FycmF5IiwiX21hcCIsImNhbGwiLCJzYW5pdGl6ZWQiLCJrZXkiLCJfZW50cmllcyIsIl9zdGFydHNXaXRoIiwic2FuaXRpemVBZ2dyZWdhdGVQaXBlbGluZSIsInBpcGVsaW5lIiwic3RhZ2UiLCJzYW5pdGl6ZWRTdGFnZSIsIm9wZXJhdG9yIiwiaXNWYWxpZEFnZ3JlZ2F0aW9uT3BlcmF0b3IiLCJ2YWxpZE9wZXJhdG9ycyIsIl9zZXQiLCJoYXMiXSwic291cmNlcyI6WyIuLi8uLi9zcmMvbWlkZGxld2FyZS92YWxpZGF0aW9uLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb24gfSBmcm9tICdleHByZXNzJztcbmltcG9ydCBKb2kgZnJvbSAnam9pJztcbmltcG9ydCB7IFZhbGlkYXRpb25FcnJvciB9IGZyb20gJy4uL3V0aWxzL2Vycm9ycyc7XG5cbi8qKlxuICogSW50ZXJmYWNlIGZvciB2YWxpZGF0aW9uIHNjaGVtYSBzdHJ1Y3R1cmVcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBWYWxpZGF0aW9uU2NoZW1hIHtcbiAgYm9keT86IEpvaS5PYmplY3RTY2hlbWE7XG4gIHF1ZXJ5PzogSm9pLk9iamVjdFNjaGVtYTtcbiAgcGFyYW1zPzogSm9pLk9iamVjdFNjaGVtYTtcbiAgaGVhZGVycz86IEpvaS5PYmplY3RTY2hlbWE7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIHZhbGlkYXRpb24gbWlkZGxld2FyZSB1c2luZyB0aGUgcHJvdmlkZWQgc2NoZW1hXG4gKiBAcGFyYW0gc2NoZW1hIFZhbGlkYXRpb24gc2NoZW1hIGZvciByZXF1ZXN0IGNvbXBvbmVudHNcbiAqL1xuZXhwb3J0IGNvbnN0IHZhbGlkYXRlUmVxdWVzdCA9IChzY2hlbWE6IFZhbGlkYXRpb25TY2hlbWEpID0+IHtcbiAgcmV0dXJuIGFzeW5jIChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YWxpZGF0aW9uT2JqZWN0OiBhbnkgPSB7fTtcbiAgICAgIFxuICAgICAgaWYgKHNjaGVtYS5ib2R5KSB7XG4gICAgICAgIHZhbGlkYXRpb25PYmplY3QuYm9keSA9IHJlcS5ib2R5O1xuICAgICAgfVxuICAgICAgaWYgKHNjaGVtYS5xdWVyeSkge1xuICAgICAgICB2YWxpZGF0aW9uT2JqZWN0LnF1ZXJ5ID0gcmVxLnF1ZXJ5O1xuICAgICAgfVxuICAgICAgaWYgKHNjaGVtYS5wYXJhbXMpIHtcbiAgICAgICAgdmFsaWRhdGlvbk9iamVjdC5wYXJhbXMgPSByZXEucGFyYW1zO1xuICAgICAgfVxuICAgICAgaWYgKHNjaGVtYS5oZWFkZXJzKSB7XG4gICAgICAgIHZhbGlkYXRpb25PYmplY3QuaGVhZGVycyA9IHJlcS5oZWFkZXJzO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB2YWxpZGF0ZWREYXRhID0gYXdhaXQgSm9pLm9iamVjdChzY2hlbWEpLnZhbGlkYXRlQXN5bmModmFsaWRhdGlvbk9iamVjdCwge1xuICAgICAgICBhYm9ydEVhcmx5OiBmYWxzZSxcbiAgICAgICAgc3RyaXBVbmtub3duOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEF0dGFjaCB2YWxpZGF0ZWQgZGF0YSB0byByZXF1ZXN0XG4gICAgICBPYmplY3QuYXNzaWduKHJlcSwgdmFsaWRhdGVkRGF0YSk7XG4gICAgICBcbiAgICAgIG5leHQoKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgSm9pLlZhbGlkYXRpb25FcnJvcikge1xuICAgICAgICBuZXh0KG5ldyBWYWxpZGF0aW9uRXJyb3IoZXJyb3IubWVzc2FnZSwgZXJyb3IuZGV0YWlscykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dChlcnJvcik7XG4gICAgICB9XG4gICAgfVxuICB9O1xufTtcblxuLyoqXG4gKiBTaXplIGxpbWl0IG1pZGRsZXdhcmUgZmFjdG9yeVxuICogQHBhcmFtIGxpbWl0IFNpemUgbGltaXQgaW4gYnl0ZXMgb3IgaHVtYW4gcmVhZGFibGUgZm9ybWF0IChlLmcuLCAnNTBrYicpXG4gKi9cbmV4cG9ydCBjb25zdCBzaXplTGltaXQgPSAobGltaXQ6IHN0cmluZykgPT4ge1xuICByZXR1cm4gKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSA9PiB7XG4gICAgY29uc3QgY29udGVudExlbmd0aCA9IHBhcnNlSW50KHJlcS5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddIHx8ICcwJywgMTApO1xuICAgIGNvbnN0IG1heFNpemUgPSB0eXBlb2YgbGltaXQgPT09ICdzdHJpbmcnID8gXG4gICAgICBwYXJzZVNpemUobGltaXQpIDogXG4gICAgICBsaW1pdDtcblxuICAgIGlmIChjb250ZW50TGVuZ3RoID4gbWF4U2l6ZSkge1xuICAgICAgcmV0dXJuIG5leHQobmV3IFZhbGlkYXRpb25FcnJvcihgUGF5bG9hZCBzaXplIGV4Y2VlZHMgbGltaXQgb2YgJHtsaW1pdH1gKSk7XG4gICAgfVxuICAgIG5leHQoKTtcbiAgfTtcbn07XG5cbi8qKlxuICogUGFyc2UgaHVtYW4gcmVhZGFibGUgc2l6ZSB0byBieXRlc1xuICogQHBhcmFtIHNpemUgU2l6ZSBzdHJpbmcgKGUuZy4sICc1MGtiJylcbiAqL1xuZnVuY3Rpb24gcGFyc2VTaXplKHNpemU6IHN0cmluZyk6IG51bWJlciB7XG4gIGNvbnN0IHVuaXRzID0ge1xuICAgIGI6IDEsXG4gICAga2I6IDEwMjQsXG4gICAgbWI6IDEwMjQgKiAxMDI0LFxuICAgIGdiOiAxMDI0ICogMTAyNCAqIDEwMjQsXG4gIH07XG5cbiAgY29uc3QgbWF0Y2ggPSBzaXplLm1hdGNoKC9eKFxcZCspKFxcdyspJC8pO1xuICBpZiAoIW1hdGNoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHNpemUgZm9ybWF0Jyk7XG4gIH1cblxuICBjb25zdCBbLCB2YWx1ZSwgdW5pdF0gPSBtYXRjaDtcbiAgY29uc3QgbXVsdGlwbGllciA9IHVuaXRzW3VuaXQudG9Mb3dlckNhc2UoKSBhcyBrZXlvZiB0eXBlb2YgdW5pdHNdO1xuICBcbiAgaWYgKCFtdWx0aXBsaWVyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHNpemUgdW5pdCcpO1xuICB9XG5cbiAgcmV0dXJuIHBhcnNlSW50KHZhbHVlLCAxMCkgKiBtdWx0aXBsaWVyO1xufVxuXG4vKipcbiAqIE1vbmdvREIgcXVlcnkgc2FuaXRpemF0aW9uXG4gKiBAcGFyYW0gb2JqIE9iamVjdCB0byBzYW5pdGl6ZVxuICovXG5leHBvcnQgY29uc3Qgc2FuaXRpemVNb25nb1F1ZXJ5ID0gKG9iajogYW55KTogYW55ID0+IHtcbiAgaWYgKCFvYmogfHwgdHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSkge1xuICAgIHJldHVybiBvYmoubWFwKHNhbml0aXplTW9uZ29RdWVyeSk7XG4gIH1cblxuICBjb25zdCBzYW5pdGl6ZWQ6IGFueSA9IHt9O1xuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XG4gICAgLy8gUmVtb3ZlIE1vbmdvREIgb3BlcmF0b3JzIGZyb20gdXNlciBpbnB1dFxuICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnJCcpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyBSZWN1cnNpdmVseSBzYW5pdGl6ZSBuZXN0ZWQgb2JqZWN0c1xuICAgIHNhbml0aXplZFtrZXldID0gc2FuaXRpemVNb25nb1F1ZXJ5KHZhbHVlKTtcbiAgfVxuXG4gIHJldHVybiBzYW5pdGl6ZWQ7XG59O1xuXG4vKipcbiAqIFNhbml0aXplIGFnZ3JlZ2F0aW9uIHBpcGVsaW5lXG4gKiBAcGFyYW0gcGlwZWxpbmUgQWdncmVnYXRpb24gcGlwZWxpbmUgdG8gc2FuaXRpemVcbiAqL1xuZXhwb3J0IGNvbnN0IHNhbml0aXplQWdncmVnYXRlUGlwZWxpbmUgPSAocGlwZWxpbmU6IGFueVtdKTogYW55W10gPT4ge1xuICByZXR1cm4gcGlwZWxpbmUubWFwKHN0YWdlID0+IHtcbiAgICBjb25zdCBzYW5pdGl6ZWRTdGFnZTogYW55ID0ge307XG4gICAgXG4gICAgZm9yIChjb25zdCBbb3BlcmF0b3IsIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhzdGFnZSkpIHtcbiAgICAgIC8vIE9ubHkgYWxsb3cgdmFsaWQgTW9uZ29EQiBhZ2dyZWdhdGlvbiBvcGVyYXRvcnNcbiAgICAgIGlmIChvcGVyYXRvci5zdGFydHNXaXRoKCckJykgJiYgaXNWYWxpZEFnZ3JlZ2F0aW9uT3BlcmF0b3Iob3BlcmF0b3IpKSB7XG4gICAgICAgIHNhbml0aXplZFN0YWdlW29wZXJhdG9yXSA9IHNhbml0aXplTW9uZ29RdWVyeSh2YWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBzYW5pdGl6ZWRTdGFnZTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIGFnZ3JlZ2F0aW9uIG9wZXJhdG9yIGlzIHZhbGlkXG4gKiBAcGFyYW0gb3BlcmF0b3IgT3BlcmF0b3IgdG8gY2hlY2tcbiAqL1xuZnVuY3Rpb24gaXNWYWxpZEFnZ3JlZ2F0aW9uT3BlcmF0b3Iob3BlcmF0b3I6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCB2YWxpZE9wZXJhdG9ycyA9IG5ldyBTZXQoW1xuICAgICckbWF0Y2gnLCAnJGdyb3VwJywgJyRzb3J0JywgJyRsaW1pdCcsICckc2tpcCcsXG4gICAgJyRwcm9qZWN0JywgJyR1bndpbmQnLCAnJGxvb2t1cCcsICckY291bnQnXG4gIF0pO1xuICByZXR1cm4gdmFsaWRPcGVyYXRvcnMuaGFzKG9wZXJhdG9yKTtcbn0gIl0sIm1hcHBpbmdzIjoib2tDQUFBLElBQUFBLFFBQUEsR0FBQUMsT0FBQTtBQUNBLElBQUFDLElBQUEsR0FBQUMsc0JBQUEsQ0FBQUYsT0FBQTtBQUNBLElBQUFHLE9BQUEsR0FBQUgsT0FBQTs7QUFFQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FBUUE7QUFDQTtBQUNBO0FBQ0E7QUFDTyxNQUFNSSxlQUFlLEdBQUdBLENBQUNDLE1BQXdCLEtBQUs7RUFDM0QsT0FBTyxPQUFPQyxHQUFZLEVBQUVDLEdBQWEsRUFBRUMsSUFBa0IsS0FBSztJQUNoRSxJQUFJO01BQ0YsTUFBTUMsZ0JBQXFCLEdBQUcsQ0FBQyxDQUFDOztNQUVoQyxJQUFJSixNQUFNLENBQUNLLElBQUksRUFBRTtRQUNmRCxnQkFBZ0IsQ0FBQ0MsSUFBSSxHQUFHSixHQUFHLENBQUNJLElBQUk7TUFDbEM7TUFDQSxJQUFJTCxNQUFNLENBQUNNLEtBQUssRUFBRTtRQUNoQkYsZ0JBQWdCLENBQUNFLEtBQUssR0FBR0wsR0FBRyxDQUFDSyxLQUFLO01BQ3BDO01BQ0EsSUFBSU4sTUFBTSxD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