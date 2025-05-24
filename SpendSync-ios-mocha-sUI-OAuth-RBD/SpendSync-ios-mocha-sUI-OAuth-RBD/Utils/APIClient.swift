import Foundation

// MARK: - API Client for Backend Communication

class APIClient {
    static let shared = APIClient()
    
    private let baseURL: String
    private let session: URLSession
    
    private init() {
        self.baseURL = Config.apiBaseURL
        self.session = URLSession.shared
    }
    
    // MARK: - Authentication Headers
    
    private func authHeaders(with token: String) -> [String: String] {
        return [
            "Authorization": "Bearer \(token)",
            "Content-Type": "application/json"
        ]
    }
    
    // MARK: - User Profile API
    
    func syncUserProfile(_ profile: UserProfile, accessToken: String) async throws {
        let url = URL(string: "\(baseURL)/users/profile")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.allHTTPHeaderFields = authHeaders(with: accessToken)
        request.timeoutInterval = 30 // Increase timeout
        
        let profileData = UserProfileSync(
            id: profile.id.uuidString,
            userId: profile.userId.uuidString,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
            phone: profile.phone,
            email: nil // Will be extracted from token on backend
        )
        
        request.httpBody = try JSONEncoder().encode(profileData)
        
        do {
            let (_, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            guard 200...299 ~= httpResponse.statusCode else {
                // Log detailed error information
                print("❌ Backend sync failed with status: \(httpResponse.statusCode)")
                print("🔗 URL: \(url)")
                print("📝 Profile data: \(profile.firstName ?? "nil") \(profile.lastName ?? "nil")")
                
                if httpResponse.statusCode == 503 {
                    print("⚠️ Backend service unavailable (503) - this is expected during deployment")
                    // Don't throw error for 503, just log it
                    return
                }
                
                throw APIError.serverError(httpResponse.statusCode)
            }
            
            print("✅ User profile synced to backend successfully")
        } catch {
            // Handle network errors gracefully
            if error is URLError {
                print("⚠️ Network error during backend sync: \(error.localizedDescription)")
                // Don't throw network errors - profile is still saved locally
                return
            }
            throw error
        }
    }
    
    func fetchUserProfile(userId: String, accessToken: String) async throws -> UserProfile? {
        let url = URL(string: "\(baseURL)/users/\(userId)/profile")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.allHTTPHeaderFields = authHeaders(with: accessToken)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard 200...299 ~= httpResponse.statusCode else {
            if httpResponse.statusCode == 404 {
                return nil // Profile not found
            }
            throw APIError.serverError(httpResponse.statusCode)
        }
        
        let profileResponse = try JSONDecoder().decode(UserProfileResponse.self, from: data)
        return profileResponse.toUserProfile()
    }
    
    // MARK: - Health Check
    
    func healthCheck() async throws -> Bool {
        let url = URL(string: "\(baseURL)/health")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 10
        
        do {
            let (_, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return false
            }
            
            return 200...299 ~= httpResponse.statusCode
        } catch {
            print("❌ Backend health check failed: \(error)")
            return false
        }
    }
}

// MARK: - API Models

struct UserProfileSync: Codable {
    let id: String
    let userId: String
    let firstName: String?
    let lastName: String?
    let avatarUrl: String?
    let phone: String?
    let email: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
        case phone
        case email
    }
}

struct UserProfileResponse: Codable {
    let id: String
    let userId: String
    let firstName: String?
    let lastName: String?
    let avatarUrl: String?
    let phone: String?
    let email: String?
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case firstName = "first_name"
        case lastName = "last_name"
        case avatarUrl = "avatar_url"
        case phone
        case email
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
    
    func toUserProfile() -> UserProfile {
        let dateFormatter = ISO8601DateFormatter()
        
        return UserProfile(
            id: UUID(uuidString: id) ?? UUID(),
            userId: UUID(uuidString: userId) ?? UUID(),
            firstName: firstName,
            lastName: lastName,
            avatarUrl: avatarUrl,
            phone: phone,
            preferences: nil,
            createdAt: dateFormatter.date(from: createdAt) ?? Date(),
            updatedAt: dateFormatter.date(from: updatedAt) ?? Date()
        )
    }
}

// MARK: - API Errors

enum APIError: Error, LocalizedError {
    case invalidResponse
    case serverError(Int)
    case networkError(String)
    case decodingError
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .serverError(let code):
            return "Server error with code: \(code)"
        case .networkError(let message):
            return "Network error: \(message)"
        case .decodingError:
            return "Failed to decode response"
        }
    }
} 