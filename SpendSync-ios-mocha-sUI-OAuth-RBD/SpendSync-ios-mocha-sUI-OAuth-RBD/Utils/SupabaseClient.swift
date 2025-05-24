import Foundation
import Combine
// import Supabase - Temporarily commented out until package is properly installed

// MARK: - Mock Supabase Types (Temporary)
struct MockSession {
    let user: MockUser
}

struct MockUser {
    let id: UUID
    let email: String?
    let userMetadata: [String: AnyJSON]?
}

struct MockAuthResponse {
    let user: MockUser?
    let session: MockSession?
}

enum AnyJSON: Codable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case null
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let string = try? container.decode(String.self) {
            self = .string(string)
        } else if let number = try? container.decode(Double.self) {
            self = .number(number)
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else {
            self = .null
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let string):
            try container.encode(string)
        case .number(let number):
            try container.encode(number)
        case .bool(let bool):
            try container.encode(bool)
        case .null:
            try container.encodeNil()
        }
    }
}

// MARK: - Mock Supabase Client
class SupabaseClient: ObservableObject {
    static let shared = SupabaseClient()
    
    @Published var session: MockSession?
    @Published var isAuthenticated: Bool = false
    
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        // Mock initialization
        print("🔧 Using Mock Supabase Client - Install Supabase package for full functionality")
    }
    
    // MARK: - Mock Authentication Methods
    
    func signUp(email: String, password: String, firstName: String? = nil, lastName: String? = nil) async throws -> MockAuthResponse {
        // Mock implementation
        print("🔧 Mock signUp called for: \(email)")
        let user = MockUser(id: UUID(), email: email, userMetadata: nil)
        let session = MockSession(user: user)
        
        DispatchQueue.main.async {
            self.session = session
            self.isAuthenticated = true
        }
        
        return MockAuthResponse(user: user, session: session)
    }
    
    func signIn(email: String, password: String) async throws -> MockAuthResponse {
        // Mock implementation
        print("🔧 Mock signIn called for: \(email)")
        let user = MockUser(id: UUID(), email: email, userMetadata: nil)
        let session = MockSession(user: user)
        
        DispatchQueue.main.async {
            self.session = session
            self.isAuthenticated = true
        }
        
        return MockAuthResponse(user: user, session: session)
    }
    
    func signOut() async throws {
        print("🔧 Mock signOut called")
        DispatchQueue.main.async {
            self.session = nil
            self.isAuthenticated = false
        }
    }
    
    func resetPassword(email: String) async throws {
        print("🔧 Mock resetPassword called for: \(email)")
    }
    
    // MARK: - Mock OAuth Methods
    
    func signInWithGoogle() async throws -> URL {
        print("🔧 Mock Google OAuth called")
        return URL(string: "https://accounts.google.com/oauth/authorize")!
    }
    
    func signInWithGitHub() async throws -> URL {
        print("🔧 Mock GitHub OAuth called")
        return URL(string: "https://github.com/login/oauth/authorize")!
    }
    
    func handleOAuthCallback(url: URL) async throws {
        print("🔧 Mock OAuth callback handled: \(url)")
        let user = MockUser(id: UUID(), email: "oauth@example.com", userMetadata: nil)
        let session = MockSession(user: user)
        
        DispatchQueue.main.async {
            self.session = session
            self.isAuthenticated = true
        }
    }
    
    // MARK: - Mock User Profile Methods
    
    func getCurrentUser() -> MockUser? {
        return session?.user
    }
    
    func getUserProfile() async throws -> UserProfile? {
        guard let user = getCurrentUser() else { return nil }
        
        return UserProfile(
            id: UUID(),
            userId: user.id,
            firstName: "Mock",
            lastName: "User",
            avatarUrl: nil,
            phone: nil,
            preferences: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    func createUserProfile(firstName: String?, lastName: String?, avatarUrl: String? = nil) async throws -> UserProfile {
        guard let user = getCurrentUser() else {
            throw SupabaseError.userNotAuthenticated
        }
        
        return UserProfile(
            id: UUID(),
            userId: user.id,
            firstName: firstName,
            lastName: lastName,
            avatarUrl: avatarUrl,
            phone: nil,
            preferences: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    func updateUserProfile(_ profile: UserProfileUpdate) async throws -> UserProfile {
        guard let user = getCurrentUser() else {
            throw SupabaseError.userNotAuthenticated
        }
        
        return UserProfile(
            id: UUID(),
            userId: user.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
            phone: profile.phone,
            preferences: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    // MARK: - Mock Data Methods
    
    func getExpenses() async throws -> [Expense] {
        print("🔧 Mock getExpenses called")
        return []
    }
    
    func createExpense(_ expense: ExpenseInsert) async throws -> Expense {
        print("🔧 Mock createExpense called")
        return Expense(
            id: UUID(),
            title: expense.title,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency,
            category: expense.category,
            createdBy: expense.createdBy ?? UUID(),
            groupId: expense.groupId,
            participants: expense.participants,
            splitMethod: expense.splitMethod,
            splitDetails: expense.splitDetails,
            receiptUrl: nil,
            status: "active",
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    func getGroups() async throws -> [Group] {
        print("🔧 Mock getGroups called")
        return []
    }
}

// MARK: - Custom Errors

enum SupabaseError: Error, LocalizedError {
    case userNotAuthenticated
    case profileCreationFailed
    case profileUpdateFailed
    case expenseCreationFailed
    
    var errorDescription: String? {
        switch self {
        case .userNotAuthenticated:
            return "User is not authenticated"
        case .profileCreationFailed:
            return "Failed to create user profile"
        case .profileUpdateFailed:
            return "Failed to update user profile"
        case .expenseCreationFailed:
            return "Failed to create expense"
        }
    }
}

// MARK: - Data Models

struct UserProfile: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let firstName: String?
    let lastName: String?
    let avatarUrl: String?
    let phone: String?
    let preferences: [String: AnyJSON]?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
        case phone
        case preferences
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct UserProfileInsert: Codable {
    let userId: UUID
    let firstName: String?
    let lastName: String?
    let avatarUrl: String?
    
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
    }
}

struct UserProfileUpdate: Codable {
    let firstName: String?
    let lastName: String?
    let avatarUrl: String?
    let phone: String?
    
    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
        case phone
    }
}

struct Expense: Codable, Identifiable {
    let id: UUID
    let title: String
    let description: String?
    let amount: Decimal
    let currency: String
    let category: String?
    let createdBy: UUID
    let groupId: UUID
    let participants: [UUID]
    let splitMethod: String
    let splitDetails: [String: AnyJSON]
    let receiptUrl: String?
    let status: String
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case amount
        case currency
        case category
        case createdBy = "created_by"
        case groupId = "group_id"
        case participants
        case splitMethod = "split_method"
        case splitDetails = "split_details"
        case receiptUrl = "receipt_url"
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct ExpenseInsert: Codable {
    let title: String
    let description: String?
    let amount: Decimal
    let currency: String
    let category: String?
    var createdBy: UUID?
    let groupId: UUID
    let participants: [UUID]
    let splitMethod: String
    let splitDetails: [String: AnyJSON]
    
    enum CodingKeys: String, CodingKey {
        case title
        case description
        case amount
        case currency
        case category
        case createdBy = "created_by"
        case groupId = "group_id"
        case participants
        case splitMethod = "split_method"
        case splitDetails = "split_details"
    }
}

struct Group: Codable, Identifiable {
    let id: UUID
    let name: String
    let description: String?
    let createdBy: UUID
    let members: [UUID]
    let settings: [String: AnyJSON]?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case description
        case createdBy = "created_by"
        case members
        case settings
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
} 