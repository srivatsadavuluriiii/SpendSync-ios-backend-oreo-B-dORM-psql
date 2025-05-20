/**
 * Create a controller mapping object for different API versions
 *
 * @param {string} controllerName - Base name of the controller (e.g., 'settlement')
 * @returns {Object} - Object mapping API versions to controller functions
 */
export function createVersionedControllerMapping(controllerName: string): Object;
/**
 * Create versioned handlers for a controller method
 *
 * @param {string} controllerName - Base name of the controller
 * @param {string} methodName - Name of the controller method
 * @returns {Object} - Object mapping versions to handler functions
 */
export function createVersionedMethodHandlers(controllerName: string, methodName: string): Object;
