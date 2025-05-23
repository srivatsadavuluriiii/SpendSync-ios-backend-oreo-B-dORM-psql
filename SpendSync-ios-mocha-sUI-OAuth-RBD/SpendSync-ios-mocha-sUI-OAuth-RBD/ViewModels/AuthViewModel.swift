import Foundation
import SwiftUI
import Combine
import GoogleSignIn
import UIKit

class AuthViewModel: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var error: String? = nil
    @Published var currentUser: User? = nil
    
    // Secure storage in Keychain rather than AppStorage
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Check if user is already logged in based on stored token
        isAuthenticated = TokenManager.isAuthenticated()
        
        if isAuthenticated {
            // Attempt to load user from storage
            loadUserFromStorage()
            
            // If token is close to expiry, refresh it
            if let token = TokenManager.getToken(),
               let expiryDate = TokenManager.getTokenExpirationDate(token),
               expiryDate.timeIntervalSinceNow < Config.tokenExpirationBuffer * 2 {
                // Refresh token
                Task {
                    await TokenManager.refreshTokenIfNeeded()
                }
            }
        }
        
        // Listen for token refresh events
        TokenManager.tokenRefreshPublisher
            .sink { [weak self] _ in
                self?.loadUserFromStorage()
            }
            .store(in: &cancellables)
    }
    
    private func loadUserFromStorage() {
        guard let userId = TokenManager.getUserId() else { return }
        
        // For demo purposes, we're recreating the user from stored data
        // In a real app, you'd fetch the user profile from the backend
        currentUser = User(
            id: userId,
            name: getUserNameFromStorage() ?? "User",
            email: getUserEmailFromStorage() ?? "user@example.com"
        )
    }
    
    // Helper methods for user data (would be in Keychain in production)
    private func saveUserNameToStorage(_ name: String) {
        _ = TokenManager.saveDataToKeychain(name.data(using: .utf8)!, forKey: "userName")
    }
    
    private func saveUserEmailToStorage(_ email: String) {
        _ = TokenManager.saveDataToKeychain(email.data(using: .utf8)!, forKey: "userEmail")
    }
    
    private func getUserNameFromStorage() -> String? {
        guard let data = TokenManager.getDataFromKeychain(forKey: "userName") else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    private func getUserEmailFromStorage() -> String? {
        guard let data = TokenManager.getDataFromKeychain(forKey: "userEmail") else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    func signIn(email: String, password: String) {
        isLoading = true
        error = nil
        
        APIClient.signIn(email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    guard let self = self else { return }
                    self.isLoading = false
                    
                    if case .failure(let error) = completion {
                        self.error = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] response in
                    guard let self = self else { return }
                    
                    // Save authentication information securely
                    TokenManager.saveToken(response.token)
                    if let refreshToken = response.refreshToken {
                        TokenManager.saveRefreshToken(refreshToken)
                    }
                    TokenManager.saveUserId(response.user.id)
                    self.saveUserNameToStorage(response.user.name)
                    self.saveUserEmailToStorage(response.user.email)
                    
                    // Update app state
                    self.currentUser = User(
                        id: response.user.id,
                        name: response.user.name,
                        email: response.user.email
                    )
                    
                    self.isAuthenticated = true
                    self.isLoading = false
                }
            )
            .store(in: &cancellables)
    }
    
    func signUp(name: String, email: String, password: String) {
        isLoading = true
        error = nil
        
        APIClient.signUp(name: name, email: email, password: password)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    guard let self = self else { return }
                    self.isLoading = false
                    
                    if case .failure(let error) = completion {
                        self.error = error.localizedDescription
                    }
                },
                receiveValue: { [weak self] response in
                    guard let self = self else { return }
                    
                    // Save authentication information securely
                    TokenManager.saveToken(response.token)
                    if let refreshToken = response.refreshToken {
                        TokenManager.saveRefreshToken(refreshToken)
                    }
                    TokenManager.saveUserId(response.user.id)
                    self.saveUserNameToStorage(response.user.name)
                    self.saveUserEmailToStorage(response.user.email)
                    
                    // Update app state
                    self.currentUser = User(
                        id: response.user.id,
                        name: response.user.name,
                        email: response.user.email
                    )
                    
                    self.isAuthenticated = true
                    self.isLoading = false
                }
            )
            .store(in: &cancellables)
    }
    
    func resetPassword(email: String) {
        isLoading = true
        error = nil
        
        APIClient.resetPassword(email: email)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    guard let self = self else { return }
                    self.isLoading = false
                    
                    if case .failure(let error) = completion {
                        self.error = error.localizedDescription
                    }
                },
                receiveValue: { _ in
                    // Password reset email sent successfully
                    // Handled in view with alert
                }
            )
            .store(in: &cancellables)
    }
    
    func signOut() {
        // Clear stored credentials
        TokenManager.clearAllAuthData()
        
        // Reset state
        currentUser = nil
        isAuthenticated = false
    }
    
    // MARK: - OAuth methods
    
    func signInWithApple() {
        isLoading = true
        
        // In a real app, implement Apple authentication flow
        // Then send the token to your backend
        
        // Mock implementation for development
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self else { return }
            
            // Demo Apple login success with mock token
            self.handleOAuthSuccess(
                name: "Apple User",
                email: "apple_user@example.com",
                oauthToken: "mock_apple_token"
            )
        }
    }
    
    func signInWithGoogle() {
        isLoading = true
        error = nil
        
        // Get the client ID directly since we had to use a separate plist file
        let clientID = "259479300315-6ef3ed01igu1gtjbulcuagb4bcdtpdua.apps.googleusercontent.com"
        
        // Configure Google Sign In
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        
        guard let presentingViewController = (UIApplication.shared.connectedScenes.first as? UIWindowScene)?.windows.first?.rootViewController else {
            self.error = "Cannot find presenting view controller"
            self.isLoading = false
            return
        }
        
        // Start the sign-in flow with the new API
        GIDSignIn.sharedInstance.signIn(withPresenting: presentingViewController) { [weak self] result, error in
            guard let self = self else { return }
            
            if let error = error {
                self.error = "Google sign-in failed: \(error.localizedDescription)"
                self.isLoading = false
                return
            }
            
            guard let signInResult = result else {
                self.error = "Sign-in result is missing"
                self.isLoading = false
                return
            }
            
            let user = signInResult.user
            
            Task {
                do {
                    // Get the user profile and ID token
                    guard let idToken = signInResult.user.idToken?.tokenString else {
                        self.error = "Failed to get ID token from Google"
                        self.isLoading = false
                        return
                    }
                    
                    // Send the token to your backend for verification
                    // Call this on the main thread since it uses Combine publishers
                    DispatchQueue.main.async {
                        self.authenticateWithBackend(
                            idToken: idToken,
                            provider: "google"
                        )
                    }
                } catch {
                    self.error = "Failed to get Google token: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    private func authenticateWithBackend(idToken: String, provider: String) {
        APIClient.signInWithGoogle(token: idToken)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    guard let self = self else { return }
                    self.isLoading = false
                    
                    if case .failure(let error) = completion {
                        self.error = "Backend authentication failed: \(error.localizedDescription)"
                    }
                },
                receiveValue: { [weak self] response in
                    guard let self = self else { return }
                    
                    // Save authentication information securely
                    TokenManager.saveToken(response.token)
                    if let refreshToken = response.refreshToken {
                        TokenManager.saveRefreshToken(refreshToken)
                    }
                    TokenManager.saveUserId(response.user.id)
                    self.saveUserNameToStorage(response.user.name)
                    self.saveUserEmailToStorage(response.user.email)
                    
                    // Update app state
                    self.currentUser = User(
                        id: response.user.id,
                        name: response.user.name,
                        email: response.user.email
                    )
                    
                    self.isAuthenticated = true
                    self.isLoading = false
                }
            )
            .store(in: &cancellables)
    }
    
    private func handleOAuthSuccess(name: String, email: String, oauthToken: String) {
        // In a real app, send the OAuth token to your backend
        // For demo purposes, we'll simulate a successful authentication
        
        // Simulate user data that would come from backend
        let mockUserId = UUID().uuidString
        let mockToken = "jwt_token_\(mockUserId)"
        let mockRefreshToken = "refresh_token_\(mockUserId)"
        
        // Save authentication information securely
        TokenManager.saveToken(mockToken)
        TokenManager.saveRefreshToken(mockRefreshToken)
        TokenManager.saveUserId(mockUserId)
        saveUserNameToStorage(name)
        saveUserEmailToStorage(email)
        
        // Update app state
        currentUser = User(
            id: mockUserId,
            name: name,
            email: email
        )
        
        isAuthenticated = true
        isLoading = false
    }
}

// Basic user model
struct User: Identifiable {
    let id: String
    let name: String
    let email: String
} 