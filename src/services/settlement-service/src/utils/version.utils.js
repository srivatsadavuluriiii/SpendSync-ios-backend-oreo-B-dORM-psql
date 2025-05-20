/**
 * Version Utilities
 * 
 * Helper functions for managing API versioning
 */

const { DEFAULT_VERSION } = require('../middleware/versioning.middleware');
const path = require('path');
const fs = require('fs');

/**
 * Create a controller mapping object for different API versions
 * 
 * @param {string} controllerName - Base name of the controller (e.g., 'settlement')
 * @returns {Object} - Object mapping API versions to controller functions
 */
function createVersionedControllerMapping(controllerName) {
  const versionedControllers = {};
  
  // Get the default controller
  const defaultController = require(`../controllers/${controllerName}.controller.js`);
  versionedControllers[DEFAULT_VERSION] = defaultController;
  
  // Check for versioned controllers
  const controllersDir = path.join(__dirname, '../controllers');
  
  if (fs.existsSync(controllersDir)) {
    fs.readdirSync(controllersDir).forEach(file => {
      // Look for versioned controllers, e.g., settlement.controller.v2.js
      const match = file.match(new RegExp(`${controllerName}\\.controller\\.(v\\d+)\\.js$`));
      if (match) {
        const version = match[1];
        versionedControllers[version] = require(`../controllers/${file}`);
      }
    });
  }
  
  return versionedControllers;
}

/**
 * Create versioned handlers for a controller method
 * 
 * @param {string} controllerName - Base name of the controller
 * @param {string} methodName - Name of the controller method
 * @returns {Object} - Object mapping versions to handler functions
 */
function createVersionedMethodHandlers(controllerName, methodName) {
  const controllers = createVersionedControllerMapping(controllerName);
  const handlers = {};
  
  // Create handlers for each version that has the method
  Object.entries(controllers).forEach(([version, controller]) => {
    if (controller[methodName]) {
      handlers[version] = controller[methodName];
    }
  });
  
  return handlers;
}

module.exports = {
  createVersionedControllerMapping,
  createVersionedMethodHandlers
}; 