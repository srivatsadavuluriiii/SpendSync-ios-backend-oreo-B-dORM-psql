import Foundation
import Combine
import Supabase

// MARK: - Mock Supabase Types (Temporary)

struct MockUser: Codable, Identifiable {
    let id: UUID
    let email: String?
    let emailConfirmedAt: Date?
    let phone: String?
    let phoneConfirmedAt: Date?
    let createdAt: Date
    let updatedAt: Date
    let lastSignInAt: Date?
    let userMetadata: [String: AnyJSON]?
    let appMetadata: [String: AnyJSON]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case emailConfirmedAt = "email_confirmed_at"
        case phone
        case phoneConfirmedAt = "phone_confirmed_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case lastSignInAt = "last_sign_in_at"
        case userMetadata = "user_metadata"
        case appMetadata = "app_metadata"
    }
}

struct MockAuthResponse: Codable {
    let user: MockUser?
    let session: MockSession?
}

struct MockSession: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
    let tokenType: String
    let user: MockUser
    
    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case tokenType = "token_type"
        case user
    }
}

enum MockSupabaseError: Error, LocalizedError {
    case userNotAuthenticated
    case profileCreationFailed
    case profileUpdateFailed
    case expenseCreationFailed
    case networkError(String)
    
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
        case .networkError(let message):
            return "Network error: \(message)"
        }
    }
}

// MARK: - Mock Supabase Client

class SupabaseClient: ObservableObject {
    static let shared = SupabaseClient()
    
    @Published var isAuthenticated: Bool = false
    @Published var session: MockSession? = nil
    
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        print("🔧 Using Mock Supabase Client - Install Supabase package for full functionality")
        
        // Check for existing session
        if let savedSession = loadSession() {
            self.session = savedSession
            self.isAuthenticated = true
        }
    }
    
    // MARK: - Authentication Methods
    
    func signUp(email: String, password: String, firstName: String? = nil, lastName: String? = nil) async throws -> MockAuthResponse {
        // Simulate API delay
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        let user = MockUser(
            id: UUID(),
            email: email,
            emailConfirmedAt: Date(),
            phone: nil,
            phoneConfirmedAt: nil,
            createdAt: Date(),
            updatedAt: Date(),
            lastSignInAt: Date(),
            userMetadata: [
                "first_name": AnyJSON.string(firstName ?? ""),
                "last_name": AnyJSON.string(lastName ?? "")
            ],
            appMetadata: [:]
        )
        
        let session = MockSession(
            accessToken: "mock_access_token_\(UUID().uuidString)",
            refreshToken: "mock_refresh_token_\(UUID().uuidString)",
            expiresIn: 3600,
            tokenType: "bearer",
            user: user
        )
        
        DispatchQueue.main.async {
            self.session = session
            self.isAuthenticated = true
        }
        
        saveSession(session)
        
        return MockAuthResponse(user: user, session: session)
    }
    
    func signIn(email: String, password: String) async throws -> MockAuthResponse {
        // Simulate API delay
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        let user = MockUser(
            id: UUID(),
            email: email,
            emailConfirmedAt: Date(),
            phone: nil,
            phoneConfirmedAt: nil,
            createdAt: Date().addingTimeInterval(-86400), // 1 day ago
            updatedAt: Date(),
            lastSignInAt: Date(),
            userMetadata: [:],
            appMetadata: [:]
        )
        
        let session = MockSession(
            accessToken: "mock_access_token_\(UUID().uuidString)",
            refreshToken: "mock_refresh_token_\(UUID().uuidString)",
            expiresIn: 3600,
            tokenType: "bearer",
            user: user
        )
        
        DispatchQueue.main.async {
            self.session = session
            self.isAuthenticated = true
        }
        
        saveSession(session)
        
        return MockAuthResponse(user: user, session: session)
    }
    
    func signOut() async throws {
        DispatchQueue.main.async {
            self.session = nil
            self.isAuthenticated = false
        }
        
        clearSession()
    }
    
    func resetPassword(email: String) async throws {
        // Simulate API delay
        try await Task.sleep(nanoseconds: 1_000_000_000)
        print("Password reset email sent to \(email)")
    }
    
    // MARK: - OAuth Methods
    
    func signInWithGoogle() async throws -> URL {
        guard let url = URL(string: "https://accounts.google.com/oauth/authorize?client_id=\(Config.googleClientID)&redirect_uri=\(Config.redirectURL)&response_type=code&scope=openid%20email%20profile") else {
            throw MockSupabaseError.networkError("Invalid OAuth URL")
        }
        return url
    }
    
    func signInWithGitHub() async throws -> URL {
        guard let url = URL(string: "https://github.com/login/oauth/authorize?client_id=\(Config.githubClientID)&redirect_uri=\(Config.redirectURL)&scope=user:email") else {
            throw MockSupabaseError.networkError("Invalid OAuth URL")
        }
        return url
    }
    
    func handleOAuthCallback(url: URL) async throws {
        // Simulate OAuth callback handling
        try await Task.sleep(nanoseconds: 500_000_000)
        
        let user = MockUser(
            id: UUID(),
            email: "oauth.user@example.com",
            emailConfirmedAt: Date(),
            phone: nil,
            phoneConfirmedAt: nil,
            createdAt: Date(),
            updatedAt: Date(),
            lastSignInAt: Date(),
            userMetadata: [
                "provider": AnyJSON.string("oauth"),
                "avatar_url": AnyJSON.string("https://example.com/avatar.jpg")
            ],
            appMetadata: [:]
        )
        
        let session = MockSession(
            accessToken: "mock_oauth_token_\(UUID().uuidString)",
            refreshToken: "mock_oauth_refresh_\(UUID().uuidString)",
            expiresIn: 3600,
            tokenType: "bearer",
            user: user
        )
        
        DispatchQueue.main.async {
            self.session = session
            self.isAuthenticated = true
        }
        
        saveSession(session)
    }
    
    // MARK: - User Methods
    
    func getCurrentUser() -> MockUser? {
        return session?.user
    }
    
    // MARK: - Session Management
    
    private func saveSession(_ session: MockSession) {
        if let data = try? JSONEncoder().encode(session) {
            UserDefaults.standard.set(data, forKey: "mock_supabase_session")
        }
    }
    
    private func loadSession() -> MockSession? {
        guard let data = UserDefaults.standard.data(forKey: "mock_supabase_session"),
              let session = try? JSONDecoder().decode(MockSession.self, from: data) else {
            return nil
        }
        return session
    }
    
    private func clearSession() {
        UserDefaults.standard.removeObject(forKey: "mock_supabase_session")
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

// MARK: - AnyJSON Helper

enum AnyJSON: Codable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case null
    case array([AnyJSON])
    case object([String: AnyJSON])
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if container.decodeNil() {
            self = .null
        } else if let bool = try? container.decode(Bool.self) {
            self = .bool(bool)
        } else if let number = try? container.decode(Double.self) {
            self = .number(number)
        } else if let string = try? container.decode(String.self) {
            self = .string(string)
        } else if let array = try? container.decode([AnyJSON].self) {
            self = .array(array)
        } else if let object = try? container.decode([String: AnyJSON].self) {
            self = .object(object)
        } else {
            throw DecodingError.typeMismatch(AnyJSON.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Invalid JSON"))
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch self {
        case .null:
            try container.encodeNil()
        case .bool(let bool):
            try container.encode(bool)
        case .number(let number):
            try container.encode(number)
        case .string(let string):
            try container.encode(string)
        case .array(let array):
            try container.encode(array)
        case .object(let object):
            try container.encode(object)
        }
    }
} 
