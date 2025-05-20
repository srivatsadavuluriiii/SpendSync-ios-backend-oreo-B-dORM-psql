/**
 * API Versioning Middleware
 *
 * Handles API versioning and routing to appropriate version handlers
 */
// @ts-ignore
import { BadRequestError } from '../../../../shared/errors';
/**
 * Supported API versions
 */
export const SUPPORTED_VERSIONS = ['v1'];
export const DEFAULT_VERSION = 'v1';
/**
 * Middleware to extract API version from the request
 *
 * Version can be specified in multiple ways (in order of precedence):
 * 1. Via Accept header: Accept: application/vnd.spendsync.{version}+json
 * 2. Via custom X-API-Version header
 * 3. Via URL path (already parsed before this middleware runs)
 * 4. Defaults to the latest stable version if not specified
 */
export const extractVersion = (req, res, next) => {
    let version;
    // Check Accept header for version
    const acceptHeader = req.get('Accept');
    if (acceptHeader && acceptHeader.includes('application/vnd.spendsync.')) {
        const match = acceptHeader.match(/application\/vnd\.spendsync\.([^+]+)\+json/);
        if (match) {
            version = match[1];
        }
    }
    // If no version from Accept header, check X-API-Version header
    if (!version) {
        version = req.get('X-API-Version');
    }
    // Check URL path (should be already extracted by router if using path-based versioning)
    if (!version && req.params.version) {
        version = req.params.version;
    }
    // Default to latest version
    if (!version) {
        version = DEFAULT_VERSION;
    }
    // Validate version
    if (!SUPPORTED_VERSIONS.includes(version)) {
        return next(new BadRequestError(`Unsupported API version: ${version}. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`));
    }
    // Set version on request object for later use
    req.apiVersion = version;
    // Add version to response headers
    res.set('X-API-Version', version);
    next();
};
/**
 * Create a versioned route handler that routes to the appropriate version controller
 *
 * @param handlers - Object mapping versions to handler functions
 * @returns Middleware function to route to the correct version handler
 */
export const versionRoute = (handlers) => {
    return (req, res, next) => {
        const version = req.apiVersion || DEFAULT_VERSION;
        // Get the handler for the requested version or use the latest version handler
        const handler = handlers[version] || handlers[DEFAULT_VERSION];
        if (!handler) {
            return next(new BadRequestError(`No handler available for API version ${version}`));
        }
        // Call the appropriate version handler
        handler(req, res, next);
    };
};
export default {
    extractVersion,
    versionRoute,
    SUPPORTED_VERSIONS,
    DEFAULT_VERSION
};
