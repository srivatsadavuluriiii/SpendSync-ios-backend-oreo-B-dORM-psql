/**
 * Service Registry
 * 
 * Manages service discovery, health checks, and circuit breaking
 */

const axios = require('axios');
const { logger } = require('../utils/logger');
const config = require('../../api-gateway/config');

// Service statuses
const SERVICE_STATUS = {
  UP: 'UP',
  DOWN: 'DOWN',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN'
};

// Circuit breaker states
const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

// Default circuit breaker settings
const DEFAULT_CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 3,        // Number of failures before opening circuit
  resetTimeout: 30000,        // Time in ms to wait before trying to close circuit
  successThreshold: 2,        // Number of successful calls needed to close circuit
  timeout: 5000,              // Request timeout in ms
  monitorInterval: 10000      // Health check interval in ms
};

class ServiceRegistry {
  constructor() {
    // Registry of services with their status and circuit state
    this.registry = {};
    
    // Initialize registry with known services
    this._initializeRegistry();
    
    // Start health checks
    this._startHealthChecks();
  }

  /**
   * Initialize registry with default services
   * @private
   */
  _initializeRegistry() {
    if (!config.serviceUrls) {
      logger.warn('No service URLs configured, service registry will be empty');
      return;
    }

    // Add each service to registry
    Object.entries(config.serviceUrls).forEach(([serviceName, url]) => {
      this.registry[serviceName] = {
        name: serviceName,
        url,
        status: SERVICE_STATUS.UP,
        circuit: {
          state: CIRCUIT_STATE.CLOSED,
          failureCount: 0,
          successCount: 0,
          lastFailureTime: null,
          lastAttemptTime: null,
          config: {
            ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
            ...(config.circuitBreaker?.[serviceName] || {})
          }
        },
        healthCheckEndpoint: `${url}/health`,
      };
    });

    logger.info(`Service registry initialized with ${Object.keys(this.registry).length} services`);
  }

  /**
   * Start periodic health checks for all services
   * @private
   */
  _startHealthChecks() {
    if (Object.keys(this.registry).length === 0) {
      logger.warn('No services in registry, health checks will not run');
      return;
    }

    // Check each service initially
    this._checkAllServices();

    // Set up interval for regular checks
    setInterval(() => {
      this._checkAllServices();
    }, DEFAULT_CIRCUIT_BREAKER_CONFIG.monitorInterval);
  }

  /**
   * Check health of all services
   * @private
   */
  async _checkAllServices() {
    const checks = Object.values(this.registry).map(service => 
      this._checkServiceHealth(service.name)
    );
    
    try {
      await Promise.all(checks);
      logger.debug('Completed health checks for all services');
    } catch (error) {
      logger.error('Error during service health checks:', error);
    }
  }

  /**
   * Check health of a specific service
   * @param {string} serviceName - Name of service to check
   * @private
   */
  async _checkServiceHealth(serviceName) {
    const service = this.registry[serviceName];
    if (!service) {
      logger.warn(`Attempted to check unknown service: ${serviceName}`);
      return;
    }

    // Skip if circuit is open and reset timeout hasn't elapsed
    if (
      service.circuit.state === CIRCUIT_STATE.OPEN && 
      service.circuit.lastFailureTime && 
      Date.now() - service.circuit.lastFailureTime < service.circuit.config.resetTimeout
    ) {
      return;
    }

    // Try half-open state if reset timeout has elapsed
    if (
      service.circuit.state === CIRCUIT_STATE.OPEN && 
      service.circuit.lastFailureTime && 
      Date.now() - service.circuit.lastFailureTime >= service.circuit.config.resetTimeout
    ) {
      service.circuit.state = CIRCUIT_STATE.HALF_OPEN;
      logger.info(`Circuit for ${serviceName} is now half-open`);
    }

    try {
      const response = await axios.get(service.healthCheckEndpoint, {
        timeout: service.circuit.config.timeout
      });

      // Check response status
      if (response.status === 200 && response.data?.status === SERVICE_STATUS.UP) {
        this._handleSuccessfulHealthCheck(serviceName);
      } else {
        this._handleFailedHealthCheck(serviceName, 'Unhealthy status returned');
      }
    } catch (error) {
      this._handleFailedHealthCheck(serviceName, error.message);
    }
  }

  /**
   * Handle successful health check
   * @param {string} serviceName - Name of service
   * @private
   */
  _handleSuccessfulHealthCheck(serviceName) {
    const service = this.registry[serviceName];
    const wasDown = service.status !== SERVICE_STATUS.UP;
    
    // Update service status
    service.status = SERVICE_STATUS.UP;
    service.circuit.lastAttemptTime = Date.now();
    
    // Handle circuit state transition
    if (service.circuit.state === CIRCUIT_STATE.HALF_OPEN) {
      service.circuit.successCount++;
      
      if (service.circuit.successCount >= service.circuit.config.successThreshold) {
        service.circuit.state = CIRCUIT_STATE.CLOSED;
        service.circuit.failureCount = 0;
        service.circuit.successCount = 0;
        logger.info(`Circuit for ${serviceName} is now closed`);
      }
    } else if (service.circuit.state === CIRCUIT_STATE.CLOSED) {
      // Reset counters in closed state
      service.circuit.failureCount = 0;
      service.circuit.successCount = 0;
    }
    
    // Log service recovery
    if (wasDown) {
      logger.info(`Service ${serviceName} is now UP`);
    }
  }

  /**
   * Handle failed health check
   * @param {string} serviceName - Name of service
   * @param {string} reason - Failure reason
   * @private
   */
  _handleFailedHealthCheck(serviceName, reason) {
    const service = this.registry[serviceName];
    const wasUp = service.status === SERVICE_STATUS.UP;
    
    // Update service status
    service.status = SERVICE_STATUS.DOWN;
    service.circuit.lastAttemptTime = Date.now();
    service.circuit.lastFailureTime = Date.now();
    service.circuit.failureCount++;
    
    // Handle circuit state transition
    if (service.circuit.state === CIRCUIT_STATE.CLOSED && 
        service.circuit.failureCount >= service.circuit.config.failureThreshold) {
      service.circuit.state = CIRCUIT_STATE.OPEN;
      logger.warn(`Circuit for ${serviceName} is now open`);
    } else if (service.circuit.state === CIRCUIT_STATE.HALF_OPEN) {
      service.circuit.state = CIRCUIT_STATE.OPEN;
      service.circuit.successCount = 0;
      logger.warn(`Circuit for ${serviceName} returned to open state`);
    }
    
    // Log service failure
    if (wasUp) {
      logger.warn(`Service ${serviceName} is DOWN: ${reason}`);
    }
  }

  /**
   * Get service URL with circuit breaking
   * @param {string} serviceName - Name of service
   * @returns {string|null} Service URL or null if unavailable
   */
  getServiceUrl(serviceName) {
    const service = this.registry[serviceName];
    
    if (!service) {
      logger.warn(`Requested unknown service: ${serviceName}`);
      return null;
    }
    
    // Check if circuit is open
    if (service.circuit.state === CIRCUIT_STATE.OPEN) {
      // Allow request if in reset window
      if (Date.now() - service.circuit.lastFailureTime >= service.circuit.config.resetTimeout) {
        service.circuit.state = CIRCUIT_STATE.HALF_OPEN;
        logger.info(`Circuit for ${serviceName} is now half-open`);
        return service.url;
      }
      
      // Circuit is open, reject request
      logger.debug(`Circuit for ${serviceName} is open, request rejected`);
      return null;
    }
    
    // Circuit is closed or half-open, allow request
    return service.url;
  }

  /**
   * Check if service is available
   * @param {string} serviceName - Name of service
   * @returns {boolean} Whether service is available
   */
  isServiceAvailable(serviceName) {
    return this.getServiceUrl(serviceName) !== null;
  }

  /**
   * Get service status
   * @param {string} serviceName - Name of service
   * @returns {Object} Service status details
   */
  getServiceStatus(serviceName) {
    const service = this.registry[serviceName];
    
    if (!service) {
      return { 
        name: serviceName,
        status: 'UNKNOWN',
        message: 'Service not registered'
      };
    }
    
    return {
      name: service.name,
      url: service.url,
      status: service.status,
      circuit: {
        state: service.circuit.state,
        failureCount: service.circuit.failureCount,
        successCount: service.circuit.successCount,
        lastFailureTime: service.circuit.lastFailureTime,
        lastAttemptTime: service.circuit.lastAttemptTime
      }
    };
  }

  /**
   * Get status of all services
   * @returns {Object[]} Array of service statuses
   */
  getAllServicesStatus() {
    return Object.keys(this.registry).map(serviceName => 
      this.getServiceStatus(serviceName)
    );
  }
}

// Create and export singleton instance
const serviceRegistry = new ServiceRegistry();

module.exports = serviceRegistry; 