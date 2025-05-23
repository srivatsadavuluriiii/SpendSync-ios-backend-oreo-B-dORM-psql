import SwiftUI

struct AddTransactionView: View {
    @Environment(\.dismiss) private var dismiss: DismissAction
    @State private var title: String = ""
    @State private var description: String = ""
    @State private var amount: String = ""
    @State private var isExpense: Bool = true
    @State private var category: TransactionCategory = .food
    @State private var date: Date = Date()
    
    @State private var titleError: String? = nil
    @State private var amountError: String? = nil
    
    var onAdd: (Transaction) -> Void
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Transaction Type")) {
                    Picker("Type", selection: $isExpense) {
                        Text("Expense").tag(true)
                        Text("Income").tag(false)
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                Section(header: Text("Details")) {
                    VStack(alignment: .leading) {
                        InputField(
                            label: "Title",
                            placeholder: "Enter title",
                            text: $title,
                            errorMessage: titleError
                        )
                    }
                    
                    VStack(alignment: .leading) {
                        InputField(
                            label: "Description",
                            placeholder: "Enter description",
                            text: $description
                        )
                    }
                    
                    VStack(alignment: .leading) {
                        InputField(
                            label: "Amount",
                            placeholder: "Enter amount",
                            text: $amount,
                            keyboardType: .decimalPad,
                            errorMessage: amountError
                        )
                    }
                }
                
                Section(header: Text("Category")) {
                    Picker("Category", selection: $category) {
                        ForEach(TransactionCategory.allCases) { category in
                            HStack {
                                Image(systemName: category.icon)
                                    .foregroundColor(Color(category.color))
                                Text(category.rawValue)
                            }
                            .tag(category)
                        }
                    }
                }
                
                Section(header: Text("Date")) {
                    DatePicker("Transaction Date", selection: $date, displayedComponents: .date)
                }
                
                Section {
                    StyledButton(
                        title: "Add Transaction",
                        type: .primary,
                        isFullWidth: true,
                        action: addTransaction
                    )
                    .listRowInsets(EdgeInsets())
                    .padding()
                }
            }
            .navigationTitle("Add Transaction")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func validateForm() -> Bool {
        var isValid = true
        
        // Validate title
        if title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            titleError = "Title is required"
            isValid = false
        } else {
            titleError = nil
        }
        
        // Validate amount
        if amount.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            amountError = "Amount is required"
            isValid = false
        } else if Double(amount) == nil {
            amountError = "Amount must be a valid number"
            isValid = false
        } else {
            amountError = nil
        }
        
        return isValid
    }
    
    private func addTransaction() {
        guard validateForm() else {
            return
        }
        
        let amountValue = Double(amount) ?? 0
        
        let transaction = Transaction(
            amount: amountValue,
            title: title,
            description: description,
            category: category,
            date: date,
            isExpense: isExpense
        )
        
        onAdd(transaction)
    }
}

#Preview {
    AddTransactionView { _ in }
} 