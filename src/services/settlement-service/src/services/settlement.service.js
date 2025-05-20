/**
 * Settlement Service
 * 
 * Handles operations related to settlements including
 * creating, retrieving, and updating settlements
 */

const Settlement = require('../models/settlement.model');
const { BadRequestError, NotFoundError } = require('../../../../shared/errors');
const { metrics, timers } = require('../config/monitoring');
const cacheService = require('./cache.service');
const { addSettlementProcessingJob, addEmailNotificationJob } = require('./job-queue.service');

/**
 * Create a new settlement
 * @param {Object} settlementData - Settlement data
 * @returns {Promise<Object>} Created settlement
 */
async function createSettlement(settlementData) {
  const timer = timers.createDatabaseTimer('createSettlement');
  
  try {
    const settlement = await Settlement.create(settlementData);
    
    metrics.settlementOperationCounter.inc({ 
      operation: 'create', 
      status: 'success' 
    });
    
    // Schedule background jobs
    await scheduleSettlementJobs(settlement.id, 'created');
    
    return settlement;
  } catch (error) {
    metrics.settlementOperationCounter.inc({ 
      operation: 'create', 
      status: 'error' 
    });
    
    console.error('Error creating settlement:', error);
    throw error;
  } finally {
    timer();
  }
}

/**
 * Get a settlement by ID
 * @param {string} settlementId - ID of the settlement
 * @returns {Promise<Object>} - Settlement document
 */
async function getSettlementById(settlementId) {
  const cacheKey = cacheService.generateCacheKey('settlement', settlementId);
  
  return cacheService.cacheResult(
    async () => {
      const timer = timers.createDbTimer('findById', 'settlements');
      const settlement = await Settlement.findById(settlementId);
      timer();
      return settlement;
    },
    cacheKey,
    cacheService.CACHE_TTLs.settlement
  );
}

/**
 * Get settlements for a group
 * @param {string} groupId - ID of the group
 * @param {string} status - Optional status filter
 * @param {number} limit - Number of items to return
 * @param {number} offset - Number of items to skip
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc or desc)
 * @returns {Promise<Array>} - List of settlements
 */
async function getSettlementsByGroup(groupId, status, limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc') {
  const cacheKey = cacheService.generateCacheKey('settlementList', groupId, {
    status,
    limit,
    offset,
    sortBy,
    sortOrder
  });
  
  return cacheService.cacheResult(
    async () => {
      const timer = timers.createDbTimer('find', 'settlements');
      
      const query = { groupId };
      if (status) {
        query.status = status;
      }
      
      // Build the sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      const settlements = await Settlement.find(query)
        .sort(sort)
        .skip(offset)
        .limit(limit);
      
      timer();
      return settlements;
    },
    cacheKey,
    cacheService.CACHE_TTLs.settlementList
  );
}

/**
 * Get settlements by filter
 * @param {Object} filter - MongoDB filter
 * @param {number} limit - Number of items to return
 * @param {number} offset - Number of items to skip
 * @returns {Promise<Array>} - List of settlements
 */
async function getSettlementsByFilter(filter, limit = 20, offset = 0) {
  // Create a cache key based on the filter
  const filterString = JSON.stringify(filter);
  const cacheKey = cacheService.generateCacheKey('settlementFilter', filterString, {
    limit,
    offset
  });
  
  return cacheService.cacheResult(
    async () => {
      const timer = timers.createDbTimer('find', 'settlements');
      
      const settlements = await Settlement.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
      
      timer();
      return settlements;
    },
    cacheKey,
    cacheService.CACHE_TTLs.settlementList
  );
}

/**
 * Update settlement status
 * @param {string} settlementId - Settlement ID
 * @param {string} status - New status
 * @param {Object} additionalFields - Additional fields to update
 * @returns {Promise<Object>} Updated settlement
 */
async function updateSettlementStatus(settlementId, status, additionalFields = {}) {
  const timer = timers.createDatabaseTimer('updateSettlementStatus');
  
  try {
    // Get the current settlement to check status change
    const currentSettlement = await Settlement.findById(settlementId);
    
    if (!currentSettlement) {
      throw new Error(`Settlement not found: ${settlementId}`);
    }
    
    const previousStatus = currentSettlement.status;
    
    // Update settlement
    const settlement = await Settlement.findByIdAndUpdate(
      settlementId,
      {
        status,
        ...additionalFields,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    // Invalidate cache
    await cacheService.del(cacheService.generateCacheKey('settlement', settlementId));
    
    metrics.settlementOperationCounter.inc({ 
      operation: 'updateStatus', 
      status: 'success' 
    });
    
    // Schedule background jobs for the status change
    await scheduleSettlementJobs(settlementId, 'status_updated', {
      previousStatus,
      newStatus: status
    });
    
    return settlement;
  } catch (error) {
    metrics.settlementOperationCounter.inc({ 
      operation: 'updateStatus', 
      status: 'error' 
    });
    
    console.error(`Error updating settlement status for ${settlementId}:`, error);
    throw error;
  } finally {
    timer();
  }
}

/**
 * Update payment status for a settlement
 * @param {string} settlementId - Settlement ID
 * @param {string} paymentStatus - Payment status
 * @param {Object} paymentDetails - Additional payment details
 * @returns {Promise<Object>} Updated settlement
 */
async function updatePaymentStatus(settlementId, paymentStatus, paymentDetails = {}) {
  const timer = timers.createDatabaseTimer('updatePaymentStatus');
  
  try {
    const settlement = await Settlement.findByIdAndUpdate(
      settlementId,
      {
        paymentStatus,
        paymentDetails: {
          ...paymentDetails,
          updatedAt: new Date()
        },
        updatedAt: new Date()
      },
      { new: true }
    );
    
    // Invalidate cache
    await cacheService.del(cacheService.generateCacheKey('settlement', settlementId));
    
    metrics.settlementOperationCounter.inc({ 
      operation: 'updatePaymentStatus', 
      status: 'success' 
    });
    
    // Schedule background jobs for payment status change
    await scheduleSettlementJobs(settlementId, 'payment_updated', {
      paymentStatus
    });
    
    return settlement;
  } catch (error) {
    metrics.settlementOperationCounter.inc({ 
      operation: 'updatePaymentStatus', 
      status: 'error' 
    });
    
    console.error(`Error updating payment status for ${settlementId}:`, error);
    throw error;
  } finally {
    timer();
  }
}

/**
 * Get the debt graph for a group
 * @param {string} groupId - ID of the group
 * @returns {Promise<Object>} - Debt graph
 */
async function getGroupDebtGraph(groupId) {
  const cacheKey = cacheService.generateCacheKey('debtGraph', groupId);
  
  return cacheService.cacheResult(
    async () => {
      // This would typically make a call to the expense service
      // to get the group's debt graph data
      // For now we'll return a placeholder
      return {
        groupId,
        members: [],
        debts: []
      };
    },
    cacheKey,
    cacheService.CACHE_TTLs.debtGraph
  );
}

/**
 * Get exchange rates for a list of currencies
 * @param {Array<string>} currencies - List of currencies
 * @returns {Promise<Object>} - Exchange rates
 */
async function getExchangeRates(currencies) {
  // Sort currencies to ensure consistent cache key regardless of order
  const sortedCurrencies = [...currencies].sort();
  const currencyKey = sortedCurrencies.join('-');
  const cacheKey = cacheService.generateCacheKey('exchangeRates', currencyKey);
  
  return cacheService.cacheResult(
    async () => {
      // This would typically make a call to an exchange rate API
      // For now we'll return a placeholder
      const rates = {};
      currencies.forEach(currency => {
        rates[currency] = 1.0;
      });
      return rates;
    },
    cacheKey,
    cacheService.CACHE_TTLs.exchangeRates
  );
}

/**
 * Get friendship strengths for a group
 * @param {string} groupId - ID of the group
 * @returns {Promise<Object>} - Friendship strengths
 */
async function getFriendshipStrengths(groupId) {
  const cacheKey = cacheService.generateCacheKey('friendships', groupId);
  
  return cacheService.cacheResult(
    async () => {
      // This would typically make a call to the user service
      // to get friendship data between group members
      // For now we'll return a placeholder
      return {
        groupId,
        friendships: []
      };
    },
    cacheKey,
    cacheService.CACHE_TTLs.friendships
  );
}

/**
 * Schedule background jobs for settlement events
 * @param {string} settlementId - Settlement ID
 * @param {string} event - Settlement event type
 * @param {Object} eventData - Additional event data
 * @returns {Promise<void>}
 */
async function scheduleSettlementJobs(settlementId, event, eventData = {}) {
  try {
    const settlement = await getSettlementById(settlementId);
    
    if (!settlement) {
      console.error(`Settlement not found for scheduling jobs: ${settlementId}`);
      return;
    }
    
    // Handle different event types
    switch (event) {
      case 'created':
        // 1. Schedule notifications for settlement creation
        await addSettlementProcessingJob({
          settlementId,
          processType: 'settlement_notification',
          payload: {
            notificationType: 'settlement_created'
          }
        });
        
        // 2. Schedule periodic reminders if the settlement is pending
        if (settlement.status === 'pending') {
          await addSettlementProcessingJob({
            settlementId,
            processType: 'periodic_reminder'
          });
        }
        break;
        
      case 'status_updated':
        const { previousStatus, newStatus } = eventData;
        
        // Notify about status change
        await addSettlementProcessingJob({
          settlementId,
          processType: 'settlement_notification',
          payload: {
            notificationType: 'settlement_updated'
          }
        });
        
        // If completed, run auto-complete job to handle notifications
        if (newStatus === 'completed' && previousStatus !== 'completed') {
          await addSettlementProcessingJob({
            settlementId,
            processType: 'auto_complete'
          });
        }
        break;
        
      case 'payment_updated':
        const { paymentStatus } = eventData;
        
        // Schedule payment status check if not final status
        if (paymentStatus === 'processing' || paymentStatus === 'pending') {
          // Check payment status after delay
          await addSettlementProcessingJob({
            settlementId,
            processType: 'payment_status_check'
          }, {
            delay: 60000 // Check after 1 minute
          });
        } else if (paymentStatus === 'succeeded') {
          // Auto-complete if payment succeeded
          await addSettlementProcessingJob({
            settlementId,
            processType: 'auto_complete'
          });
        } else if (paymentStatus === 'failed') {
          // Notify about payment failure
          await addSettlementProcessingJob({
            settlementId,
            processType: 'settlement_notification',
            payload: {
              notificationType: 'payment_failed',
              recipientIds: [settlement.payerId]
            }
          });
        }
        break;
        
      default:
        console.log(`No specific jobs scheduled for event: ${event}`);
    }
    
  } catch (error) {
    console.error(`Error scheduling jobs for settlement ${settlementId}:`, error);
    metrics.settlementOperationCounter.inc({ 
      operation: 'scheduleJobs', 
      status: 'error' 
    });
  }
}

module.exports = {
  createSettlement,
  getSettlementById,
  getSettlementsByGroup,
  getSettlementsByFilter,
  updateSettlementStatus,
  updatePaymentStatus,
  getGroupDebtGraph,
  getExchangeRates,
  getFriendshipStrengths,
  scheduleSettlementJobs
}; 