import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss: DismissAction
    
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var showForgotPassword: Bool = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Welcome Back")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Log in to continue")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 40)
                
                // Login Form
                VStack(spacing: 16) {
                    // Email Field
                    InputField(
                        label: "Email",
                        placeholder: "Enter your email",
                        text: $email,
                        keyboardType: .emailAddress
                    )
                    
                    // Password Field
                    InputField(
                        label: "Password",
                        placeholder: "Enter your password",
                        text: $password,
                        isSecure: true
                    )
                    
                    // Forgot Password
                    HStack {
                        Spacer()
                        Button("Forgot Password?") {
                            showForgotPassword = true
                        }
                        .font(.callout)
                        .foregroundColor(.blue)
                    }
                    .padding(.top, 4)
                }
                .padding(.top, 24)
                
                // Login Button
                StyledButton(
                    title: authViewModel.isLoading ? "Logging in..." : "Log In",
                    type: .primary,
                    isFullWidth: true,
                    disabled: authViewModel.isLoading || email.isEmpty || password.isEmpty
                ) {
                    authViewModel.signIn(email: email, password: password)
                }
                .padding(.top, 16)
                
                // Error Message
                if let error = authViewModel.error {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                        .padding(.top, 8)
                }
                
                // Test Credentials Info (for development)
                VStack(spacing: 8) {
                    Text("Test Credentials")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Email: test@example.com")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("Password: password123")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.top, 16)
                
                Spacer()
                
                // Sign Up Prompt
                HStack(spacing: 4) {
                    Text("Don't have an account?")
                        .foregroundColor(.secondary)
                    
                    NavigationLink(destination: SignUpView()) {
                        Text("Sign Up")
                            .fontWeight(.semibold)
                            .foregroundColor(.blue)
                    }
                }
                .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
        }
        .navigationTitle("Log In")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showForgotPassword) {
            ForgotPasswordView()
        }
        .onChange(of: authViewModel.isAuthenticated) { _, isAuthenticated in
            if isAuthenticated {
                dismiss()
            }
        }
    }
}

#Preview {
    NavigationView {
        LoginView()
            .environmentObject(AuthViewModel())
    }
} 