import Foundation

class MockDataService {
    static let shared = MockDataService()
    
    var transactions: [Transaction] = []
    
    private init() {
        generateMockData()
    }
    
    func generateMockData() {
        let calendar = Calendar.current
        let today = Date()
        
        // Generate transactions for the last 30 days
        transactions = [
            Transaction(
                amount: 45.99,
                title: "Grocery Shopping",
                description: "Weekly groceries at Trader Joe's",
                category: .food,
                date: calendar.date(byAdding: .day, value: -1, to: today)!,
                isExpense: true
            ),
            Transaction(
                amount: 12.50,
                title: "Coffee Shop",
                description: "Coffee and pastry",
                category: .food,
                date: calendar.date(byAdding: .day, value: -2, to: today)!,
                isExpense: true
            ),
            Transaction(
                amount: 89.99,
                title: "Electricity Bill",
                description: "Monthly utility bill",
                category: .utilities,
                date: calendar.date(byAdding: .day, value: -5, to: today)!,
                isExpense: true
            ),
            Transaction(
                amount: 2500.00,
                title: "Salary Deposit",
                description: "Monthly salary",
                category: .other,
                date: calendar.date(byAdding: .day, value: -7, to: today)!,
                isExpense: false
            ),
            Transaction(
                amount: 25.00,
                title: "Movie Tickets",
                description: "Weekend movie with friends",
                category: .entertainment,
                date: calendar.date(byAdding: .day, value: -9, to: today)!,
                isExpense: true
            ),
            Transaction(
                amount: 38.75,
                title: "Gas",
                description: "Filled up the car",
                category: .transportation,
                date: calendar.date(byAdding: .day, value: -12, to: today)!,
                isExpense: true
            ),
            Transaction(
                amount: 1200.00,
                title: "Rent",
                description: "Monthly apartment rent",
                category: .housing,
                date: calendar.date(byAdding: .day, value: -15, to: today)!,
                isExpense: true
            ),
            Transaction(
                amount: 120.00,
                title: "Freelance Work",
                description: "Logo design project",
                category: .other,
                date: calendar.date(byAdding: .day, value: -18, to: today)!,
                isExpense: false
            ),
            Transaction(
                amount: 65.32,
                title: "Dinner",
                description: "Restaurant with family",
                category: .food,
                date: calendar.date(byAdding: .day, value: -20, to: today)!,
                isExpense: true
            ),
            Transaction(
                amount: 42.99,
                title: "Internet Bill",
                description: "Monthly internet service",
                category: .utilities,
                date: calendar.date(byAdding: .day, value: -25, to: today)!,
                isExpense: true
            )
        ]
    }
    
    func addTransaction(_ transaction: Transaction) {
        // Insert new transactions at the beginning of the array
        transactions.insert(transaction, at: 0)
    }
    
    func removeTransaction(at index: Int) {
        transactions.remove(at: index)
    }
    
    func getTransactions() -> [Transaction] {
        return transactions
    }
    
    func getExpenseTransactions() -> [Transaction] {
        return transactions.filter { $0.isExpense }
    }
    
    func getIncomeTransactions() -> [Transaction] {
        return transactions.filter { !$0.isExpense }
    }
} 