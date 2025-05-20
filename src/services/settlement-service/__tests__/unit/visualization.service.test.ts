/**
 * Unit tests for Visualization Service
 */

import * as visualizationService from '../../src/services/visualization.service';

describe('Visualization Service', () => {
  describe('generateNetworkGraph', () => {
    test('should generate a network graph with correct nodes and links', () => {
      // Arrange
      const settlements = [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user3', to: 'user2', amount: 50 },
        { from: 'user1', to: 'user4', amount: 75 }
      ];
      
      // Act
      const result = visualizationService.generateNetworkGraph(settlements);
      
      // Assert
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('links');
      
      // Check nodes
      expect(result.nodes).toHaveLength(4);
      expect(result.nodes.map(n => n.id).sort()).toEqual(['user1', 'user2', 'user3', 'user4'].sort());
      
      // Check links
      expect(result.links).toHaveLength(3);
      
      // Verify user1's balance
      const user1Node = result.nodes.find(n => n.id === 'user1');
      expect(user1Node?.balance).toBe(-175); // -100 - 75
      
      // Verify user2's balance
      const user2Node = result.nodes.find(n => n.id === 'user2');
      expect(user2Node?.balance).toBe(150); // 100 + 50
    });
    
    test('should handle empty settlement array', () => {
      // Act
      const result = visualizationService.generateNetworkGraph([]);
      
      // Assert
      expect(result.nodes).toEqual([]);
      expect(result.links).toEqual([]);
    });
    
    test('should combine multiple settlements between the same users', () => {
      // Arrange
      const settlements = [
        { from: 'user1', to: 'user2', amount: 50 },
        { from: 'user1', to: 'user2', amount: 30 }
      ];
      
      // Act
      const result = visualizationService.generateNetworkGraph(settlements);
      
      // Assert
      expect(result.links).toHaveLength(1);
      expect(result.links[0].value).toBe(80);
    });
  });
  
  describe('generateSankeyDiagram', () => {
    test('should generate a Sankey diagram with correct nodes and links', () => {
      // Arrange
      const settlements = [
        { from: 'user1', to: 'user2', amount: 100 },
        { from: 'user3', to: 'user4', amount: 50 }
      ];
      
      // Act
      const result = visualizationService.generateSankeyDiagram(settlements);
      
      // Assert
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('links');
      
      // Check nodes
      expect(result.nodes).toHaveLength(4);
      expect(result.nodes.map(n => n.id).sort()).toEqual(['user1', 'user2', 'user3', 'user4'].sort());
      
      // Check links
      expect(result.links).toHaveLength(2);
      
      // Verify link values
      const user1ToUser2Link = result.links.find(l => l.source === 'user1' && l.target === 'user2');
      expect(user1ToUser2Link?.value).toBe(100);
      
      const user3ToUser4Link = result.links.find(l => l.source === 'user3' && l.target === 'user4');
      expect(user3ToUser4Link?.value).toBe(50);
    });
  });
  
  describe('generateSettlementBreakdown', () => {
    test('should generate a detailed breakdown of settlement calculations', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 50, currency: 'USD' },
          { from: 'user1', to: 'user3', amount: 30, currency: 'USD' },
          { from: 'user2', to: 'user3', amount: 20, currency: 'USD' }
        ]
      };
      
      const settlements = [
        { from: 'user1', to: 'user2', amount: 30, currency: 'USD' },
        { from: 'user1', to: 'user3', amount: 50, currency: 'USD' }
      ];
      
      // Act
      const result = visualizationService.generateSettlementBreakdown(debtGraph, settlements);
      
      // Assert
      expect(result).toHaveProperty('inputDebts');
      expect(result).toHaveProperty('userBalances');
      expect(result).toHaveProperty('calculationSteps');
      expect(result).toHaveProperty('finalSettlements');
      expect(result).toHaveProperty('stats');
      
      // Check input debts
      expect(result.inputDebts).toEqual(debtGraph.debts);
      
      // Check user balances
      expect(result.userBalances).toHaveProperty('user1');
      expect(result.userBalances).toHaveProperty('user2');
      expect(result.userBalances).toHaveProperty('user3');
      expect(result.userBalances.user1).toBe(-80); // -50 - 30
      expect(result.userBalances.user2).toBe(30);  // 50 - 20
      expect(result.userBalances.user3).toBe(50);  // 30 + 20
      
      // Check calculation steps
      expect(result.calculationSteps).toHaveLength(4);
      
      // Check stats
      expect(result.stats.originalTransactionCount).toBe(3);
      expect(result.stats.optimizedTransactionCount).toBe(2);
      // Reduction percentage should be 33% (1/3)
      expect(result.stats.reductionPercentage).toBe(33);
    });
  });
  
  describe('generateSettlementExplanation', () => {
    test('should generate a natural language explanation of the settlement process', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 50, currency: 'USD' },
          { from: 'user1', to: 'user3', amount: 30, currency: 'USD' }
        ]
      };
      
      const settlements = [
        { from: 'user1', to: 'user2', amount: 50, currency: 'USD' },
        { from: 'user1', to: 'user3', amount: 30, currency: 'USD' }
      ];
      
      // Act
      const result = visualizationService.generateSettlementExplanation(debtGraph, settlements, 'greedy');
      
      // Assert
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('algorithmExplanation');
      expect(result).toHaveProperty('stepByStepExplanation');
      expect(result).toHaveProperty('transactionSummary');
      
      // Check that algorithm explanation is specific to the greedy algorithm
      expect(result.algorithmExplanation).toContain('Greedy');
      
      // Check that we have the right number of steps
      expect(result.stepByStepExplanation.length).toBeGreaterThan(0);
      
      // Check transaction summary
      expect(result.transactionSummary).toHaveLength(2);
      expect(result.transactionSummary[0]).toContain('user1');
      expect(result.transactionSummary[0]).toContain('50');
      expect(result.transactionSummary[0]).toContain('user2');
    });
    
    test('should provide different explanations for different algorithms', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2'],
        debts: [
          { from: 'user1', to: 'user2', amount: 100, currency: 'USD' }
        ]
      };
      
      const settlements = [
        { from: 'user1', to: 'user2', amount: 100, currency: 'USD' }
      ];
      
      // Act
      const greedyExplanation = visualizationService.generateSettlementExplanation(
        debtGraph, settlements, 'greedy'
      );
      
      const minCashFlowExplanation = visualizationService.generateSettlementExplanation(
        debtGraph, settlements, 'minCashFlow'
      );
      
      // Assert
      expect(greedyExplanation.algorithmExplanation).not.toEqual(minCashFlowExplanation.algorithmExplanation);
      expect(greedyExplanation.algorithmExplanation).toContain('Greedy');
      expect(minCashFlowExplanation.algorithmExplanation).toContain('Minimum Cash Flow');
    });
  });
  
  describe('generateSettlementVisualization', () => {
    test('should generate a complete visualization with network graph and Sankey diagram', () => {
      // Arrange
      const debtGraph = {
        users: ['user1', 'user2', 'user3'],
        debts: [
          { from: 'user1', to: 'user2', amount: 50, currency: 'USD' },
          { from: 'user1', to: 'user3', amount: 75, currency: 'USD' }
        ]
      };
      
      const settlements = [
        { from: 'user1', to: 'user2', amount: 50, currency: 'USD' },
        { from: 'user1', to: 'user3', amount: 75, currency: 'USD' }
      ];
      
      // Act
      const result = visualizationService.generateSettlementVisualization(debtGraph, settlements);
      
      // Assert
      expect(result).toHaveProperty('networkGraph');
      expect(result).toHaveProperty('sankeyDiagram');
      expect(result).toHaveProperty('summary');
      
      // Check summary statistics
      expect(result.summary.totalAmount).toBe(125); // 50 + 75
      expect(result.summary.transactionCount).toBe(2);
      expect(result.summary.userCount).toBe(3);
      expect(result.summary.reductionRate).toBe(0); // No reduction in this case
    });
  });
}); 