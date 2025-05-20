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
function generateNetworkGraph(settlements) {
    // Extract unique users and calculate balances
    const users = new Map();
    const links = [];
    // Process all settlements to create links and calculate user balances
    for (const settlement of settlements) {
        const { from, to, amount } = settlement;
        // Update user balances
        users.set(from, (users.get(from) || 0) - amount);
        users.set(to, (users.get(to) || 0) + amount);
        // Create or update link
        const existingLink = links.find(link => link.source === from && link.target === to);
        if (existingLink) {
            existingLink.value += amount;
        }
        else {
            links.push({
                source: from,
                target: to,
                value: amount
            });
        }
    }
    // Convert users map to nodes array
    const nodes = Array.from(users.entries()).map(([id, balance]) => ({
        id,
        balance
    }));
    return { nodes, links };
}
/**
 * Generate data for a Sankey diagram visualization of debts
 * @param settlements - Array of settlement objects
 * @returns Formatted data for visualization
 */
function generateSankeyDiagram(settlements) {
    // Extract unique users
    const userIds = new Set();
    for (const settlement of settlements) {
        userIds.add(settlement.from);
        userIds.add(settlement.to);
    }
    // Create nodes
    const nodes = Array.from(userIds).map(id => ({
        id,
        name: id // In a real app, we would fetch user names
    }));
    // Create links
    const links = [];
    for (const settlement of settlements) {
        const { from, to, amount } = settlement;
        // Find or create link
        const existingLink = links.find(link => link.source === from && link.target === to);
        if (existingLink) {
            existingLink.value += amount;
        }
        else {
            links.push({
                source: from,
                target: to,
                value: amount
            });
        }
    }
    return { nodes, links };
}
/**
 * Generate heatmap data for visualizing debt patterns
 * @param balances - Map of user IDs to their balances with other users
 * @returns Formatted data for heatmap visualization
 */
function generateDebtHeatmap(balances) {
    const users = new Set();
    const data = [];
    // Extract all users and debt data
    for (const fromUserId in balances) {
        users.add(fromUserId);
        for (const toUserId in balances[fromUserId]) {
            users.add(toUserId);
            const amount = balances[fromUserId][toUserId];
            if (amount !== 0) {
                data.push({
                    from: fromUserId,
                    to: toUserId,
                    amount
                });
            }
        }
    }
    return {
        users: Array.from(users),
        data
    };
}
/**
 * Generate detailed breakdown of the settlement calculation process
 * @param debtGraph - Original debt graph
 * @param settlements - Calculated settlement transactions
 * @returns Detailed calculation steps and explanation
 */
function generateSettlementBreakdown(debtGraph, settlements) {
    // Extract the original debts
    const inputDebts = debtGraph.debts ? [...debtGraph.debts] : [];
    // Calculate net balances from the original debts
    const userBalances = {};
    for (const debt of inputDebts) {
        userBalances[debt.from] = (userBalances[debt.from] || 0) - debt.amount;
        userBalances[debt.to] = (userBalances[debt.to] || 0) + debt.amount;
    }
    // Identify creditors and debtors
    const creditors = [];
    const debtors = [];
    for (const userId in userBalances) {
        const balance = userBalances[userId];
        if (balance > 0) {
            creditors.push({ id: userId, amount: balance });
        }
        else if (balance < 0) {
            debtors.push({ id: userId, amount: -balance });
        }
    }
    // Sort both arrays by amount (descending)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    // Create calculation steps
    const calculationSteps = [
        {
            step: 1,
            description: "Extract original debts from transactions",
            action: "Input Collection",
            data: inputDebts
        },
        {
            step: 2,
            description: "Calculate net balance for each user",
            action: "Balance Calculation",
            data: { ...userBalances }
        },
        {
            step: 3,
            description: "Separate users into creditors (positive balance) and debtors (negative balance)",
            action: "User Classification",
            data: {
                creditors: [...creditors],
                debtors: [...debtors]
            }
        },
        {
            step: 4,
            description: "Apply optimization algorithm to generate minimal settlement transactions",
            action: "Settlement Optimization",
            data: settlements
        }
    ];
    // Calculate statistics
    const stats = {
        originalTransactionCount: inputDebts.length,
        optimizedTransactionCount: settlements.length,
        reductionPercentage: inputDebts.length > 0
            ? Math.round((1 - settlements.length / inputDebts.length) * 100)
            : 0
    };
    return {
        inputDebts,
        userBalances,
        calculationSteps,
        finalSettlements: settlements,
        stats
    };
}
/**
 * Generate a natural language explanation of the settlement calculation
 * @param debtGraph - Original debt graph
 * @param settlements - Calculated settlement transactions
 * @param algorithm - Algorithm used for optimization
 * @returns Human-readable explanation of the settlement process
 */
function generateSettlementExplanation(debtGraph, settlements, algorithm) {
    // Calculate breakdown data to use in explanation
    const breakdown = generateSettlementBreakdown(debtGraph, settlements);
    // Create algorithm-specific explanation
    let algorithmExplanation = "";
    switch (algorithm) {
        case 'greedy':
            algorithmExplanation =
                "The Greedy algorithm works by first calculating the net balance for each user. " +
                    "It then sorts users with positive balances (creditors) and negative balances (debtors) by the amount owed. " +
                    "The algorithm matches the largest debtors with the largest creditors to minimize the number of transactions.";
            break;
        case 'minCashFlow':
            algorithmExplanation =
                "The Minimum Cash Flow algorithm minimizes the amount of cash flowing between users. " +
                    "It calculates the net balance for each user, then repeatedly finds the user with the maximum debt and the user with the maximum credit. " +
                    "It settles as much debt as possible between these users and continues until all debts are settled.";
            break;
        case 'friendPreference':
            algorithmExplanation =
                "The Friend Preference algorithm prioritizes settlements between users with strong friendship connections. " +
                    "It calculates net balances as usual but then optimizes transactions based on friendship strength, " +
                    "preferring to have friends settle directly with each other when possible.";
            break;
        default:
            algorithmExplanation =
                "This algorithm optimizes debt settlements to reduce the total number of transactions needed.";
    }
    // Create step-by-step explanation
    const stepByStepExplanation = [];
    // Step 1: Original debt analysis
    stepByStepExplanation.push(`The calculation started with ${breakdown.inputDebts.length} original transactions between ${Object.keys(breakdown.userBalances).length} users.`);
    // Step 2: Balance calculation
    const creditorCount = breakdown.calculationSteps[2].data.creditors.length;
    const debtorCount = breakdown.calculationSteps[2].data.debtors.length;
    stepByStepExplanation.push(`After calculating net balances, we found ${creditorCount} users are owed money and ${debtorCount} users owe money.`);
    // Step 3: Optimization process
    stepByStepExplanation.push(`The ${algorithm} algorithm was applied to find the optimal settlement plan, reducing the number of transactions from ${breakdown.stats.originalTransactionCount} to ${breakdown.stats.optimizedTransactionCount} (${breakdown.stats.reductionPercentage}% reduction).`);
    // Create transaction summary
    const transactionSummary = settlements.map(s => `${s.from} pays ${s.amount.toFixed(2)} ${s.currency || ''} to ${s.to}`);
    // Create overall summary
    const summary = `Using the ${algorithm} algorithm, we optimized ${breakdown.inputDebts.length} original transactions into ${settlements.length} settlements, ` +
        `reducing the number of transactions by ${breakdown.stats.reductionPercentage}%.`;
    return {
        summary,
        algorithmExplanation,
        stepByStepExplanation,
        transactionSummary
    };
}
/**
 * Generate a settlement visualization for UI display
 * @param debtGraph - Original debt graph
 * @param settlements - Calculated settlement transactions
 * @returns Visualization data for UI display
 */
function generateSettlementVisualization(debtGraph, settlements) {
    // Calculate total amounts and user counts
    const users = new Set();
    let totalAmount = 0;
    for (const settlement of settlements) {
        users.add(settlement.from);
        users.add(settlement.to);
        totalAmount += settlement.amount;
    }
    // Calculate statistics
    const originalTransactionCount = debtGraph.debts?.length || 0;
    const summary = {
        totalAmount,
        transactionCount: settlements.length,
        userCount: users.size,
        reductionRate: originalTransactionCount > 0
            ? (1 - settlements.length / originalTransactionCount)
            : 0
    };
    return {
        networkGraph: generateNetworkGraph(settlements),
        sankeyDiagram: generateSankeyDiagram(settlements),
        summary
    };
}
export { generateNetworkGraph, generateSankeyDiagram, generateDebtHeatmap, generateSettlementBreakdown, generateSettlementExplanation, generateSettlementVisualization };
//# sourceMappingURL=visualization.service.js.map