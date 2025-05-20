/**
 * Type Definitions
 * 
 * Central location for all type definitions used in the settlement service
 */

import { Request, Response, NextFunction } from 'express';
import { Document, Types } from 'mongoose';

/**
 * Extended Express Request with API version
 */
export interface ApiRequest extends Request {
  apiVersion?: string;
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
}

/**
 * Settlement Status
 */
export enum SettlementStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Settlement Document Interface
 */
export interface ISettlement extends Document {
  _id: Types.ObjectId;
  payerId: Types.ObjectId;
  receiverId: Types.ObjectId;
  amount: number;
  currency: string;
  groupId: Types.ObjectId;
  status: SettlementStatus;
  completedAt?: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  paymentId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
}

/**
 * User Preference Document Interface
 */
export interface IUserPreference extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  defaultCurrency: string;
  settlementAlgorithm: string;
  receiveNotifications: boolean;
  notificationSettings: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  paymentPreferences: {
    defaultMethod?: string;
    savedMethods?: Array<{
      id: string;
      type: string;
      lastFour?: string;
      isDefault: boolean;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Settlement Creation Data Interface
 */
export interface SettlementCreationData {
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  groupId: string;
  notes?: string;
  createdBy: string;
  status: SettlementStatus;
}

/**
 * Payment Data Interface
 */
export interface PaymentData {
  settlementId: string;
  amount: number;
  currency: string;
  payerId: string;
  receiverId: string;
  paymentMethod: string;
  metadata?: Record<string, any>;
}

/**
 * User Balance Data Interface
 */
export interface UserBalanceData {
  userId: string;
  balancesByGroup: Record<string, Record<string, number>>;
  balancesByUser: Record<string, Record<string, number>>;
  settlements: ISettlement[];
}

/**
 * Export Data Options Interface
 */
export interface ExportDataOptions {
  format: 'csv' | 'excel' | 'json';
  dataType: 'settlements' | 'balances' | 'all';
  detailLevel: 'basic' | 'detailed' | 'full';
  dateFrom?: string;
  dateTo?: string;
  status?: SettlementStatus;
  type?: 'paid' | 'received' | 'all';
}

/**
 * Version Handlers Interface
 */
export interface VersionHandlers {
  [version: string]: (req: ApiRequest, res: Response, next: NextFunction) => Promise<void>;
}

/**
 * Versioned Controller Map Interface
 */
export interface VersionedControllerMap {
  [version: string]: Record<string, any>;
}

/**
 * Error Response Interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, any>;
  };
}

/**
 * Success Response Interface
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * API Response Interface
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Algorithm Types
 */
export interface DebtInfo {
  userId: string;
  amount: number;
  currency: string;
}

export interface FriendRelation {
  userId1: string;
  userId2: string;
  strength: number;
}

export interface Settlement {
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
}

export interface SettlementAlgorithm {
  name: string;
  description: string;
  calculate(debts: DebtInfo[], relations?: FriendRelation[]): Settlement[];
}

/**
 * Graph Types
 */
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