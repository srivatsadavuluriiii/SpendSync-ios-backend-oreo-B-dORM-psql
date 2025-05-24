import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = TransactionViewModel()
    @EnvironmentObject private var authViewModel: AuthViewModel
    @State private var showAddTransaction = false
    @State private var showProfileMenu = false
    
    private var balance: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        
        let balance = viewModel.getBalance()
        return formatter.string(from: NSNumber(value: balance)) ?? "$\(String(format: "%.2f", balance))"
    }
    
    private var totalIncome: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        
        let income = viewModel.getTotalIncome()
        return formatter.string(from: NSNumber(value: income)) ?? "$\(String(format: "%.2f", income))"
    }
    
    private var totalExpenses: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        
        let expenses = viewModel.getTotalExpenses()
        return formatter.string(from: NSNumber(value: expenses)) ?? "$\(String(format: "%.2f", expenses))"
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Balance Card
                    Card(type: .elevated) {
                        VStack(spacing: 8) {
                            Text("Current Balance")
                                .font(.headline)
                                .foregroundColor(.secondary)
                            
                            Text(balance)
                                .font(.system(size: 36, weight: .bold))
                                .foregroundColor(.primary)
                            
                            HStack(spacing: 24) {
                                // Income
                                VStack(spacing: 4) {
                                    Text("Income")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                    
                                    Text(totalIncome)
                                        .font(.headline)
                                        .foregroundColor(.green)
                                }
                                
                                // Separator
                                Rectangle()
                                    .fill(Color.secondary.opacity(0.3))
                                    .frame(width: 1, height: 30)
                                
                                // Expenses
                                VStack(spacing: 4) {
                                    Text("Expenses")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                    
                                    Text(totalExpenses)
                                        .font(.headline)
                                        .foregroundColor(.red)
                                }
                            }
                            .padding(.top, 8)
                        }
                        .padding()
                        .frame(maxWidth: .infinity)
                    }
                    
                    // Filter Buttons
                    HStack {
                        ForEach([TransactionViewModel.TransactionFilter.all, .income, .expense], id: \.self) { filter in
                            Button(action: {
                                viewModel.currentFilter = filter
                            }) {
                                Text(filterTitle(for: filter))
                                    .padding(.vertical, 8)
                                    .padding(.horizontal, 16)
                                    .background(
                                        Capsule()
                                            .fill(viewModel.currentFilter == filter ? Color.blue : Color.gray.opacity(0.2))
                                    )
                                    .foregroundColor(viewModel.currentFilter == filter ? .white : .primary)
                            }
                        }
                    }
                    
                    // Recent Transactions
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Recent Transactions")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        if viewModel.filteredTransactions.isEmpty {
                            Card {
                                VStack(spacing: 12) {
                                    Image(systemName: "doc.text")
                                        .font(.system(size: 48))
                                        .foregroundColor(.gray)
                                    
                                    Text("No transactions found")
                                        .font(.headline)
                                        .foregroundColor(.secondary)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 32)
                            }
                        } else {
                            LazyVStack(spacing: 16) {
                                ForEach(viewModel.filteredTransactions) { transaction in
                                    TransactionCard(transaction: transaction)
                                }
                                .onDelete { indexSet in
                                    viewModel.removeTransaction(at: indexSet)
                                }
                            }
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("SpendSync")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        showProfileMenu = true
                    }) {
                        HStack(spacing: 8) {
                            AsyncImage(url: URL(string: authViewModel.userProfile?.avatarUrl ?? "")) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Image(systemName: "person.circle.fill")
                                    .foregroundColor(.blue)
                            }
                            .frame(width: 32, height: 32)
                            .clipShape(Circle())
                            
                            if let profile = authViewModel.userProfile {
                                Text("Hi, \(profile.firstName ?? "User")!")
                                    .font(.subheadline)
                                    .foregroundColor(.primary)
                            }
                        }
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showAddTransaction = true
                    }) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                    }
                }
            }
            .sheet(isPresented: $showAddTransaction) {
                AddTransactionView { transaction in
                    viewModel.addTransaction(transaction)
                    showAddTransaction = false
                }
            }
            .actionSheet(isPresented: $showProfileMenu) {
                ActionSheet(
                    title: Text("Profile"),
                    message: Text(authViewModel.currentUser?.email ?? ""),
                    buttons: [
                        .default(Text("View Profile")) {
                            // TODO: Navigate to profile view
                            print("Navigate to profile")
                        },
                        .default(Text("Settings")) {
                            // TODO: Navigate to settings
                            print("Navigate to settings")
                        },
                        .destructive(Text("Sign Out")) {
                            authViewModel.signOut()
                        },
                        .cancel()
                    ]
                )
            }
        }
    }
    
    private func filterTitle(for filter: TransactionViewModel.TransactionFilter) -> String {
        switch filter {
        case .all:
            return "All"
        case .income:
            return "Income"
        case .expense:
            return "Expenses"
        }
    }
}

#Preview {
    HomeView()
} 