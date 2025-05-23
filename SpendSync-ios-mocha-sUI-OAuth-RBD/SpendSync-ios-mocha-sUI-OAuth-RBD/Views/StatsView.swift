import SwiftUI

struct StatsView: View {
    @StateObject private var viewModel = TransactionViewModel()
    @State private var timeFrame: TimeFrame = .month
    
    enum TimeFrame: String, CaseIterable, Identifiable {
        case week = "Week"
        case month = "Month"
        case year = "Year"
        
        var id: String { self.rawValue }
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Time Frame Selector
                    Picker("Time Frame", selection: $timeFrame) {
                        ForEach(TimeFrame.allCases) { timeFrame in
                            Text(timeFrame.rawValue).tag(timeFrame)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.horizontal)
                    
                    // Summary Card
                    Card(type: .elevated) {
                        VStack(spacing: 16) {
                            Text("Financial Summary")
                                .font(.headline)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            HStack {
                                StatItem(
                                    title: "Income",
                                    value: formatCurrency(viewModel.getTotalIncome()),
                                    color: .green
                                )
                                
                                Divider()
                                
                                StatItem(
                                    title: "Expenses",
                                    value: formatCurrency(viewModel.getTotalExpenses()),
                                    color: .red
                                )
                                
                                Divider()
                                
                                StatItem(
                                    title: "Balance",
                                    value: formatCurrency(viewModel.getBalance()),
                                    color: viewModel.getBalance() >= 0 ? .blue : .red
                                )
                            }
                        }
                        .padding()
                    }
                    .padding(.horizontal)
                    
                    // Category Breakdown
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Spending by Category")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        CategoryBreakdownView(categoriesData: getCategoryData())
                            .frame(height: 300)
                            .padding(.horizontal)
                    }
                    
                    // Top Spending Categories
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Top Spending Categories")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        ForEach(getTopCategories(), id: \.0) { category, amount in
                            let totalExpenses = viewModel.getTotalExpenses()
                            let percentage = totalExpenses > 0 ? Int((amount / totalExpenses) * 100) : 0
                            
                            TopCategoryRow(
                                category: category,
                                amount: amount,
                                percentage: percentage
                            )
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("Statistics")
            .onAppear {
                viewModel.loadTransactions()
            }
        }
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: value)) ?? "$\(String(format: "%.2f", value))"
    }
    
    private func getCategoryData() -> [CategoryData] {
        let categoryAmounts = viewModel.getTransactionsByCategory()
        
        return categoryAmounts.compactMap { category, amount in
            guard amount > 0 else { return nil }
            
            return CategoryData(
                category: category,
                amount: amount
            )
        }
        .sorted { $0.amount > $1.amount }
    }
    
    private func getTopCategories() -> [(TransactionCategory, Double)] {
        let categoryData = getCategoryData()
        
        // Return top 5 categories or less if there are fewer categories
        return categoryData.prefix(5).map { ($0.category, $0.amount) }
    }
}

struct CategoryData: Identifiable {
    var id = UUID()
    var category: TransactionCategory
    var amount: Double
}

struct CategoryBreakdownView: View {
    let categoriesData: [CategoryData]
    
    var body: some View {
        if categoriesData.isEmpty {
            Card {
                VStack {
                    Image(systemName: "chart.pie")
                        .font(.system(size: 48))
                        .foregroundColor(.gray)
                    
                    Text("No data available")
                        .font(.headline)
                        .foregroundColor(.secondary)
                        .padding(.top, 8)
                }
                .frame(maxWidth: .infinity, minHeight: 200)
                .padding()
            }
        } else {
            Card {
                VStack {
                    // Simple pie chart representation
                    ZStack {
                        ForEach(0..<categoriesData.count, id: \.self) { index in
                            PieSlice(
                                startAngle: startAngle(for: index),
                                endAngle: endAngle(for: index),
                                color: Color(categoriesData[index].category.color)
                            )
                        }
                    }
                    .frame(width: 200, height: 200)
                    .padding()
                    
                    // Legend
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(categoriesData) { categoryData in
                            HStack {
                                Circle()
                                    .fill(Color(categoryData.category.color))
                                    .frame(width: 12, height: 12)
                                
                                Text(categoryData.category.rawValue)
                                    .font(.subheadline)
                                
                                Spacer()
                                
                                Text(formatCurrency(categoryData.amount))
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                            }
                        }
                    }
                }
                .padding()
            }
        }
    }
    
    private func startAngle(for index: Int) -> Double {
        let totalAmount = categoriesData.reduce(0) { $0 + $1.amount }
        guard totalAmount > 0, index > 0 else { return 0 }
        
        let prior = categoriesData[0..<index].reduce(0) { $0 + $1.amount }
        return (prior / totalAmount) * 360
    }
    
    private func endAngle(for index: Int) -> Double {
        let totalAmount = categoriesData.reduce(0) { $0 + $1.amount }
        guard totalAmount > 0 else { return index == 0 ? 360 : 0 }
        
        let current = categoriesData[0...index].reduce(0) { $0 + $1.amount }
        return (current / totalAmount) * 360
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: value)) ?? "$\(String(format: "%.2f", value))"
    }
}

struct PieSlice: View {
    var startAngle: Double
    var endAngle: Double
    var color: Color
    
    var body: some View {
        GeometryReader { geometry in
            Path { path in
                let center = CGPoint(x: geometry.size.width / 2, y: geometry.size.height / 2)
                let radius = min(geometry.size.width, geometry.size.height) / 2
                
                path.move(to: center)
                path.addArc(
                    center: center,
                    radius: radius,
                    startAngle: .degrees(startAngle - 90),
                    endAngle: .degrees(endAngle - 90),
                    clockwise: false
                )
                path.closeSubpath()
            }
            .fill(color)
        }
    }
}

struct StatItem: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Text(value)
                .font(.headline)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
    }
}

struct TopCategoryRow: View {
    let category: TransactionCategory
    let amount: Double
    let percentage: Int
    
    var body: some View {
        Card {
            HStack {
                // Icon
                ZStack {
                    Circle()
                        .fill(Color(category.color).opacity(0.2))
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: category.icon)
                        .foregroundColor(Color(category.color))
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(category.rawValue)
                        .font(.headline)
                    
                    // Progress bar
                    GeometryReader { geometry in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .frame(width: geometry.size.width, height: 6)
                                .opacity(0.2)
                                .foregroundColor(Color(category.color))
                            
                            Rectangle()
                                .frame(width: min(CGFloat(percentage) / 100.0 * geometry.size.width, geometry.size.width), height: 6)
                                .foregroundColor(Color(category.color))
                        }
                        .cornerRadius(3)
                    }
                    .frame(height: 6)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(formatCurrency(amount))
                        .font(.headline)
                    
                    Text("\(percentage)%")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .padding()
        }
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        return formatter.string(from: NSNumber(value: value)) ?? "$\(String(format: "%.2f", value))"
    }
}

#Preview {
    StatsView()
} 