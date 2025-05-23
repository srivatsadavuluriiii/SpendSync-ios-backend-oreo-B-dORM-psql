import SwiftUI

struct TransactionCard: View {
    let transaction: Transaction
    
    private var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        
        if let formattedString = formatter.string(from: NSNumber(value: transaction.amount)) {
            return transaction.isExpense ? "-\(formattedString)" : formattedString
        }
        
        return transaction.isExpense ? "-$\(String(format: "%.2f", transaction.amount))" : "$\(String(format: "%.2f", transaction.amount))"
    }
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: transaction.date)
    }
    
    var body: some View {
        Card(type: .elevated) {
            HStack(spacing: 16) {
                // Category Icon
                ZStack {
                    Circle()
                        .fill(Color(transaction.category.color).opacity(0.2))
                        .frame(width: 50, height: 50)
                    
                    Image(systemName: transaction.category.icon)
                        .font(.system(size: 22))
                        .foregroundColor(Color(transaction.category.color))
                }
                
                // Transaction Details
                VStack(alignment: .leading, spacing: 4) {
                    Text(transaction.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(transaction.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                    
                    Text(formattedDate)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                
                // Amount
                Text(formattedAmount)
                    .font(.headline)
                    .foregroundColor(transaction.isExpense ? .red : .green)
            }
        }
    }
}

#Preview {
    TransactionCard(transaction: Transaction.example)
        .padding()
} 