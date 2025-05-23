import Foundation

struct Transaction: Identifiable, Hashable, Codable {
    var id: String = UUID().uuidString
    var amount: Double
    var title: String
    var description: String
    var category: TransactionCategory
    var date: Date
    var isExpense: Bool
    var userId: String?
    var currency: String = "USD"
    var paidBy: String?
    var groupId: String?
    var participants: [Participant]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case amount
        case title
        case description
        case category
        case date = "createdAt"
        case isExpense
        case userId
        case currency
        case paidBy
        case groupId
        case participants
    }
    
    init(id: String = UUID().uuidString, amount: Double, title: String, description: String, category: TransactionCategory, date: Date, isExpense: Bool, userId: String? = nil, currency: String = "USD", paidBy: String? = nil, groupId: String? = nil, participants: [Participant]? = nil) {
        self.id = id
        self.amount = amount
        self.title = title
        self.description = description
        self.category = category
        self.date = date
        self.isExpense = isExpense
        self.userId = userId
        self.currency = currency
        self.paidBy = paidBy
        self.groupId = groupId
        self.participants = participants
    }
    
    // Custom encoder to handle backend API format
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        // Don't encode ID for new transactions (backend will generate it)
        if id != UUID().uuidString {
            try container.encode(id, forKey: .id)
        }
        
        try container.encode(amount, forKey: .amount)
        try container.encode(title, forKey: .title)
        try container.encode(description, forKey: .description)
        try container.encode(category.rawValue, forKey: .category)
        try container.encode(date, forKey: .date)
        try container.encode(isExpense, forKey: .isExpense)
        try container.encodeIfPresent(userId, forKey: .userId)
        try container.encode(currency, forKey: .currency)
        try container.encodeIfPresent(paidBy, forKey: .paidBy)
        try container.encodeIfPresent(groupId, forKey: .groupId)
        try container.encodeIfPresent(participants, forKey: .participants)
    }
    
    // Custom decoder to handle backend API format
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        amount = try container.decode(Double.self, forKey: .amount)
        
        // Handle potential missing title field in backend response
        if container.contains(.title) {
            title = try container.decode(String.self, forKey: .title)
        } else {
            // Use description as title if missing
            title = try container.decode(String.self, forKey: .description)
        }
        
        description = try container.decode(String.self, forKey: .description)
        
        // Handle category decoding
        if container.contains(.category) {
            let categoryString = try container.decode(String.self, forKey: .category)
            if let decodedCategory = TransactionCategory(rawValue: categoryString) {
                category = decodedCategory
            } else {
                category = .other // Default to 'other' if we can't match
            }
        } else {
            category = .other
        }
        
        date = try container.decode(Date.self, forKey: .date)
        
        // Handle isExpense field that might not exist in backend
        if container.contains(.isExpense) {
            isExpense = try container.decode(Bool.self, forKey: .isExpense)
        } else {
            // Default to expense
            isExpense = true
        }
        
        userId = try container.decodeIfPresent(String.self, forKey: .userId)
        
        // Handle additional backend fields
        currency = try container.decodeIfPresent(String.self, forKey: .currency) ?? "USD"
        paidBy = try container.decodeIfPresent(String.self, forKey: .paidBy)
        groupId = try container.decodeIfPresent(String.self, forKey: .groupId)
        participants = try container.decodeIfPresent([Participant].self, forKey: .participants)
    }
    
    static let example = Transaction(
        amount: 29.99,
        title: "Grocery shopping",
        description: "Weekly grocery trip",
        category: .food,
        date: Date(),
        isExpense: true
    )
}

// Participant model to match backend structure
struct Participant: Codable, Hashable {
    let userId: String
    let share: Double?
    
    init(userId: String, share: Double? = nil) {
        self.userId = userId
        self.share = share
    }
}

enum TransactionCategory: String, CaseIterable, Identifiable, Codable {
    case food = "Food"
    case transportation = "Transportation"
    case entertainment = "Entertainment"
    case utilities = "Utilities"
    case housing = "Housing"
    case health = "Health"
    case education = "Education"
    case shopping = "Shopping"
    case travel = "Travel"
    case other = "Other"
    
    var id: String { self.rawValue }
    
    var icon: String {
        switch self {
        case .food: return "cart.fill"
        case .transportation: return "car.fill"
        case .entertainment: return "tv.fill"
        case .utilities: return "bolt.fill"
        case .housing: return "house.fill"
        case .health: return "heart.fill"
        case .education: return "book.fill"
        case .shopping: return "bag.fill"
        case .travel: return "airplane"
        case .other: return "ellipsis.circle.fill"
        }
    }
    
    var color: String {
        switch self {
        case .food: return "green"
        case .transportation: return "blue"
        case .entertainment: return "purple"
        case .utilities: return "yellow"
        case .housing: return "brown"
        case .health: return "red"
        case .education: return "cyan"
        case .shopping: return "pink"
        case .travel: return "orange"
        case .other: return "gray"
        }
    }
} 