import Foundation
import SwiftUI
import Combine
import GoogleSignIn
import UIKit
// import Supabase - Package not properly installed yet

class AuthViewModel: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var isLoading: Bool = false
    @Published var error: String? = nil
    @Published var currentUser: MockUser? = nil
    @Published var userProfile: UserProfile? = nil
    
    private let supabaseClient = SupabaseClient.shared
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Subscribe to Supabase auth state changes
        supabaseClient.$isAuthenticated
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isAuthenticated in
                self?.isAuthenticated = isAuthenticated
                if isAuthenticated {
                    self?.loadUserData()
                } else {
                    self?.currentUser = nil
                    self?.userProfile = nil
                }
            }
            .store(in: &cancellables)
        
        supabaseClient.$session
            .receive(on: DispatchQueue.main)
            .sink { [weak self] session in
                self?.currentUser = session?.user
            }
            .store(in: &cancellables)
    }
    
    private func loadUserData() {
        Task {
            do {
                let profile = try await supabaseClient.getUserProfile()
                DispatchQueue.main.async {
                    self.userProfile = profile
                }
            } catch {
                print("Failed to load user profile: \(error)")
            }
        }
    }
    
    // MARK: - Email/Password Authentication
    
    func signIn(email: String, password: String) {
        isLoading = true
        error = nil
        
        Task {
            do {
                _ = try await supabaseClient.signIn(email: email, password: password)
                DispatchQueue.main.async {
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func signUp(name: String, email: String, password: String) {
        isLoading = true
        error = nil
        
        // Split name into first and last name
        let nameComponents = name.components(separatedBy: " ")
        let firstName = nameComponents.first
        let lastName = nameComponents.count > 1 ? nameComponents.dropFirst().joined(separator: " ") : nil
        
        Task {
            do {
                let response = try await supabaseClient.signUp(
                    email: email,
                    password: password,
                    firstName: firstName,
                    lastName: lastName
                )
                
                // If user is confirmed immediately, create profile
                if response.user != nil {
                    try await createUserProfile(firstName: firstName, lastName: lastName)
                }
                
                DispatchQueue.main.async {
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func resetPassword(email: String) {
        isLoading = true
        error = nil
        
        Task {
            do {
                try await supabaseClient.resetPassword(email: email)
                DispatchQueue.main.async {
                    self.isLoading = false
                    // Show success message in UI
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    func signOut() {
        Task {
            do {
                try await supabaseClient.signOut()
            } catch {
                print("Sign out error: \(error)")
            }
        }
    }
    
    // MARK: - OAuth Authentication
    
    func signInWithGoogle() {
        isLoading = true
        error = nil
        
        Task {
            do {
                let url = try await supabaseClient.signInWithGoogle()
                
                DispatchQueue.main.async {
                    // Open the OAuth URL in Safari
                    UIApplication.shared.open(url)
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = "Failed to initiate Google sign-in: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    func signInWithGitHub() {
        isLoading = true
        error = nil
        
        Task {
            do {
                let url = try await supabaseClient.signInWithGitHub()
                
                DispatchQueue.main.async {
                    // Open the OAuth URL in Safari
                    UIApplication.shared.open(url)
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = "Failed to initiate GitHub sign-in: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    // Handle OAuth callback from deep link
    func handleOAuthCallback(url: URL) {
        Task {
            do {
                try await supabaseClient.handleOAuthCallback(url: url)
                
                // Create user profile if it doesn't exist
                if userProfile == nil {
                    try await createUserProfileFromAuth()
                }
                
                DispatchQueue.main.async {
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = "OAuth callback failed: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    // MARK: - User Profile Management
    
    private func createUserProfile(firstName: String?, lastName: String?) async throws {
        _ = try await supabaseClient.createUserProfile(
            firstName: firstName,
            lastName: lastName
        )
        
        // Reload user data
        loadUserData()
    }
    
    private func createUserProfileFromAuth() async throws {
        guard let user = currentUser else { return }
        
        // Extract name from user metadata or email
        let firstName = user.userMetadata?["first_name"]?.stringValue ?? 
                       user.userMetadata?["full_name"]?.stringValue?.components(separatedBy: " ").first
        let lastName = user.userMetadata?["last_name"]?.stringValue ??
                      (user.userMetadata?["full_name"]?.stringValue?.components(separatedBy: " ").count ?? 0 > 1 ?
                       user.userMetadata?["full_name"]?.stringValue?.components(separatedBy: " ").dropFirst().joined(separator: " ") : nil)
        
        try await createUserProfile(firstName: firstName, lastName: lastName)
    }
    
    func updateProfile(firstName: String?, lastName: String?, phone: String?) {
        isLoading = true
        error = nil
        
        Task {
            do {
                let update = UserProfileUpdate(
                    firstName: firstName,
                    lastName: lastName,
                    avatarUrl: nil,
                    phone: phone
                )
                
                let updatedProfile = try await supabaseClient.updateUserProfile(update)
                
                DispatchQueue.main.async {
                    self.userProfile = updatedProfile
                    self.isLoading = false
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
}

// MARK: - Helper Extensions

extension AnyJSON {
    var stringValue: String? {
        switch self {
        case .string(let value):
            return value
        default:
            return nil
        }
    }
}

// MARK: - User Model

struct User: Identifiable {
    let id: String
    let name: String
    let email: String
} 