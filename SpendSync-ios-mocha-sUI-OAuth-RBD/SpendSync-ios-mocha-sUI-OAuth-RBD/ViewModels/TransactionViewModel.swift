import Foundation
import SwiftUI
import Combine

class TransactionViewModel: ObservableObject {
    @Published var transactions: [Transaction] = []
    @Published var filteredTransactions: [Transaction] = []
    @Published var currentFilter: TransactionFilter = .all
    @Published var isLoading: Bool = false
    @Published var error: String? = nil
    
    private var cancellables = Set<AnyCancellable>()
    private let transactionService = TransactionService.shared
    
    enum TransactionFilter {
        case all
        case expense
        case income
    }
    
    init() {
        loadTransactions()
        setupSubscribers()
    }
    
    private func setupSubscribers() {
        $currentFilter
            .sink { [weak self] filter in
                self?.filterTransactions(by: filter)
            }
            .store(in: &cancellables)
    }
    
    func loadTransactions() {
        isLoading = true
        error = nil
        
        transactionService.fetchTransactions { [weak self] transactions, error in
            guard let self = self else { return }
            self.isLoading = false
            
            if let error = error {
                self.error = error.localizedDescription
                return
            }
            
            if let transactions = transactions {
                self.transactions = transactions
                self.filterTransactions(by: self.currentFilter)
            }
        }
    }
    
    func filterTransactions(by filter: TransactionFilter) {
        switch filter {
        case .all:
            filteredTransactions = transactions
        case .expense:
            filteredTransactions = transactions.filter { $0.isExpense }
        case .income:
            filteredTransactions = transactions.filter { !$0.isExpense }
        }
    }
    
    func addTransaction(_ transaction: Transaction) {
        isLoading = true
        error = nil
        
        transactionService.addTransaction(transaction) { [weak self] newTransaction, error in
            guard let self = self else { return }
            self.isLoading = false
            
            if let error = error {
                self.error = error.localizedDescription
                return
            }
            
            self.loadTransactions()
        }
    }
    
    func removeTransaction(at indexSet: IndexSet) {
        guard let index = indexSet.first else { return }
        
        // Find the corresponding transaction
        let transactionToDelete = filteredTransactions[index]
        
        isLoading = true
        error = nil
        
        transactionService.removeTransaction(id: transactionToDelete.id) { [weak self] success, error in
            guard let self = self else { return }
            self.isLoading = false
            
            if let error = error {
                self.error = error.localizedDescription
                return
            }
            
            if success {
                self.loadTransactions()
            }
        }
    }
    
    func getTransactionsByCategory() -> [TransactionCategory: Double] {
        var result: [TransactionCategory: Double] = [:]
        
        // Initialize all categories with 0
        for category in TransactionCategory.allCases {
            result[category] = 0
        }
        
        // Sum up expenses by category
        for transaction in transactions where transaction.isExpense {
            result[transaction.category, default: 0] += transaction.amount
        }
        
        return result
    }
    
    func getTotalIncome() -> Double {
        return transactions.filter { !$0.isExpense }.reduce(0) { $0 + $1.amount }
    }
    
    func getTotalExpenses() -> Double {
        return transactions.filter { $0.isExpense }.reduce(0) { $0 + $1.amount }
    }
    
    func getBalance() -> Double {
        return getTotalIncome() - getTotalExpenses()
    }
} 