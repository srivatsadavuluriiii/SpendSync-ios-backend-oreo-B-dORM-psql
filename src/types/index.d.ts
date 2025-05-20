/**
 * Global type definitions for the SpendSync application
 */

/**
 * Common API Response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * User entity
 */
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  profileImage?: string;
}

/**
 * Group entity
 */
export interface Group extends BaseEntity {
  name: string;
  description?: string;
  ownerId: string;
  members: string[];
  defaultCurrency: string;
}

/**
 * Expense entity
 */
export interface Expense extends BaseEntity {
  title: string;
  amount: number;
  currency: string;
  date: string;
  payerId: string;
  groupId: string;
  description?: string;
  category?: string;
  receipt?: string;
  splitType: 'equal' | 'percentage' | 'amount' | 'shares';
  splits: ExpenseSplit[];
}

/**
 * Expense split entity
 */
export interface ExpenseSplit {
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
  paid?: boolean;
  paidAt?: string;
}

/**
 * Settlement entity
 */
export interface Settlement extends BaseEntity {
  payerId: string;
  receiverId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'cancelled';
  groupId: string;
  expenseIds?: string[];
  completedAt?: string;
}

/**
 * Settlement Suggestion
 */
export interface SettlementSuggestion {
  from: string;
  to: string;
  amount: number;
  currency: string;
}

/**
 * Settlement Calculation Result
 */
export interface SettlementCalculation {
  algorithm: string;
  breakdown: {
    inputDebts: Array<{from: string; to: string; amount: number}>;
    userBalances: Record<string, number>;
    calculationSteps: any[];
  };
  explanation: {
    summary: string;
    algorithmExplanation: string;
    stepByStepExplanation: string;
    transactionSummary: string;
  };
  settlements: SettlementSuggestion[];
  stats: {
    totalTransactions: number;
    totalAmount: number;
  };
}

/**
 * User Preferences
 */
export interface UserPreferences {
  userId: string;
  defaultCurrency: string;
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  settlementAlgorithm: 'minCashFlow' | 'greedy';
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  expenseCategories?: string[];
}

/**
 * Notification entity
 */
export interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: 'expense' | 'settlement' | 'group' | 'system';
  referenceId?: string;
  read: boolean;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 