export const csrfProtection: any;
/**
 * Custom CSRF middleware that only applies to mutating methods
 * (POST, PUT, PATCH, DELETE) and ignores GET, HEAD, OPTIONS
 * @returns {Function} Express middleware function
 */
export function conditionalCsrfProtection(req: any, res: any, next: any): Function;
export function handleCsrfError(err: any, req: any, res: any, next: any): void;
export function csrfTokenProvider(req: any, res: any, next: any): void;
