/**
 * Settlement Service
 *
 * Handles operations related to settlements including
 * creating, retrieving, and updating settlements
 */
import { type ISettlement } from '../models/settlement.model.js';
export interface SettlementData {
    payerId: string;
    receiverId: string;
    amount: number;
    currency: string;
    groupId: string;
    notes?: string;
    createdBy: string;
    status: string;
}
export interface DebtGraph {
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
export interface ExchangeRates {
    [currency: string]: number;
}
export interface FriendshipStrengths {
    [key: string]: number;
}
export interface FilterParams {
    status?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginationParams {
    limit: number;
    offset: number;
}
export interface ISettlementService {
    createSettlement(settlementData: SettlementData): Promise<ISettlement>;
    getSettlementById(settlementId: string): Promise<ISettlement | null>;
    getSettlementsByGroup(groupId: string, status?: string, limit?: number, offset?: number, sortBy?: string, sortOrder?: string): Promise<ISettlement[]>;
    getSettlementsByFilter(filter: Record<string, any>, limit?: number, offset?: number): Promise<ISettlement[]>;
    updateSettlementStatus(settlementId: string, status: string, additionalFields?: Record<string, any>): Promise<ISettlement>;
    updatePaymentStatus(settlementId: string, paymentStatus: string, paymentDetails?: Record<string, any>): Promise<ISettlement>;
    getGroupDebtGraph(groupId: string): Promise<DebtGraph>;
    getExchangeRates(currencies: string[]): Promise<ExchangeRates>;
    getFriendshipStrengths(groupId: string): Promise<FriendshipStrengths>;
    getSettlementsByGroupId(groupId: string, filterParams?: FilterParams): Promise<ISettlement[]>;
    filterSettlements(filter: Record<string, any>, paginationParams: PaginationParams): Promise<ISettlement[]>;
    getSettlementCalculationDetails(settlementId: string): Promise<any>;
    getSettlementDetails(settlementId: string): Promise<any>;
}
export declare class SettlementService implements ISettlementService {
    /**
     * Create a new settlement
     */
    createSettlement(settlementData: SettlementData): Promise<ISettlement>;
    /**
     * Get a settlement by ID
     */
    getSettlementById(settlementId: string): Promise<ISettlement | null>;
    /**
     * Get settlements for a group
     */
    getSettlementsByGroup(groupId: string, status?: string, limit?: number, offset?: number, sortBy?: string, sortOrder?: string): Promise<ISettlement[]>;
    /**
     * Get settlements by filter
     */
    getSettlementsByFilter(filter: Record<string, any>, limit?: number, offset?: number): Promise<ISettlement[]>;
    /**
     * Update settlement status
     */
    updateSettlementStatus(settlementId: string, status: string, additionalFields?: Record<string, any>): Promise<ISettlement>;
    /**
     * Update payment status
     */
    updatePaymentStatus(settlementId: string, paymentStatus: string, paymentDetails?: Record<string, any>): Promise<ISettlement>;
    /**
     * Get group debt graph
     */
    getGroupDebtGraph(groupId: string): Promise<DebtGraph>;
    /**
     * Get exchange rates
     */
    getExchangeRates(currencies: string[]): Promise<ExchangeRates>;
    /**
     * Get friendship strengths
     */
    getFriendshipStrengths(groupId: string): Promise<FriendshipStrengths>;
    /**
     * Schedule settlement jobs
     */
    private scheduleSettlementJobs;
    getSettlementsByGroupId(groupId: string, filterParams?: FilterParams): Promise<ISettlement[]>;
    filterSettlements(filter: Record<string, any>, paginationParams: PaginationParams): Promise<ISettlement[]>;
    /**
     * Get detailed calculation information for a settlement
     */
    getSettlementCalculationDetails(settlementId: string): Promise<any>;
    /**
     * Get detailed settlement information
     */
    getSettlementDetails(settlementId: string): Promise<any>;
}
export declare const settlementService: SettlementService;
