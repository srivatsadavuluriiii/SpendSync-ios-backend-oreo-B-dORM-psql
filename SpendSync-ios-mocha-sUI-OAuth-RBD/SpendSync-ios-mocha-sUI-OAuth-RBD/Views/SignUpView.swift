import SwiftUI

struct SignUpView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss: DismissAction
    
    @State private var name: String = ""
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var confirmPassword: String = ""
    
    @State private var passwordError: String? = nil
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Create Account")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Sign up to get started")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 40)
                
                // Sign Up Form
                VStack(spacing: 16) {
                    // Name Field
                    InputField(
                        label: "Name",
                        placeholder: "Enter your name",
                        text: $name
                    )
                    
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
                        placeholder: "Create a password",
                        text: $password,
                        isSecure: true
                    )
                    
                    // Confirm Password Field
                    InputField(
                        label: "Confirm Password",
                        placeholder: "Confirm your password",
                        text: $confirmPassword,
                        isSecure: true,
                        errorMessage: passwordError
                    )
                }
                .padding(.top, 24)
                
                // Terms & Privacy
                HStack(spacing: 0) {
                    Text("By signing up, you agree to our ")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                    
                    Text("Terms")
                        .font(.footnote)
                        .foregroundColor(.blue)
                    
                    Text(" and ")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                    
                    Text("Privacy Policy")
                        .font(.footnote)
                        .foregroundColor(.blue)
                }
                .padding(.top, 8)
                
                // Sign Up Button
                StyledButton(
                    title: authViewModel.isLoading ? "Creating Account..." : "Sign Up",
                    type: .primary,
                    isFullWidth: true,
                    disabled: authViewModel.isLoading || !isFormValid()
                ) {
                    signUp()
                }
                .padding(.top, 24)
                
                // Error Message
                if let error = authViewModel.error {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.caption)
                        .padding(.top, 8)
                }
                
                Spacer()
                
                // Log In Prompt
                HStack(spacing: 4) {
                    Text("Already have an account?")
                        .foregroundColor(.secondary)
                    
                    NavigationLink(destination: LoginView()) {
                        Text("Log In")
                            .fontWeight(.semibold)
                            .foregroundColor(.blue)
                    }
                }
                .padding(.bottom, 24)
            }
            .padding(.horizontal, 24)
        }
        .navigationTitle("Sign Up")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: authViewModel.isAuthenticated) { isAuthenticated in
            if isAuthenticated {
                dismiss()
            }
        }
    }
    
    private func isFormValid() -> Bool {
        if password != confirmPassword {
            passwordError = "Passwords do not match"
            return false
        }
        
        passwordError = nil
        return !name.isEmpty && !email.isEmpty && !password.isEmpty && password.count >= 6
    }
    
    private func signUp() {
        if isFormValid() {
            authViewModel.signUp(name: name, email: email, password: password)
        }
    }
}

#Preview {
    NavigationView {
        SignUpView()
            .environmentObject(AuthViewModel())
    }
} 