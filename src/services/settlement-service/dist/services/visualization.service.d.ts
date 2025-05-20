/**
 * Visualization Service
 *
 * Provides functionality for generating data visualizations of settlements
 */
/**
 * Generate data for a force-directed graph visualization of debts
 * @param settlements - Array of settlement objects
 * @returns Formatted data for visualization
 */
declare function generateNetworkGraph(settlements: any[]): {
    nodes: Array<{
        id: string;
        balance: number;
    }>;
    links: Array<{
        source: string;
        target: string;
        value: number;
    }>;
};
/**
 * Generate data for a Sankey diagram visualization of debts
 * @param settlements - Array of settlement objects
 * @returns Formatted data for visualization
 */
declare function generateSankeyDiagram(settlements: any[]): {
    nodes: Array<{
        id: string;
        name: string;
    }>;
    links: Array<{
        source: string;
        target: string;
        value: number;
    }>;
};
/**
 * Generate heatmap data for visualizing debt patterns
 * @param balances - Map of user IDs to their balances with other users
 * @returns Formatted data for heatmap visualization
 */
declare function generateDebtHeatmap(balances: Record<string, Record<string, number>>): {
    users: string[];
    data: Array<{
        from: string;
        to: string;
        amount: number;
    }>;
};
/**
 * Generate detailed breakdown of the settlement calculation process
 * @param debtGraph - Original debt graph
 * @param settlements - Calculated settlement transactions
 * @returns Detailed calculation steps and explanation
 */
declare function generateSettlementBreakdown(debtGraph: any, settlements: any[]): {
    inputDebts: Array<{
        from: string;
        to: string;
        amount: number;
    }>;
    userBalances: Record<string, number>;
    calculationSteps: Array<{
        step: number;
        description: string;
        action: string;
        data: any;
    }>;
    finalSettlements: Array<{
        from: string;
        to: string;
        amount: number;
    }>;
    stats: {
        originalTransactionCount: number;
        optimizedTransactionCount: number;
        reductionPercentage: number;
    };
};
/**
 * Generate a natural language explanation of the settlement calculation
 * @param debtGraph - Original debt graph
 * @param settlements - Calculated settlement transactions
 * @param algorithm - Algorithm used for optimization
 * @returns Human-readable explanation of the settlement process
 */
declare function generateSettlementExplanation(debtGraph: any, settlements: any[], algorithm: string): {
    summary: string;
    algorithmExplanation: string;
    stepByStepExplanation: string[];
    transactionSummary: string[];
};
/**
 * Generate a settlement visualization for UI display
 * @param debtGraph - Original debt graph
 * @param settlements - Calculated settlement transactions
 * @returns Visualization data for UI display
 */
declare function generateSettlementVisualization(debtGraph: any, settlements: any[]): {
    networkGraph: ReturnType<typeof generateNetworkGraph>;
    sankeyDiagram: ReturnType<typeof generateSankeyDiagram>;
    summary: {
        totalAmount: number;
        transactionCount: number;
        userCount: number;
        reductionRate: number;
    };
};
export { generateNetworkGraph, generateSankeyDiagram, generateDebtHeatmap, generateSettlementBreakdown, generateSettlementExplanation, generateSettlementVisualization };
