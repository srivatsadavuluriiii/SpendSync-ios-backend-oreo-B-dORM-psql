import Foundation
import SwiftUI
import Combine
import GoogleSignIn
import UIKit
import Supabase

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
                // Load user profile from local storage or Supabase
                if let profile = supabaseClient.getUserProfile() {
                    await MainActor.run {
                        self.userProfile = profile
                        print("👤 User profile loaded: \(profile.firstName ?? "Unknown") \(profile.lastName ?? "")")
                    }
                } else {
                    print("📝 No user profile found")
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                }
            }
        }
    }
    
    // MARK: - Authentication Methods
    
    func signUp(email: String, password: String, firstName: String? = nil, lastName: String? = nil) {
        guard !isLoading else { return }
        
        isLoading = true
        error = nil
        
        Task {
            do {
                let response = try await supabaseClient.signUp(
                    email: email,
                    password: password,
                    firstName: firstName,
                    lastName: lastName
                )
                
                await MainActor.run {
                    self.isLoading = false
                    // User will be set automatically via the auth state listener
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    self.error = error.localizedDescription
                }
            }
        }
    }
    
    func signIn(email: String, password: String) {
        guard !isLoading else { return }
        
        isLoading = true
        error = nil
        
        Task {
            do {
                let response = try await supabaseClient.signIn(email: email, password: password)
                
                await MainActor.run {
                    self.isLoading = false
                    // User will be set automatically via the auth state listener
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    self.error = error.localizedDescription
                }
            }
        }
    }
    
    func signOut() {
        Task {
            do {
                try await supabaseClient.signOut()
                DispatchQueue.main.async {
                    self.isLoading = false
                    // User will be cleared automatically via the auth state listener
                }
            } catch {
                DispatchQueue.main.async {
                    self.error = error.localizedDescription
                }
            }
        }
    }
    
    // MARK: - Email/Password Authentication
    
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
    
    // MARK: - OAuth Authentication
    
    func signInWithGoogle() {
        guard !isLoading else { return }
        
        isLoading = true
        error = nil
        
        Task {
            do {
                let url = try await supabaseClient.signInWithGoogle()
                
                await MainActor.run {
                    // Open the OAuth URL in Safari
                    UIApplication.shared.open(url)
                    // Don't set isLoading to false here - wait for callback
                }
            } catch {
                await MainActor.run {
                    self.error = "Failed to initiate Google sign-in: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    func signInWithGitHub() {
        guard !isLoading else { return }
        
        isLoading = true
        error = nil
        
        Task {
            do {
                let url = try await supabaseClient.signInWithGitHub()
                
                await MainActor.run {
                    // Open the OAuth URL in Safari
                    UIApplication.shared.open(url)
                    // Don't set isLoading to false here - wait for callback
                }
            } catch {
                await MainActor.run {
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
                
                await MainActor.run {
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.error = "OAuth callback failed: \(error.localizedDescription)"
                    self.isLoading = false
                }
            }
        }
    }
    
    // MARK: - Profile Management
    
    func createUserProfile(firstName: String?, lastName: String?, avatarUrl: String? = nil) async throws {
        try await supabaseClient.createUserProfile(firstName: firstName, lastName: lastName, avatarUrl: avatarUrl)
        
        // Reload user data to update the UI
        loadUserData()
    }
    
    func updateUserProfile(firstName: String?, lastName: String?, avatarUrl: String?, phone: String?) {
        Task {
            do {
                // In a real implementation, this would call supabaseClient.updateUserProfile
                print("🔧 Profile update functionality - to be implemented with real Supabase")
                
                await MainActor.run {
                    print("Profile updated successfully")
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
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
