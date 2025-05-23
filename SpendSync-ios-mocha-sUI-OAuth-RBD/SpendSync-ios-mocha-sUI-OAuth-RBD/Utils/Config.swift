import Foundation

enum AppEnvironment {
    case development
    case staging
    case production
    
    var baseURL: String {
        switch self {
        case .development:
            #if targetEnvironment(simulator)
            // Use localhost for simulator
            return "http://localhost:4000/api/v1"
            #else
            // For physical devices, use this IP address during local testing
            return "http://192.0.0.2:4000/api/v1"
            #endif
        case .staging:
            // Render deployment (replace this with your actual Render URL when available)
            return "https://spendsync-api.onrender.com/api/v1"
        case .production:
            return "https://api.spendsync.com/api/v1"
        }
    }
}

struct Config {
    // Set the current environment here
    static let environment: AppEnvironment = .staging
    
    // API Configuration
    static let apiBaseURL = environment.baseURL
    static let apiVersion = "v1"
    
    // Authentication
    static let tokenExpirationBuffer: TimeInterval = 300 // 5 minutes in seconds
    
    // App Settings
    static let defaultCurrency = "$"
    static let maxTransactionsPerPage = 50
    
    // Feature Flags
    static let enableOAuth = true
    static let enableAppleSignIn = true
    static let enableGoogleSignIn = true
    static let enableFacebookSignIn = false
    
    // Contact Information
    static let supportEmail = "support@spendsync.com"
    static let privacyPolicyURL = "https://www.spendsync.com/privacy-policy"
    static let termsOfServiceURL = "https://www.spendsync.com/terms-of-service"
} 