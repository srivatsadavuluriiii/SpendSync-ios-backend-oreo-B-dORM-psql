/**
 * Settlement Service
 * 
 * Handles operations related to settlements including
 * creating, retrieving, and updating settlements
 */

import { Model } from 'mongoose';
import Settlement, { type ISettlement } from '../models/settlement.model.js';
import { BadRequestError, NotFoundError } from '../../../../shared/errors/index.js';
import { metrics, timers } from '../config/monitoring.js';
import * as cacheService from './cache.service.js';
import { 
  addSettlementProcessingJob, 
  addEmailNotificationJob,
  type EmailNotificationJobData,
  type SettlementProcessingJobData 
} from './job-queue.service.js';

// Cache TTL constants
const CACHE_TTLs = {
  settlement: 3600, // 1 hour
  settlementList: 1800, // 30 minutes
  debtGraph: 300, // 5 minutes
  exchangeRates: 3600, // 1 hour
  friendships: 86400 // 24 hours
} as const;

interface SettlementData {
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  groupId: string;
  notes?: string;
  createdBy: string;
  status: string;
}

interface DebtGraph {
  debts: Array<{
    from: string;
    to: string;
    amount: number;
    currency: string;
  }>;
  users: Array<{
    id: string;
    name: string;
  }>;
}

interface ExchangeRates {
  [currency: string]: number;
}

interface FriendshipStrengths {
  [key: string]: number;
}

/**
 * Create a new settlement
 */
export async function createSettlement(settlementData: SettlementData): Promise<ISettlement> {
  const timer = timers.createDbTimer('create', 'settlements');
  
  try {
    const settlement = await Settlement.create(settlementData);
    
    metrics.settlementCreatedCounter.inc({ 
      status: 'success',
      currency: settlementData.currency
    });
    
    // Schedule background jobs
    await scheduleSettlementJobs(settlement.id, 'created', {
      userId: settlementData.createdBy,
      status: settlement.status
    });
    
    return settlement;
  } catch (error) {
    metrics.settlementCreatedCounter.inc({ 
      status: 'error',
      currency: settlementData.currency
    });
    
    console.error('Error creating settlement:', error);
    throw error;
  } finally {
    timer();
  }
}

/**
 * Get a settlement by ID
 */
export async function getSettlementById(settlementId: string): Promise<ISettlement | null> {
  const cacheKey = cacheService.generateCacheKey('settlement', settlementId);
  
  return cacheService.cacheResult(
    async () => {
      const timer = timers.createDbTimer('findById', 'settlements');
      const settlement = await Settlement.findById(settlementId);
      timer();
      return settlement;
    },
    cacheKey,
    CACHE_TTLs.settlement
  );
}

/**
 * Get settlements for a group
 */
export async function getSettlementsByGroup(
  groupId: string,
  status?: string,
  limit: number = 20,
  offset: number = 0,
  sortBy: string = 'createdAt',
  sortOrder: string = 'desc'
): Promise<ISettlement[]> {
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
      
      const query: Record<string, any> = { groupId };
      if (status) {
        query.status = status;
      }
      
      // Build the sort object
      const sort: Record<string, 1 | -1> = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      const settlements = await Settlement.find(query)
        .sort(sort)
        .skip(offset)
        .limit(limit);
      
      timer();
      return settlements;
    },
    cacheKey,
    CACHE_TTLs.settlementList
  );
}

/**
 * Get settlements by filter
 */
export async function getSettlementsByFilter(
  filter: Record<string, any>,
  limit: number = 20,
  offset: number = 0
): Promise<ISettlement[]> {
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
    CACHE_TTLs.settlementList
  );
}

/**
 * Update settlement status
 */
export async function updateSettlementStatus(
  settlementId: string,
  status: string,
  additionalFields: Record<string, any> = {}
): Promise<ISettlement> {
  const timer = timers.createDbTimer('updateStatus', 'settlements');
  
  try {
    // Get the current settlement to check status change
    const currentSettlement = await Settlement.findById(settlementId);
    
    if (!currentSettlement) {
      throw new NotFoundError(`Settlement not found: ${settlementId}`);
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
    
    if (!settlement) {
      throw new NotFoundError(`Settlement not found after update: ${settlementId}`);
    }
    
    // Invalidate cache
    await cacheService.del(cacheService.generateCacheKey('settlement', settlementId));
    
    metrics.settlementStatusChangedCounter.inc({ 
      from: previousStatus,
      to: status
    });
    
    // Schedule background jobs for the status change
    await scheduleSettlementJobs(settlementId, 'status_updated', {
      previousStatus,
      newStatus: status,
      userId: currentSettlement.createdBy
    });
    
    return settlement;
  } catch (error) {
    console.error(`Error updating settlement status for ${settlementId}:`, error);
    throw error;
  } finally {
    timer();
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  settlementId: string,
  paymentStatus: string,
  paymentDetails: Record<string, any> = {}
): Promise<ISettlement> {
  const timer = timers.createDbTimer('updatePayment', 'settlements');
  
  try {
    const settlement = await Settlement.findByIdAndUpdate(
      settlementId,
      {
        paymentStatus,
        paymentDetails,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!settlement) {
      throw new NotFoundError(`Settlement not found: ${settlementId}`);
    }
    
    // Invalidate cache
    await cacheService.del(cacheService.generateCacheKey('settlement', settlementId));
    
    metrics.paymentAttemptCounter.inc({ 
      status: paymentStatus,
      currency: settlement.currency,
      payment_method: paymentDetails.method || 'unknown'
    });
    
    return settlement;
  } catch (error) {
    metrics.paymentAttemptCounter.inc({ 
      status: 'error',
      currency: 'unknown',
      payment_method: 'unknown'
    });
    
    console.error(`Error updating payment status for ${settlementId}:`, error);
    throw error;
  } finally {
    timer();
  }
}

/**
 * Get group debt graph
 */
export async function getGroupDebtGraph(groupId: string): Promise<DebtGraph> {
  const cacheKey = cacheService.generateCacheKey('debtGraph', groupId);
  
  return cacheService.cacheResult(
    async () => {
      // This would typically fetch from your expense service or database
      // to calculate the current debt graph
      throw new Error('Not implemented');
    },
    cacheKey,
    CACHE_TTLs.debtGraph
  );
}

/**
 * Get exchange rates
 */
export async function getExchangeRates(currencies: string[]): Promise<ExchangeRates> {
  const cacheKey = cacheService.generateCacheKey('exchangeRates', currencies.sort().join(','));
  
  return cacheService.cacheResult(
    async () => {
      // This would typically fetch from an exchange rate API
      throw new Error('Not implemented');
    },
    cacheKey,
    CACHE_TTLs.exchangeRates
  );
}

/**
 * Get friendship strengths
 */
export async function getFriendshipStrengths(groupId: string): Promise<FriendshipStrengths> {
  const cacheKey = cacheService.generateCacheKey('friendships', groupId);
  
  return cacheService.cacheResult(
    async () => {
      // This would typically calculate based on transaction history
      throw new Error('Not implemented');
    },
    cacheKey,
    CACHE_TTLs.friendships
  );
}

/**
 * Schedule settlement jobs
 */
async function scheduleSettlementJobs(
  settlementId: string,
  event: string,
  eventData: Record<string, any> = {}
): Promise<void> {
  try {
    // Add settlement processing job
    const processingData: SettlementProcessingJobData = {
      settlementId,
      processType: event,
      payload: eventData
    };
    await addSettlementProcessingJob(processingData);
    
    // Add email notification job if needed
    if (['created', 'status_updated'].includes(event)) {
      const emailData: EmailNotificationJobData = {
        userId: eventData.userId || 'system',
        email: eventData.email || 'system@example.com',
        subject: `Settlement ${event}`,
        templateType: `settlement_${event}`,
        templateData: {
          event,
          status: eventData.status,
          ...eventData
        }
      };
      await addEmailNotificationJob(emailData);
    }
  } catch (error) {
    console.error(`Error scheduling settlement jobs for ${settlementId}:`, error);
    // Don't throw - this is a background task
  }
}

export const settlementService = {
  createSettlement,
  getSettlementById,
  getSettlementsByGroup,
  getSettlementsByFilter,
  updateSettlementStatus,
  updatePaymentStatus,
  getGroupDebtGraph,
  getExchangeRates,
  getFriendshipStrengths
}; 