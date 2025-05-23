import Foundation
import Combine

enum APIError: Error {
    case invalidURL
    case requestFailed(Error)
    case invalidResponse
    case decodingFailed(Error)
    case serverError(String)
    case authenticationFailed
    case noData
    
    var localizedDescription: String {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .requestFailed(let error):
            return "Request failed: \(error.localizedDescription)"
        case .invalidResponse:
            return "Invalid response from the server"
        case .decodingFailed(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .serverError(let message):
            return "Server error: \(message)"
        case .authenticationFailed:
            return "Authentication failed"
        case .noData:
            return "No data received"
        }
    }
}

class APIClient {
    private static let baseURL = Config.apiBaseURL
    private static let session = URLSession.shared
    private static var cancellables = Set<AnyCancellable>()
    
    // MARK: - Setup
    
    static func initialize() {
        // Subscribe to token refresh events
        TokenManager.tokenRefreshPublisher
            .sink { _ in
                print("🔄 Token refreshed, future API calls will use the new token")
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Authentication
    
    static func signIn(email: String, password: String) -> AnyPublisher<AuthResponse, APIError> {
        let endpoint = "/auth/login"
        let body: [String: Any] = [
            "email": email,
            "password": password
        ]
        
        return makeRequest(endpoint: endpoint, method: "POST", body: body)
    }
    
    static func signUp(name: String, email: String, password: String) -> AnyPublisher<AuthResponse, APIError> {
        let endpoint = "/auth/register"
        let body: [String: Any] = [
            "name": name,
            "email": email,
            "password": password
        ]
        
        return makeRequest(endpoint: endpoint, method: "POST", body: body)
    }
    
    static func refreshToken(refreshToken: String) -> AnyPublisher<AuthResponse, APIError> {
        let endpoint = "/auth/refresh-token"
        let body: [String: Any] = [
            "refreshToken": refreshToken
        ]
        
        return makeRequest(endpoint: endpoint, method: "POST", body: body)
    }
    
    static func resetPassword(email: String) -> AnyPublisher<MessageResponse, APIError> {
        let endpoint = "/auth/forgot-password"
        let body: [String: Any] = [
            "email": email
        ]
        
        return makeRequest(endpoint: endpoint, method: "POST", body: body)
    }
    
    // MARK: - Transactions
    
    static func getTransactions() -> AnyPublisher<[Transaction], APIError> {
        let endpoint = "/expenses"
        return makeAuthenticatedRequest(endpoint: endpoint, method: "GET")
    }
    
    static func addTransaction(transaction: Transaction) -> AnyPublisher<Transaction, APIError> {
        let endpoint = "/expenses"
        let encoder = JSONEncoder()
        
        guard let data = try? encoder.encode(transaction) else {
            return Fail(error: APIError.invalidResponse).eraseToAnyPublisher()
        }
        
        guard let body = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any] else {
            return Fail(error: APIError.invalidResponse).eraseToAnyPublisher()
        }
        
        return makeAuthenticatedRequest(endpoint: endpoint, method: "POST", body: body)
    }
    
    static func deleteTransaction(id: String) -> AnyPublisher<MessageResponse, APIError> {
        let endpoint = "/expenses/\(id)"
        return makeAuthenticatedRequest(endpoint: endpoint, method: "DELETE")
    }
    
    // MARK: - OAuth
    
    static func signInWithApple(token: String) -> AnyPublisher<AuthResponse, APIError> {
        let endpoint = "/auth/apple"
        let body: [String: Any] = [
            "token": token
        ]
        
        return makeRequest(endpoint: endpoint, method: "POST", body: body)
    }
    
    static func signInWithGoogle(token: String) -> AnyPublisher<AuthResponse, APIError> {
        let endpoint = "/auth/google"
        let body: [String: Any] = [
            "token": token
        ]
        
        return makeRequest(endpoint: endpoint, method: "POST", body: body)
    }
    
    // MARK: - Helper Methods
    
    private static var defaultHeaders: [String: String] {
        return [
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-API-Version": Config.apiVersion
        ]
    }
    
    // Makes a request that doesn't require authentication
    private static func makeRequest<T: Decodable>(
        endpoint: String,
        method: String,
        body: [String: Any]? = nil,
        headers: [String: String]? = nil
    ) -> AnyPublisher<T, APIError> {
        guard let url = URL(string: baseURL + endpoint) else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        
        // Set default headers
        for (key, value) in defaultHeaders {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        // Set additional headers if any
        if let headers = headers {
            for (key, value) in headers {
                request.setValue(value, forHTTPHeaderField: key)
            }
        }
        
        // Set body if provided
        if let body = body {
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])
            } catch {
                return Fail(error: APIError.requestFailed(error)).eraseToAnyPublisher()
            }
        }
        
        // Add request logging for development environments
        if Config.environment == .development {
            print("🌐 API Request: \(method) \(url)")
            if let headers = headers {
                print("📋 Headers: \(headers)")
            }
            if let body = body {
                print("📦 Body: \(body)")
            }
        }
        
        return executeRequest(request)
    }
    
    // Makes a request that requires authentication
    private static func makeAuthenticatedRequest<T: Decodable>(
        endpoint: String,
        method: String,
        body: [String: Any]? = nil,
        additionalHeaders: [String: String]? = nil
    ) -> AnyPublisher<T, APIError> {
        // Check if we have a valid token
        guard let token = TokenManager.getToken() else {
            return Fail(error: APIError.authenticationFailed).eraseToAnyPublisher()
        }
        
        // Add authorization header
        var headers = defaultHeaders
        headers["Authorization"] = "Bearer \(token)"
        
        // Add any additional headers
        if let additionalHeaders = additionalHeaders {
            for (key, value) in additionalHeaders {
                headers[key] = value
            }
        }
        
        return makeRequest(endpoint: endpoint, method: method, body: body, headers: headers)
            .tryCatch { (error: APIError) -> AnyPublisher<T, APIError> in
                // If we get an authentication error, try to refresh the token
                if case .authenticationFailed = error {
                    return refreshAndRetry(endpoint: endpoint, method: method, body: body, additionalHeaders: additionalHeaders)
                } else {
                    return Fail(error: error).eraseToAnyPublisher()
                }
            }
            .mapError { error -> APIError in
                // This ensures the error type stays as APIError
                if let apiError = error as? APIError {
                    return apiError
                } else {
                    return APIError.requestFailed(error)
                }
            }
            .eraseToAnyPublisher()
    }
    
    // Refresh token and retry the original request
    private static func refreshAndRetry<T: Decodable>(
        endpoint: String,
        method: String,
        body: [String: Any]?,
        additionalHeaders: [String: String]?
    ) -> AnyPublisher<T, APIError> {
        // Check if we have a refresh token
        guard let refreshToken = TokenManager.getRefreshToken() else {
            return Fail(error: APIError.authenticationFailed).eraseToAnyPublisher()
        }
        
        // Try to refresh the token
        return APIClient.refreshToken(refreshToken: refreshToken)
            .flatMap { response -> AnyPublisher<T, APIError> in
                // Save the new tokens
                TokenManager.saveToken(response.token)
                if let newRefreshToken = response.refreshToken {
                    TokenManager.saveRefreshToken(newRefreshToken)
                }
                
                // Retry the original request with the new token
                var headers = defaultHeaders
                headers["Authorization"] = "Bearer \(response.token)"
                
                if let additionalHeaders = additionalHeaders {
                    for (key, value) in additionalHeaders {
                        headers[key] = value
                    }
                }
                
                return makeRequest(endpoint: endpoint, method: method, body: body, headers: headers)
            }
            .eraseToAnyPublisher()
    }
    
    // Execute the actual network request
    private static func executeRequest<T: Decodable>(_ request: URLRequest) -> AnyPublisher<T, APIError> {
        return session.dataTaskPublisher(for: request)
            .mapError { APIError.requestFailed($0) }
            .flatMap { data, response -> AnyPublisher<Data, APIError> in
                guard let httpResponse = response as? HTTPURLResponse else {
                    return Fail(error: APIError.invalidResponse).eraseToAnyPublisher()
                }
                
                // Log response in development
                if Config.environment == .development {
                    print("🔄 API Response: \(httpResponse.statusCode)")
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("📥 Data: \(responseString)")
                    }
                }
                
                switch httpResponse.statusCode {
                case 200...299:
                    return Just(data)
                        .setFailureType(to: APIError.self)
                        .eraseToAnyPublisher()
                case 401:
                    return Fail(error: APIError.authenticationFailed).eraseToAnyPublisher()
                default:
                    // Try to parse error message from server
                    if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                        return Fail(error: APIError.serverError(errorResponse.message)).eraseToAnyPublisher()
                    } else {
                        return Fail(error: APIError.serverError("Status code: \(httpResponse.statusCode)")).eraseToAnyPublisher()
                    }
                }
            }
            .decode(type: T.self, decoder: JSONDecoder())
            .mapError { error -> APIError in
                if let apiError = error as? APIError {
                    return apiError
                } else {
                    return APIError.decodingFailed(error)
                }
            }
            .eraseToAnyPublisher()
    }
}

// MARK: - Response Models

struct AuthResponse: Codable {
    let token: String
    let refreshToken: String?
    let user: UserResponse
}

struct UserResponse: Codable {
    let id: String
    let name: String
    let email: String
}

struct MessageResponse: Codable {
    let message: String
}

struct ErrorResponse: Codable {
    let message: String
} 