const Consul = require('consul');
const config = require('../config');
const logger = require('../utils/logger');

class ServiceRegistry {
  constructor() {
    this.consul = new Consul({
      host: config.consul.host,
      port: config.consul.port,
      promisify: true
    });
    
    this.serviceId = null;
  }

  /**
   * Register a service with Consul
   * @param {Object} options Service registration options
   */
  async register({ name, host, port, healthCheck }) {
    try {
      this.serviceId = `${name}-${host}-${port}`;
      
      await this.consul.agent.service.register({
        id: this.serviceId,
        name,
        address: host,
        port,
        check: {
          http: `http://${host}:${port}${healthCheck || '/health'}`,
          interval: '15s',
          timeout: '5s'
        },
        tags: ['api', process.env.NODE_ENV]
      });

      logger.info(`Service registered: ${this.serviceId}`);
      
      // Graceful shutdown
      process.on('SIGTERM', () => this.deregister());
      process.on('SIGINT', () => this.deregister());
      
    } catch (error) {
      logger.error('Service registration failed:', error);
      throw error;
    }
  }

  /**
   * Deregister service from Consul
   */
  async deregister() {
    if (this.serviceId) {
      try {
        await this.consul.agent.service.deregister(this.serviceId);
        logger.info(`Service deregistered: ${this.serviceId}`);
      } catch (error) {
        logger.error('Service deregistration failed:', error);
      }
    }
  }

  /**
   * Discover service by name
   * @param {string} serviceName Name of the service to discover
   * @returns {Promise<Array>} List of healthy service instances
   */
  async discover(serviceName) {
    try {
      const { body } = await this.consul.health.service({
        service: serviceName,
        passing: true
      });

      return body.map(entry => ({
        id: entry.Service.ID,
        address: entry.Service.Address,
        port: entry.Service.Port
      }));
    } catch (error) {
      logger.error(`Service discovery failed for ${serviceName}:`, error);
      throw error;
    }
  }
}

module.exports = new ServiceRegistry(); 