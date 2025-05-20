/**
 * Type definitions for the Settlement-service Service
 */
import { 
  BaseEntity,
  ApiResponse,
  PaginatedResponse
} from "../../../../types";

export interface ApiRequest extends Request {
  apiVersion?: string;
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  }
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
  }
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
export interface PaymentData {
  settlementId: string;
  amount: number;
  currency: string;
  payerId: string;
  receiverId: string;
  paymentMethod: string;
  metadata?: Record<string, any>;
}
export interface UserBalanceData {
  userId: string;
  balancesByGroup: Record<string, Record<string, number>>;
  balancesByUser: Record<string, Record<string, number>>;
  settlements: ISettlement[];
}
export interface ExportDataOptions {
  format: 'csv' | 'excel' | 'json';
  dataType: 'settlements' | 'balances' | 'all';
  detailLevel: 'basic' | 'detailed' | 'full';
  dateFrom?: string;
  dateTo?: string;
  status?: SettlementStatus;
  type?: 'paid' | 'received' | 'all';
}
export interface VersionHandlers {
  [version: string]: (req: ApiRequest, res: any, next: any) => Promise<void>;
}
export interface VersionedControllerMap {
  [version: string]: Record<string, any>;
}
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: Record<string, any>;
  }
export interface SuccessResponse<T> {
  success: true;
  data: T;
}
export interface CreateSettlementRequest {
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  groupId: string;
  expenseIds?: string[];
  notes?: string;
}
export interface UpdateSettlementRequest {
  status?: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}
export interface SettlementSuggestionsRequest {
  groupId: string;
  algorithm?: 'minCashFlow' | 'greedy';
  currency?: string;
  includeExplanation?: boolean;
}
export interface SettlementSuggestionsResponse {
  settlements: SettlementSuggestion[];
  algorithm: string;
  preferredCurrency: string;
  explanation?: string;
}
export interface SettlementFilters extends PaginationParams {
  groupId?: string;
  userId?: string;
  status?: 'pending' | 'completed' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
}
export interface DebtGraph {
  users: string[];
  debts: Array<{
    from: string;
    to: string;
    amount: number;
    currency: string;
  }
export interface SettlementService {
  /**
   * Creates a new settlement
   */
  createSettlement(data: CreateSettlementRequest): Promise<Settlement>;

  /**
   * Gets a settlement by ID
   */
  getSettlementById(id: string): Promise<Settlement>;

  /**
   * Gets settlements by group ID
   */
  getSettlementsByGroup(
    groupId: string, 
    filters?: SettlementFilters
  ): Promise<SettlementListResponse>;

  /**
   * Gets settlements by user ID (either as payer or receiver)
   */
  getSettlementsByUser(
    userId: string, 
    filters?: SettlementFilters
  ): Promise<SettlementListResponse>;

  /**
   * Updates a settlement
   */
  updateSettlement(id: string, data: UpdateSettlementRequest): Promise<Settlement>;

  /**
   * Deletes a settlement
   */
  deleteSettlement(id: string): Promise<void>;

  /**
   * Gets settlement suggestions for a group
   */
  getSettlementSuggestions(
    req: SettlementSuggestionsRequest
  ): Promise<SettlementSuggestionsResponse>;

  /**
   * Gets detailed settlement calculation for a group
   */
  getSettlementCalculation(
    groupId: string,
    options?: { algorithm?: string; currency?: string }
export interface SettlementAlgorithm {
  /**
   * Calculates settlements from a debt graph
   */
  calculateSettlements(
    debtGraph: DebtGraph,
    options?: { currency?: string }

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
