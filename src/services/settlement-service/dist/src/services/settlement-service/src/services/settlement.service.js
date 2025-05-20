/**
 * Settlement Service
 *
 * Handles operations related to settlements including
 * creating, retrieving, and updating settlements
 */
import Settlement from '../models/settlement.model.js';
import { NotFoundError } from '../../../../shared/errors/index.js';
import { metrics, timers } from '../config/monitoring.js';
import { cacheService } from './cache.service';
import { addSettlementProcessingJob, addEmailNotificationJob } from './job-queue.service.js';
import winston from 'winston';
// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple())
        })
    ]
});
// If we're not in production, log to the console with colors
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    }));
}
// Cache TTL constants
const CACHE_TTLs = {
    settlement: 3600, // 1 hour
    settlementList: 1800, // 30 minutes
    debtGraph: 300, // 5 minutes
    exchangeRates: 3600, // 1 hour
    friendships: 86400 // 24 hours
};
export class SettlementService {
    /**
     * Create a new settlement
     */
    async createSettlement(settlementData) {
        const timer = timers.createDbTimer('create', 'settlements');
        try {
            const settlement = await Settlement.create(settlementData);
            metrics.settlementCreatedCounter.inc({
                status: 'success',
                currency: settlementData.currency
            });
            // Schedule background jobs
            await this.scheduleSettlementJobs(settlement.id, 'created', {
                userId: settlementData.createdBy,
                status: settlement.status
            });
            return settlement;
        }
        catch (error) {
            metrics.settlementCreatedCounter.inc({
                status: 'error',
                currency: settlementData.currency
            });
            console.error('Error creating settlement:', error);
            throw error;
        }
        finally {
            timer();
        }
    }
    /**
     * Get a settlement by ID
     */
    async getSettlementById(settlementId) {
        const cacheKey = cacheService.generateCacheKey('settlement', settlementId);
        return cacheService.cacheResult(async () => {
            const timer = timers.createDbTimer('findById', 'settlements');
            const settlement = await Settlement.findById(settlementId);
            timer();
            return settlement;
        }, cacheKey, CACHE_TTLs.settlement);
    }
    /**
     * Get settlements for a group
     */
    async getSettlementsByGroup(groupId, status, limit = 20, offset = 0, sortBy = 'createdAt', sortOrder = 'desc') {
        const filterParams = {
            status,
            limit,
            offset,
            sortBy,
            sortOrder
        };
        const cacheKey = cacheService.generateCacheKey('settlementList', groupId, filterParams);
        return cacheService.cacheResult(async () => {
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
        }, cacheKey, CACHE_TTLs.settlementList);
    }
    /**
     * Get settlements by filter
     */
    async getSettlementsByFilter(filter, limit = 20, offset = 0) {
        // Create a cache key based on the filter
        const filterString = JSON.stringify(filter);
        const paginationParams = { limit, offset };
        const cacheKey = cacheService.generateCacheKey('settlementFilter', filterString, paginationParams);
        return cacheService.cacheResult(async () => {
            const timer = timers.createDbTimer('find', 'settlements');
            const settlements = await Settlement.find(filter)
                .sort({ createdAt: -1 })
                .skip(offset)
                .limit(limit);
            timer();
            return settlements;
        }, cacheKey, CACHE_TTLs.settlementList);
    }
    /**
     * Update settlement status
     */
    async updateSettlementStatus(settlementId, status, additionalFields = {}) {
        const timer = timers.createDbTimer('updateStatus', 'settlements');
        try {
            // Get the current settlement to check status change
            const currentSettlement = await Settlement.findById(settlementId);
            if (!currentSettlement) {
                throw new NotFoundError(`Settlement not found: ${settlementId}`);
            }
            const previousStatus = currentSettlement.status;
            // Update settlement
            const settlement = await Settlement.findByIdAndUpdate(settlementId, {
                status,
                ...additionalFields,
                updatedAt: new Date()
            }, { new: true });
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
            await this.scheduleSettlementJobs(settlementId, 'status_updated', {
                previousStatus,
                newStatus: status,
                userId: currentSettlement.createdBy
            });
            return settlement;
        }
        catch (error) {
            console.error(`Error updating settlement status for ${settlementId}:`, error);
            throw error;
        }
        finally {
            timer();
        }
    }
    /**
     * Update payment status
     */
    async updatePaymentStatus(settlementId, paymentStatus, paymentDetails = {}) {
        const timer = timers.createDbTimer('updatePayment', 'settlements');
        try {
            const settlement = await Settlement.findByIdAndUpdate(settlementId, {
                paymentStatus,
                paymentDetails,
                updatedAt: new Date()
            }, { new: true });
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
        }
        catch (error) {
            metrics.paymentAttemptCounter.inc({
                status: 'error',
                currency: 'unknown',
                payment_method: 'unknown'
            });
            console.error(`Error updating payment status for ${settlementId}:`, error);
            throw error;
        }
        finally {
            timer();
        }
    }
    /**
     * Get group debt graph
     */
    async getGroupDebtGraph(groupId) {
        const cacheKey = cacheService.generateCacheKey('debtGraph', groupId);
        return cacheService.cacheResult(async () => {
            // This would typically fetch from your expense service or database
            // to calculate the current debt graph
            throw new Error('Not implemented');
        }, cacheKey, CACHE_TTLs.debtGraph);
    }
    /**
     * Get exchange rates
     */
    async getExchangeRates(currencies) {
        const cacheKey = cacheService.generateCacheKey('exchangeRates', currencies.sort().join(','));
        return cacheService.cacheResult(async () => {
            // This would typically fetch from an exchange rate API
            throw new Error('Not implemented');
        }, cacheKey, CACHE_TTLs.exchangeRates);
    }
    /**
     * Get friendship strengths
     */
    async getFriendshipStrengths(groupId) {
        const cacheKey = cacheService.generateCacheKey('friendships', groupId);
        return cacheService.cacheResult(async () => {
            // This would typically calculate based on transaction history
            throw new Error('Not implemented');
        }, cacheKey, CACHE_TTLs.friendships);
    }
    /**
     * Schedule settlement jobs
     */
    async scheduleSettlementJobs(settlementId, event, eventData = {}) {
        try {
            // Add settlement processing job
            const processingData = {
                settlementId,
                processType: event,
                payload: eventData
            };
            await addSettlementProcessingJob(processingData);
            // Add email notification job if needed
            if (['created', 'status_updated'].includes(event)) {
                const emailData = {
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
        }
        catch (error) {
            console.error(`Error scheduling settlement jobs for ${settlementId}:`, error);
            // Don't throw - this is a background task
        }
    }
    async getSettlementsByGroupId(groupId, filterParams = {}) {
        const params = {
            status: filterParams.status,
            startDate: filterParams.startDate,
            endDate: filterParams.endDate,
            sortBy: filterParams.sortBy,
            sortOrder: filterParams.sortOrder
        };
        const cacheKey = cacheService.generateCacheKey('settlementList', groupId, params);
        return cacheService.cacheResult(async () => {
            // ... existing code ...
            throw new Error('Not implemented');
        }, cacheKey);
    }
    async filterSettlements(filter, paginationParams) {
        const filterString = JSON.stringify(filter);
        const params = {
            limit: paginationParams.limit,
            offset: paginationParams.offset
        };
        const cacheKey = cacheService.generateCacheKey('settlementFilter', filterString, params);
        return cacheService.cacheResult(async () => {
            // ... existing code ...
            throw new Error('Not implemented');
        }, cacheKey);
    }
}
// Export a singleton instance
export const settlementService = new SettlementService();
