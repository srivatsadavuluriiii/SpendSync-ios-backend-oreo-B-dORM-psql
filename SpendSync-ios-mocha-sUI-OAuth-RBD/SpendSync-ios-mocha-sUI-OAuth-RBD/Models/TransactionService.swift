import Foundation
import Combine

class TransactionService {
    static let shared = TransactionService()
    
    private var cancellables = Set<AnyCancellable>()
    
    // Cache for offline access
    private var cachedTransactions: [Transaction] = []
    
    private init() {
        // Initialize with mock data for development
        generateMockData()
    }
    
    // MARK: - Network Operations
    
    func fetchTransactions(completion: @escaping ([Transaction]?, Error?) -> Void) {
        // For now, always return cached data since we don't have transaction endpoints yet
        // In a real implementation, this would call APIClient.shared.fetchTransactions()
        completion(cachedTransactions, nil)
    }
    
    func addTransaction(_ transaction: Transaction, completion: @escaping (Transaction?, Error?) -> Void) {
        // For now, just add to local cache
        // In a real implementation, this would call APIClient.shared.addTransaction()
        var newTransaction = transaction
        newTransaction.id = UUID().uuidString
        cachedTransactions.insert(newTransaction, at: 0)
        completion(newTransaction, nil)
    }
    
    func removeTransaction(id: String, completion: @escaping (Bool, Error?) -> Void) {
        // For now, just remove from local cache
        // In a real implementation, this would call APIClient.shared.deleteTransaction()
        if let index = cachedTransactions.firstIndex(where: { $0.id == id }) {
            cachedTransactions.remove(at: index)
            completion(true, nil)
        } else {
            completion(false, NSError(domain: "TransactionService", code: 404, userInfo: [NSLocalizedDescriptionKey: "Transaction not found"]))
        }
    }
    
    // MARK: - Local Cache Operations
    
    func getTransactions() -> [Transaction] {
        return cachedTransactions
    }
    
    func getExpenseTransactions() -> [Transaction] {
        return cachedTransactions.filter { $0.isExpense }
    }
    
    func getIncomeTransactions() -> [Transaction] {
        return cachedTransactions.filter { !$0.isExpense }
    }
    
    // MARK: - Mock Data for Development
    
    private func generateMockData() {
        let calendar = Calendar.current
        let today = Date()
        
        // Generate transactions for the last 30 days
        cachedTransactions = [
            Transaction(
                id: "1",
                amount: 45.99,
                title: "Grocery Shopping",
                description: "Weekly groceries at Trader Joe's",
                category: .food,
                date: calendar.date(byAdding: .day, value: -1, to: today)!,
                isExpense: true
            ),
            Transaction(
                id: "2",
                amount: 12.50,
                title: "Coffee Shop",
                description: "Coffee and pastry",
                category: .food,
                date: calendar.date(byAdding: .day, value: -2, to: today)!,
                isExpense: true
            ),
            Transaction(
                id: "3",
                amount: 89.99,
                title: "Electricity Bill",
                description: "Monthly utility bill",
                category: .utilities,
                date: calendar.date(byAdding: .day, value: -5, to: today)!,
                isExpense: true
            ),
            Transaction(
                id: "4",
                amount: 2500.00,
                title: "Salary Deposit",
                description: "Monthly salary",
                category: .other,
                date: calendar.date(byAdding: .day, value: -7, to: today)!,
                isExpense: false
            ),
            Transaction(
                id: "5",
                amount: 25.00,
                title: "Movie Tickets",
                description: "Weekend movie with friends",
                category: .entertainment,
                date: calendar.date(byAdding: .day, value: -9, to: today)!,
                isExpense: true
            ),
            Transaction(
                id: "6",
                amount: 38.75,
                title: "Gas",
                description: "Filled up the car",
                category: .transportation,
                date: calendar.date(byAdding: .day, value: -12, to: today)!,
                isExpense: true
            ),
            Transaction(
                id: "7",
                amount: 1200.00,
                title: "Rent",
                description: "Monthly apartment rent",
                category: .housing,
                date: calendar.date(byAdding: .day, value: -15, to: today)!,
                isExpense: true
            ),
            Transaction(
                id: "8",
                amount: 120.00,
                title: "Freelance Work",
                description: "Logo design project",
                category: .other,
                date: calendar.date(byAdding: .day, value: -18, to: today)!,
                isExpense: false
            ),
            Transaction(
                id: "9",
                amount: 65.32,
                title: "Dinner",
                description: "Restaurant with family",
                category: .food,
                date: calendar.date(byAdding: .day, value: -20, to: today)!,
                isExpense: true
            ),
            Transaction(
                id: "10",
                amount: 42.99,
                title: "Internet Bill",
                description: "Monthly internet service",
                category: .utilities,
                date: calendar.date(byAdding: .day, value: -25, to: today)!,
                isExpense: true
            )
        ]
    }
} 