/**
 * API Versioning Middleware
 *
 * Handles API versioning and routing to appropriate version handlers
 */
import { Response, NextFunction, RequestHandler } from 'express';
import { ApiRequest, VersionHandlers } from '../types/index.js';
/**
 * Supported API versions
 */
export declare const SUPPORTED_VERSIONS: string[];
export declare const DEFAULT_VERSION: string;
/**
 * Middleware to extract API version from the request
 *
 * Version can be specified in multiple ways (in order of precedence):
 * 1. Via Accept header: Accept: application/vnd.spendsync.{version}+json
 * 2. Via custom X-API-Version header
 * 3. Via URL path (already parsed before this middleware runs)
 * 4. Defaults to the latest stable version if not specified
 */
export declare const extractVersion: (req: ApiRequest, res: Response, next: NextFunction) => void;
/**
 * Create a versioned route handler that routes to the appropriate version controller
 *
 * @param handlers - Object mapping versions to handler functions
 * @returns Middleware function to route to the correct version handler
 */
export declare const versionRoute: (handlers: VersionHandlers) => RequestHandler;
declare const _default: {
    extractVersion: (req: ApiRequest, res: Response, next: NextFunction) => void;
    versionRoute: (handlers: VersionHandlers) => RequestHandler;
    SUPPORTED_VERSIONS: string[];
    DEFAULT_VERSION: string;
};
export default _default;
