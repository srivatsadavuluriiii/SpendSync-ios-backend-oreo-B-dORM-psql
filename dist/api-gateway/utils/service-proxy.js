"use strict";var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");var _stringify = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/json/stringify")); /**
 * Service Proxy Utility
 * 
 * Provides functions for making HTTP requests to microservices
 */

const axios = require('axios');
const config = require('../config');
const { ServiceUnavailableError } = require('../../shared/errors');

// Create axios instance with default configuration
const axiosInstance = axios.create({
  timeout: config.timeout || 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Get the base URL for a service
 * @param {string} serviceName - Service name
 * @returns {string} Service base URL
 */
function getServiceUrl(serviceName) {
  const url = config.serviceUrls[serviceName];

  if (!url) {
    console.error(`Unknown service: ${serviceName}`);
    throw new Error(`Unknown service: ${serviceName}`);
  }

  return url;
}

/**
 * Forward a request to a microservice
 * @param {string} serviceName Name of the service
 * @param {string} method HTTP method
 * @param {string} path Request path
 * @param {Object} data Request data
 * @param {Object} headers Request headers
 * @param {string} baseUrlOverride Override base URL (for testing)
 * @returns {Promise<Object>} Service response
 */
async function makeServiceRequest(serviceName, method, path, data = null, headers = {}, baseUrlOverride = null) {
  try {
    const baseUrl = baseUrlOverride || config.serviceUrls[serviceName];
    if (!baseUrl) {
      throw new ServiceUnavailableError(`Service ${serviceName} not configured`);
    }

    const response = await axios({
      method,
      url: `${baseUrl}${path}`,
      data,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      }
    });

    // Format response
    return {
      success: true,
      data: {
        service: serviceName,
        ...response.data
      }
    };
  } catch (error) {
    if (error.response) {
      // Forward error response from service
      throw {
        status: error.response.status,
        data: {
          success: false,
          error: {
            service: serviceName,
            ...error.response.data
          }
        }
      };
    }
    throw new ServiceUnavailableError(`Service ${serviceName} unavailable`);
  }
}

/**
 * Extract the resource path from the original request URL
 * @param {string} originalUrl - Original request URL
 * @param {string} resourceType - Resource type (users, expenses, etc.)
 * @returns {string} Extracted resource path
 */
function extractResourcePath(originalUrl, resourceType) {
  // Get the part of the path after the resource type
  const regex = new RegExp(`/api/v1/${resourceType}(.*)`);
  const match = originalUrl.match(regex);

  if (match) {
    return match[1] || ''; // Return the path after the resource type
  }

  return '';
}

/**
 * Forward original client request to a service
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} serviceName - Service name
 * @param {string} [path] - Override path (defaults to original request path)
 */
async function forwardRequest(req, res, serviceName, path = null) {
  try {
    // Strip /api/v1 prefix from the path
    const requestPath = path || req.path.replace(/^\/api\/v1/, '');

    // Get service URL from config
    const serviceUrl = config.serviceUrls[serviceName];
    if (!serviceUrl) {
      throw new Error(`Service ${serviceName} not found in configuration`);
    }

    // Construct full URL
    const url = `${serviceUrl}${requestPath}`;

    // Forward headers but remove host
    const headers = { ...req.headers };
    delete headers.host;

    // Add user ID and roles to headers if available (from auth middleware)
    if (req.user) {
      headers['x-user-id'] = req.user.id;
      if (req.user.roles) {
        headers['x-user-roles'] = (0, _stringify.default)(req.user.roles);
      }
    }

    try {
      // Make request to service
      const response = await axiosInstance({
        url,
        method: req.method,
        data: req.body,
        headers,
        params: req.query
      });

      // Forward the response
      res.status(response.status || 200).json(response.data);
    } catch (error) {
      console.error(`Service forwarding error:`, error.message);

      if (error.response) {
        // Forward the error response from the service
        return res.status(error.response.status).json(error.response.data);
      }

      // For network or timeout errors
      return res.status(503).json({
        error: {
          message: `${serviceName} is currently unavailable`,
          status: 503
        }
      });
    }
  } catch (error) {
    console.error(`Service forwarding failed:`, error);

    // Generic error response
    res.status(500).json({
      error: {
        message: 'Internal server error',
        status: 500
      }
    });
  }
}

module.exports = {
  makeServiceRequest,
  forwardRequest
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJheGlvcyIsInJlcXVpcmUiLCJjb25maWciLCJTZXJ2aWNlVW5hdmFpbGFibGVFcnJvciIsImF4aW9zSW5zdGFuY2UiLCJjcmVhdGUiLCJ0aW1lb3V0IiwiaGVhZGVycyIsImdldFNlcnZpY2VVcmwiLCJzZXJ2aWNlTmFtZSIsInVybCIsInNlcnZpY2VVcmxzIiwiY29uc29sZSIsImVycm9yIiwiRXJyb3IiLCJtYWtlU2VydmljZVJlcXVlc3QiLCJtZXRob2QiLCJwYXRoIiwiZGF0YSIsImJhc2VVcmxPdmVycmlkZSIsImJhc2VVcmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJzZXJ2aWNlIiwic3RhdHVzIiwiZXh0cmFjdFJlc291cmNlUGF0aCIsIm9yaWdpbmFsVXJsIiwicmVzb3VyY2VUeXBlIiwicmVnZXgiLCJSZWdFeHAiLCJtYXRjaCIsImZvcndhcmRSZXF1ZXN0IiwicmVxIiwicmVzIiwicmVxdWVzdFBhdGgiLCJyZXBsYWNlIiwic2VydmljZVVybCIsImhvc3QiLCJ1c2VyIiwiaWQiLCJyb2xlcyIsIl9zdHJpbmdpZnkiLCJkZWZhdWx0IiwiYm9keSIsInBhcmFtcyIsInF1ZXJ5IiwianNvbiIsIm1lc3NhZ2UiLCJtb2R1bGUiLCJleHBvcnRzIl0sInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2FwaS1nYXRld2F5L3V0aWxzL3NlcnZpY2UtcHJveHkuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBTZXJ2aWNlIFByb3h5IFV0aWxpdHlcbiAqIFxuICogUHJvdmlkZXMgZnVuY3Rpb25zIGZvciBtYWtpbmcgSFRUUCByZXF1ZXN0cyB0byBtaWNyb3NlcnZpY2VzXG4gKi9cblxuY29uc3QgYXhpb3MgPSByZXF1aXJlKCdheGlvcycpO1xuY29uc3QgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG5jb25zdCB7IFNlcnZpY2VVbmF2YWlsYWJsZUVycm9yIH0gPSByZXF1aXJlKCcuLi8uLi9zaGFyZWQvZXJyb3JzJyk7XG5cbi8vIENyZWF0ZSBheGlvcyBpbnN0YW5jZSB3aXRoIGRlZmF1bHQgY29uZmlndXJhdGlvblxuY29uc3QgYXhpb3NJbnN0YW5jZSA9IGF4aW9zLmNyZWF0ZSh7XG4gIHRpbWVvdXQ6IGNvbmZpZy50aW1lb3V0IHx8IDMwMDAwLFxuICBoZWFkZXJzOiB7XG4gICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICB9XG59KTtcblxuLyoqXG4gKiBHZXQgdGhlIGJhc2UgVVJMIGZvciBhIHNlcnZpY2VcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZXJ2aWNlTmFtZSAtIFNlcnZpY2UgbmFtZVxuICogQHJldHVybnMge3N0cmluZ30gU2VydmljZSBiYXNlIFVSTFxuICovXG5mdW5jdGlvbiBnZXRTZXJ2aWNlVXJsKHNlcnZpY2VOYW1lKSB7XG4gIGNvbnN0IHVybCA9IGNvbmZpZy5zZXJ2aWNlVXJsc1tzZXJ2aWNlTmFtZV07XG4gIFxuICBpZiAoIXVybCkge1xuICAgIGNvbnNvbGUuZXJyb3IoYFVua25vd24gc2VydmljZTogJHtzZXJ2aWNlTmFtZX1gKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gc2VydmljZTogJHtzZXJ2aWNlTmFtZX1gKTtcbiAgfVxuICBcbiAgcmV0dXJuIHVybDtcbn1cblxuLyoqXG4gKiBGb3J3YXJkIGEgcmVxdWVzdCB0byBhIG1pY3Jvc2VydmljZVxuICogQHBhcmFtIHtzdHJpbmd9IHNlcnZpY2VOYW1lIE5hbWUgb2YgdGhlIHNlcnZpY2VcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2QgSFRUUCBtZXRob2RcbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIFJlcXVlc3QgcGF0aFxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgUmVxdWVzdCBkYXRhXG4gKiBAcGFyYW0ge09iamVjdH0gaGVhZGVycyBSZXF1ZXN0IGhlYWRlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVXJsT3ZlcnJpZGUgT3ZlcnJpZGUgYmFzZSBVUkwgKGZvciB0ZXN0aW5nKVxuICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0Pn0gU2VydmljZSByZXNwb25zZVxuICovXG5hc3luYyBmdW5jdGlvbiBtYWtlU2VydmljZVJlcXVlc3Qoc2VydmljZU5hbWUsIG1ldGhvZCwgcGF0aCwgZGF0YSA9IG51bGwsIGhlYWRlcnMgPSB7fSwgYmFzZVVybE92ZXJyaWRlID0gbnVsbCkge1xuICB0cnkge1xuICAgIGNvbnN0IGJhc2VVcmwgPSBiYXNlVXJsT3ZlcnJpZGUgfHwgY29uZmlnLnNlcnZpY2VVcmxzW3NlcnZpY2VOYW1lXTtcbiAgICBpZiAoIWJhc2VVcmwpIHtcbiAgICAgIHRocm93IG5ldyBTZXJ2aWNlVW5hdmFpbGFibGVFcnJvcihgU2VydmljZSAke3NlcnZpY2VOYW1lfSBub3QgY29uZmlndXJlZGApO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3Moe1xuICAgICAgbWV0aG9kLFxuICAgICAgdXJsOiBgJHtiYXNlVXJsfSR7cGF0aH1gLFxuICAgICAgZGF0YSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgLi4uaGVhZGVycyxcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gRm9ybWF0IHJlc3BvbnNlXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHNlcnZpY2U6IHNlcnZpY2VOYW1lLFxuICAgICAgICAuLi5yZXNwb25zZS5kYXRhXG4gICAgICB9XG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IucmVzcG9uc2UpIHtcbiAgICAgIC8vIEZvcndhcmQgZXJyb3IgcmVzcG9uc2UgZnJvbSBzZXJ2aWNlXG4gICAgICB0aHJvdyB7XG4gICAgICAgIHN0YXR1czogZXJyb3IucmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgIHNlcnZpY2U6IHNlcnZpY2VOYW1lLFxuICAgICAgICAgICAgLi4uZXJyb3IucmVzcG9uc2UuZGF0YVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IFNlcnZpY2VVbmF2YWlsYWJsZUVycm9yKGBTZXJ2aWNlICR7c2VydmljZU5hbWV9IHVuYXZhaWxhYmxlYCk7XG4gIH1cbn1cblxuLyoqXG4gKiBFeHRyYWN0IHRoZSByZXNvdXJjZSBwYXRoIGZyb20gdGhlIG9yaWdpbmFsIHJlcXVlc3QgVVJMXG4gKiBAcGFyYW0ge3N0cmluZ30gb3JpZ2luYWxVcmwgLSBPcmlnaW5hbCByZXF1ZXN0IFVSTFxuICogQHBhcmFtIHtzdHJpbmd9IHJlc291cmNlVHlwZSAtIFJlc291cmNlIHR5cGUgKHVzZXJzLCBleHBlbnNlcywgZXRjLilcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEV4dHJhY3RlZCByZXNvdXJjZSBwYXRoXG4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RSZXNvdXJjZVBhdGgob3JpZ2luYWxVcmwsIHJlc291cmNlVHlwZSkge1xuICAvLyBHZXQgdGhlIHBhcnQgb2YgdGhlIHBhdGggYWZ0ZXIgdGhlIHJlc291cmNlIHR5cGVcbiAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKGAvYXBpL3YxLyR7cmVzb3VyY2VUeXBlfSguKilgKTtcbiAgY29uc3QgbWF0Y2ggPSBvcmlnaW5hbFVybC5tYXRjaChyZWdleCk7XG4gIFxuICBpZiAobWF0Y2gpIHtcbiAgICByZXR1cm4gbWF0Y2hbMV0gfHwgJyc7IC8vIFJldHVybiB0aGUgcGF0aCBhZnRlciB0aGUgcmVzb3VyY2UgdHlwZVxuICB9XG4gIFxuICByZXR1cm4gJyc7XG59XG5cbi8qKlxuICogRm9yd2FyZCBvcmlnaW5hbCBjbGllbnQgcmVxdWVzdCB0byBhIHNlcnZpY2VcbiAqIEBwYXJhbSB7T2JqZWN0fSByZXEgLSBFeHByZXNzIHJlcXVlc3Qgb2JqZWN0XG4gKiBAcGFyYW0ge09iamVjdH0gcmVzIC0gRXhwcmVzcyByZXNwb25zZSBvYmplY3RcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZXJ2aWNlTmFtZSAtIFNlcnZpY2UgbmFtZVxuICogQHBhcmFtIHtzdHJpbmd9IFtwYXRoXSAtIE92ZXJyaWRlIHBhdGggKGRlZmF1bHRzIHRvIG9yaWdpbmFsIHJlcXVlc3QgcGF0aClcbiAqL1xuYXN5bmMgZnVuY3Rpb24gZm9yd2FyZFJlcXVlc3QocmVxLCByZXMsIHNlcnZpY2VOYW1lLCBwYXRoID0gbnVsbCkge1xuICB0cnkge1xuICAgIC8vIFN0cmlwIC9hcGkvdjEgcHJlZml4IGZyb20gdGhlIHBhdGhcbiAgICBjb25zdCByZXF1ZXN0UGF0aCA9IHBhdGggfHwgcmVxLnBhdGgucmVwbGFjZSgvXlxcL2FwaVxcL3YxLywgJycpO1xuICAgIFxuICAgIC8vIEdldCBzZXJ2aWNlIFVSTCBmcm9tIGNvbmZpZ1xuICAgIGNvbnN0IHNlcnZpY2VVcmwgPSBjb25maWcuc2VydmljZVVybHNbc2VydmljZU5hbWVdO1xuICAgIGlmICghc2VydmljZVVybCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTZXJ2aWNlICR7c2VydmljZU5hbWV9IG5vdCBmb3VuZCBpbiBjb25maWd1cmF0aW9uYCk7XG4gICAgfVxuICAgIFxuICAgIC8vIENvbnN0cnVjdCBmdWxsIFVSTFxuICAgIGNvbnN0IHVybCA9IGAke3NlcnZpY2VVcmx9JHtyZXF1ZXN0UGF0aH1gO1xuICAgIFxuICAgIC8vIEZvcndhcmQgaGVhZGVycyBidXQgcmVtb3ZlIGhvc3RcbiAgICBjb25zdCBoZWFkZXJzID0geyAuLi5yZXEuaGVhZGVycyB9O1xuICAgIGRlbGV0ZSBoZWFkZXJzLmhvc3Q7XG4gICAgXG4gICAgLy8gQWRkIHVzZXIgSUQgYW5kIHJvbGVzIHRvIGhlYWRlcnMgaWYgYXZhaWxhYmxlIChmcm9tIGF1dGggbWlkZGxld2FyZSlcbiAgICBpZiAocmVxLnVzZXIpIHtcbiAgICAgIGhlYWRlcnNbJ3gtdXNlci1pZCddID0gcmVxLnVzZXIuaWQ7XG4gICAgICBpZiAocmVxLnVzZXIucm9sZXMpIHtcbiAgICAgICAgaGVhZGVyc1sneC11c2VyLXJvbGVzJ10gPSBKU09OLnN0cmluZ2lmeShyZXEudXNlci5yb2xlcyk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHRyeSB7XG4gICAgICAvLyBNYWtlIHJlcXVlc3QgdG8gc2VydmljZVxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBheGlvc0luc3RhbmNlKHtcbiAgICAgICAgdXJsLFxuICAgICAgICBtZXRob2Q6IHJlcS5tZXRob2QsXG4gICAgICAgIGRhdGE6IHJlcS5ib2R5LFxuICAgICAgICBoZWFkZXJzLFxuICAgICAgICBwYXJhbXM6IHJlcS5xdWVyeVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIEZvcndhcmQgdGhlIHJlc3BvbnNlXG4gICAgICByZXMuc3RhdHVzKHJlc3BvbnNlLnN0YXR1cyB8fCAyMDApLmpzb24ocmVzcG9uc2UuZGF0YSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFNlcnZpY2UgZm9yd2FyZGluZyBlcnJvcjpgLCBlcnJvci5tZXNzYWdlKTtcbiAgICAgIFxuICAgICAgaWYgKGVycm9yLnJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEZvcndhcmQgdGhlIGVycm9yIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZpY2VcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoZXJyb3IucmVzcG9uc2Uuc3RhdHVzKS5qc29uKGVycm9yLnJlc3BvbnNlLmRhdGEpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBGb3IgbmV0d29yayBvciB0aW1lb3V0IGVycm9yc1xuICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNTAzKS5qc29uKHtcbiAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICBtZXNzYWdlOiBgJHtzZXJ2aWNlTmFtZX0gaXMgY3VycmVudGx5IHVuYXZhaWxhYmxlYCxcbiAgICAgICAgICBzdGF0dXM6IDUwM1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgU2VydmljZSBmb3J3YXJkaW5nIGZhaWxlZDpgLCBlcnJvcik7XG4gICAgXG4gICAgLy8gR2VuZXJpYyBlcnJvciByZXNwb25zZVxuICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHtcbiAgICAgIGVycm9yOiB7XG4gICAgICAgIG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxuICAgICAgICBzdGF0dXM6IDUwMFxuICAgICAgfVxuICAgIH0pO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtYWtlU2VydmljZVJlcXVlc3QsXG4gIGZvcndhcmRSZXF1ZXN0XG59OyAiXSwibWFwcGluZ3MiOiJvTkFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLE1BQU1BLEtBQUssR0FBR0MsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUM5QixNQUFNQyxNQUFNLEdBQUdELE9BQU8sQ0FBQyxXQUFXLENBQUM7QUFDbkMsTUFBTSxFQUFFRSx1QkFBdUIsQ0FBQyxDQUFDLEdBQUdGLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQzs7QUFFbEU7QUFDQSxNQUFNRyxhQUFhLEdBQUdKLEtBQUssQ0FBQ0ssTUFBTSxDQUFDO0VBQ2pDQyxPQUFPLEVBQUVKLE1BQU0sQ0FBQ0ksT0FBTyxJQUFJLEtBQUs7RUFDaENDLE9BQU8sRUFBRTtJQUNQLGNBQWMsRUFBRTtFQUNsQjtBQUNGLENBQUMsQ0FBQzs7QUFFRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBU0MsYUFBYUEsQ0FBQ0MsV0FBVyxFQUFFO0VBQ2xDLE1BQU1DLEdBQUcsR0FBR1IsTUFBTSxDQUFDUyxXQUFXLENBQUNGLFdBQVcsQ0FBQzs7RUFFM0MsSUFBSSxDQUFDQyxHQUFHLEVBQUU7SUFDUkUsT0FBTyxDQUFDQyxLQUFLLENBQUMsb0JBQW9CSixXQUFXLEVBQUUsQ0FBQztJQUNoRCxNQUFNLElBQUlLLEtB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