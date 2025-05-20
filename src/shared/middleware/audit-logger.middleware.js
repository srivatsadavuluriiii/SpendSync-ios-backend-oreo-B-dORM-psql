const logger = require('../utils/logger');

/**
 * Create audit logging middleware
 * @param {AuditLoggerService} auditLogger - Audit logger service instance
 * @returns {Function} Express middleware
 */
const createAuditMiddleware = (auditLogger) => {
  return async (req, res, next) => {
    // Capture original end function
    const originalEnd = res.end;
    const startTime = Date.now();

    // Override end function to capture response
    res.end = function (chunk, encoding) {
      // Restore original end
      res.end = originalEnd;
      
      // Call original end
      res.end(chunk, encoding);

      // Log the request
      const endTime = Date.now();
      const duration = endTime - startTime;

      const auditEvent = {
        eventType: 'HTTP_REQUEST',
        resourceType: 'api',
        severity: _getSeverity(res.statusCode),
        userId: req.user?.id || 'anonymous',
        action: `${req.method} ${req.path}`,
        outcome: _getOutcome(res.statusCode),
        metadata: {
          method: req.method,
          path: req.path,
          query: req.query,
          statusCode: res.statusCode,
          duration,
          ip: _getClientIp(req),
          userAgent: req.get('user-agent'),
          requestId: req.id, // Assuming request ID middleware
          correlationId: req.get('x-correlation-id'),
          ..._getSensitiveHeaders(req)
        }
      };

      try {
        await auditLogger.log(auditEvent);
      } catch (error) {
        logger.error('Failed to log audit event:', error);
      }
    };

    next();
  };
};

/**
 * Get severity based on status code
 * @private
 */
function _getSeverity(statusCode) {
  if (statusCode >= 500) return 'ERROR';
  if (statusCode >= 400) return 'WARNING';
  return 'INFO';
}

/**
 * Get outcome based on status code
 * @private
 */
function _getOutcome(statusCode) {
  if (statusCode >= 500) return 'ERROR';
  if (statusCode >= 400) return 'FAILURE';
  return 'SUCCESS';
}

/**
 * Get client IP address
 * @private
 */
function _getClientIp(req) {
  return req.get('x-forwarded-for')?.split(',')[0] || 
         req.connection.remoteAddress;
}

/**
 * Get relevant headers for audit log
 * @private
 */
function _getSensitiveHeaders(req) {
  const relevantHeaders = [
    'authorization',
    'x-api-key',
    'x-real-ip',
    'x-forwarded-for',
    'x-forwarded-proto',
    'x-forwarded-host'
  ];

  const headers = {};
  for (const header of relevantHeaders) {
    const value = req.get(header);
    if (value) {
      // Mask sensitive values
      headers[header] = header.includes('authorization') || header.includes('api-key')
        ? '******'
        : value;
    }
  }

  return { headers };
}

module.exports = createAuditMiddleware; 