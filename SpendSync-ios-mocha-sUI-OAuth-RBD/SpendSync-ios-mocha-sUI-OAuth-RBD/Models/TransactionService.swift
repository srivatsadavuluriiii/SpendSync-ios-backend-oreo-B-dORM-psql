import Foundation
import Combine

class TransactionService {
    static let shared = TransactionService()
    
    private var cancellables = Set<AnyCancellable>()
    
    // Cache for offline access
    private var cachedTransactions: [Transaction] = []
    
    private init() {
        // Initialize with mock data for development
        if Config.environment == .development && !TokenManager.isAuthenticated() {
            generateMockData()
        }
    }
    
    // MARK: - Network Operations
    
    func fetchTransactions(completion: @escaping ([Transaction]?, Error?) -> Void) {
        // If not authenticated, return cached data
        if !TokenManager.isAuthenticated() {
            completion(cachedTransactions, nil)
            return
        }
        
        APIClient.getTransactions()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completionStatus in
                    if case .failure(let error) = completionStatus {
                        completion(nil, error)
                    }
                },
                receiveValue: { [weak self] transactions in
                    guard let self = self else { return }
                    self.cachedTransactions = transactions
                    completion(transactions, nil)
                }
            )
            .store(in: &cancellables)
    }
    
    func addTransaction(_ transaction: Transaction, completion: @escaping (Transaction?, Error?) -> Void) {
        // If not authenticated, just add to local cache
        if !TokenManager.isAuthenticated() {
            var newTransaction = transaction
            newTransaction.id = UUID().uuidString
            cachedTransactions.insert(newTransaction, at: 0)
            completion(newTransaction, nil)
            return
        }
        
        APIClient.addTransaction(transaction: transaction)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completionStatus in
                    if case .failure(let error) = completionStatus {
                        completion(nil, error)
                    }
                },
                receiveValue: { [weak self] transaction in
                    guard let self = self else { return }
                    self.cachedTransactions.insert(transaction, at: 0)
                    completion(transaction, nil)
                }
            )
            .store(in: &cancellables)
    }
    
    func removeTransaction(id: String, completion: @escaping (Bool, Error?) -> Void) {
        // If not authenticated, just remove from local cache
        if !TokenManager.isAuthenticated() {
            if let index = cachedTransactions.firstIndex(where: { $0.id == id }) {
                cachedTransactions.remove(at: index)
                completion(true, nil)
            } else {
                completion(false, NSError(domain: "TransactionService", code: 404, userInfo: [NSLocalizedDescriptionKey: "Transaction not found"]))
            }
            return
        }
        
        APIClient.deleteTransaction(id: id)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completionStatus in
                    if case .failure(let error) = completionStatus {
                        completion(false, error)
                    }
                },
                receiveValue: { [weak self] _ in
                    guard let self = self else { return }
                    
                    // Remove from local cache after successful API delete
                    if let index = self.cachedTransactions.firstIndex(where: { $0.id == id }) {
                        self.cachedTransactions.remove(at: index)
                    }
                    
                    completion(true, nil)
                }
            )
            .store(in: &cancellables)
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