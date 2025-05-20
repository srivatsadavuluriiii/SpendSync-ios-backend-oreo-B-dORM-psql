# SpendSync Debt Optimization Algorithm

## Overview

The debt optimization algorithm is a critical component of SpendSync that minimizes the number of transactions required to settle debts within a group. Unlike Splitwise, our implementation prioritizes transparency by allowing users to see the detailed workings of the algorithm.

## Problem Definition

In a group of users, each user may owe money to or be owed money by multiple other users. The naive approach would require each user to settle individually with every other user they have a debt relationship with, potentially resulting in many small transactions.

Our goal is to minimize the total number of transactions needed to settle all debts while ensuring:
1. All debts are properly settled
2. The solution is intuitive and explainable to users
3. Currency conversions are handled correctly
4. The algorithm scales efficiently with group size

## Core Algorithm

### Step 1: Build the Debt Graph

We represent the debt relationships as a directed graph:
- Each user is a node
- Each debt is a weighted edge from debtor to creditor
- Edge weight represents the debt amount

```javascript
// Example debt graph representation
const debtGraph = {
  users: ['Alice', 'Bob', 'Charlie', 'Dave'],
  debts: [
    { from: 'Alice', to: 'Bob', amount: 50 },
    { from: 'Bob', to: 'Charlie', amount: 30 },
    { from: 'Charlie', to: 'Alice', amount: 20 },
    { from: 'Dave', to: 'Alice', amount: 40 }
  ]
};
```

### Step 2: Simplify Circular Debts

We identify and simplify circular debts (e.g., A owes B, B owes C, C owes A) to reduce the total number of transactions:

```javascript
function simplifyCircularDebts(graph) {
  // Identify cycles using Depth-First Search
  const cycles = findCycles(graph);
  
  // For each cycle, find the minimum debt amount
  for (const cycle of cycles) {
    const minDebt = findMinimumDebtInCycle(cycle, graph);
    
    // Reduce each debt in the cycle by the minimum amount
    for (let i = 0; i < cycle.length; i++) {
      const fromUser = cycle[i];
      const toUser = cycle[(i + 1) % cycle.length];
      reduceDebt(graph, fromUser, toUser, minDebt);
    }
  }
  
  // Remove zero-value debts
  removeZeroDebts(graph);
  
  return graph;
}
```

### Step 3: Calculate Net Balances

For each user, calculate their net balance (total owed minus total owing):

```javascript
function calculateNetBalances(graph) {
  const balances = {};
  
  // Initialize balances
  for (const user of graph.users) {
    balances[user] = 0;
  }
  
  // Calculate net balance for each user
  for (const debt of graph.debts) {
    balances[debt.from] -= debt.amount;
    balances[debt.to] += debt.amount;
  }
  
  return balances;
}
```

### Step 4: Greedy Settlement Algorithm

Use a greedy approach to create settlement transactions by matching the largest debtors with the largest creditors:

```javascript
function generateSettlements(balances) {
  const settlements = [];
  const debtors = [];
  const creditors = [];
  
  // Separate users into debtors and creditors
  for (const [user, balance] of Object.entries(balances)) {
    if (balance < 0) {
      debtors.push({ user, amount: Math.abs(balance) });
    } else if (balance > 0) {
      creditors.push({ user, amount: balance });
    }
  }
  
  // Sort by amount (largest first)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  // Match debtors with creditors
  let debtorIndex = 0;
  let creditorIndex = 0;
  
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    if (amount > 0) {
      settlements.push({
        from: debtor.user,
        to: creditor.user,
        amount
      });
    }
    
    // Update remaining amounts
    debtor.amount -= amount;
    creditor.amount -= amount;
    
    // Move to next debtor/creditor if their balance is settled
    if (debtor.amount === 0) debtorIndex++;
    if (creditor.amount === 0) creditorIndex++;
  }
  
  return settlements;
}
```

### Step 5: Currency Handling

For multi-currency groups, we implement additional logic:

```javascript
function handleMultipleCurrencies(graph, exchangeRates) {
  // Convert all debts to the group's default currency
  for (const debt of graph.debts) {
    if (debt.currency !== graph.defaultCurrency) {
      debt.amount = convertCurrency(
        debt.amount, 
        debt.currency, 
        graph.defaultCurrency,
        exchangeRates
      );
      debt.currency = graph.defaultCurrency;
    }
  }
  
  // Process normally in the default currency
  const simplifiedGraph = simplifyCircularDebts(graph);
  const balances = calculateNetBalances(simplifiedGraph);
  let settlements = generateSettlements(balances);
  
  // Convert settlements back to optimal currencies
  settlements = optimizeSettlementCurrencies(settlements, exchangeRates);
  
  return settlements;
}
```

## Advanced Optimizations

### Minimum Cash Flow Algorithm

For larger groups, we implement a more sophisticated algorithm based on network flow:

```javascript
function minimumCashFlowAlgorithm(graph) {
  // Calculate net balances
  const balances = calculateNetBalances(graph);
  
  // Convert to arrays for processing
  const amounts = Object.values(balances);
  const users = Object.keys(balances);
  
  // Call recursive helper function
  return minCashFlowRecursive(amounts, users, []);
}

function minCashFlowRecursive(amounts, users, settlements) {
  // Find maximum creditor and debtor
  let maxCreditorIndex = 0;
  let maxDebtorIndex = 0;
  
  for (let i = 1; i < amounts.length; i++) {
    if (amounts[i] > amounts[maxCreditorIndex]) {
      maxCreditorIndex = i;
    }
    if (amounts[i] < amounts[maxDebtorIndex]) {
      maxDebtorIndex = i;
    }
  }
  
  // Base case: all balances are settled
  if (Math.abs(amounts[maxCreditorIndex]) < 0.001 && 
      Math.abs(amounts[maxDebtorIndex]) < 0.001) {
    return settlements;
  }
  
  // Calculate transfer amount
  const transferAmount = Math.min(
    Math.abs(amounts[maxDebtorIndex]),
    amounts[maxCreditorIndex]
  );
  
  // Update balances
  amounts[maxDebtorIndex] += transferAmount;
  amounts[maxCreditorIndex] -= transferAmount;
  
  // Record the settlement
  settlements.push({
    from: users[maxDebtorIndex],
    to: users[maxCreditorIndex],
    amount: transferAmount
  });
  
  // Recurse with updated balances
  return minCashFlowRecursive(amounts, users, settlements);
}
```

### Friend-Preference Optimization

To maintain social dynamics, we can optionally prioritize settlements between friends:

```javascript
function friendPreferenceOptimization(balances, friendships) {
  // Sort potential settlements based on friendship strength
  const potentialSettlements = [];
  
  for (const [debtor, debtorBalance] of Object.entries(balances)) {
    if (debtorBalance < 0) {
      for (const [creditor, creditorBalance] of Object.entries(balances)) {
        if (creditorBalance > 0) {
          const friendshipStrength = getFriendshipStrength(debtor, creditor, friendships);
          potentialSettlements.push({
            from: debtor,
            to: creditor,
            amount: Math.min(Math.abs(debtorBalance), creditorBalance),
            friendshipStrength
          });
        }
      }
    }
  }
  
  // Sort by friendship strength (highest first)
  potentialSettlements.sort((a, b) => b.friendshipStrength - a.friendshipStrength);
  
  // Generate settlements with friendship priority
  return generateSettlementsWithPriority(balances, potentialSettlements);
}
```

## Algorithm Visualization

The transparent nature of our algorithm is a key differentiator. We provide users with:

1. **Simplified Debt Graph**: Visual representation of who owes whom
2. **Settlement Steps**: Step-by-step explanation of how the algorithm works
3. **Alternative Options**: Different settlement paths with pros/cons
4. **"Show Your Work" Mode**: Detailed mathematical breakdown

## Performance Considerations

- **Time Complexity**: O(n²) for the greedy algorithm, where n is the number of users
- **Space Complexity**: O(n²) to store the debt graph
- **Scaling Strategy**:
  - For groups under 10 users: Run complete optimization
  - For groups of 10-50 users: Use greedy approach
  - For groups over 50 users: Apply additional heuristics and parallelization

## Comparison with Splitwise

| Feature | SpendSync | Splitwise |
|---------|-----------|-----------|
| Transparency | Full algorithm transparency | Black-box approach |
| Optimization Method | Customizable (Greedy/Min-Flow) | Fixed algorithm |
| Visualization | Interactive debt graph | Basic text summary |
| Friend Preferences | Considered in optimization | Not considered |
| Performance at Scale | Optimized for larger groups | Limitations in free tier |

## Implementation Plan for MVP

For the MVP, we will implement:
1. Basic debt graph construction
2. Greedy settlement algorithm
3. Simple visualization of settlements
4. Currency conversion support

Post-MVP enhancements will include:
1. Circular debt simplification
2. Minimum cash flow optimization
3. Friend-preference customization
4. Advanced visualization options 