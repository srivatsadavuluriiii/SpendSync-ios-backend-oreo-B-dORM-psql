/**
 * Settlement Controller
 *
 * Handles HTTP requests related to settlements and debt optimization,
 * including suggestions, creation, and tracking of settlements.
 */
import { Request, Response, NextFunction } from 'express';
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        [key: string]: any;
    };
}
/**
 * Get settlement suggestions for a group
 */
export declare function getSettlementSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Create a new settlement
 */
export declare function createSettlement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get all settlements for a group
 */
export declare function getGroupSettlements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get a settlement by ID
 */
export declare function getSettlementById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Update settlement status
 */
export declare function updateSettlementStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get settlements for a user
 */
export declare function getUserSettlements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Compare different settlement algorithms
 */
export declare function compareAlgorithms(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get detailed calculation information for a settlement
 */
export declare function getSettlementCalculationDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Get debt graph for a group
 */
export declare function getDebtGraph(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Get optimization suggestions
 */
export declare function getOptimizationSuggestions(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Get settlement details
 */
export declare function getSettlementDetails(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
export {};
