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
            // Your Railway API Gateway URL
            return "https://spendsync-ios.up.railway.app/api/v1"
        case .production:
            return "https://api.spendsync.com/api/v1"
        }
    }
    
    var supabaseURL: String {
        // Your Supabase project URL
        return "https://wjuvjdmazdhqhcnvufrl.supabase.co"
    }
    
    var supabaseAnonKey: String {
        // Your Supabase anon key - this should be in a secure configuration in production
        return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdXZqZG1hemRocWhjbnZ1ZnJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0MDM5NzAsImV4cCI6MjA0Nzk3OTk3MH0.your-actual-anon-key"
    }
}

struct Config {
    // Set the current environment here
    static let environment: AppEnvironment = .staging
    
    // API Configuration
    static let apiBaseURL = environment.baseURL
    static let apiVersion = "v1"
    
    // Supabase Configuration
    static let supabaseURL = environment.supabaseURL
    static let supabaseAnonKey = environment.supabaseAnonKey
    
    // Authentication
    static let tokenExpirationBuffer: TimeInterval = 300 // 5 minutes in seconds
    
    // OAuth Configuration
    static let googleClientID = "259479300315-tp1jton6blcgpv32qdu7r2e6ohc1tdav.apps.googleusercontent.com"
    static let githubClientID = "Ov23liQtwaOBeJQAFC5w"
    
    // App Settings
    static let defaultCurrency = "$"
    static let maxTransactionsPerPage = 50
    
    // Feature Flags
    static let enableOAuth = true
    static let enableGoogleSignIn = true
    static let enableGitHubSignIn = true
    static let enableFacebookSignIn = false
    static let useSupabaseAuth = true
    
    // Contact Information
    static let supportEmail = "support@spendsync.com"
    static let privacyPolicyURL = "https://www.spendsync.com/privacy-policy"
    static let termsOfServiceURL = "https://www.spendsync.com/terms-of-service"
    
    // Deep Link Configuration
    static let appScheme = "spendsync"
    static let redirectURL = "\(appScheme)://auth/callback"
} 