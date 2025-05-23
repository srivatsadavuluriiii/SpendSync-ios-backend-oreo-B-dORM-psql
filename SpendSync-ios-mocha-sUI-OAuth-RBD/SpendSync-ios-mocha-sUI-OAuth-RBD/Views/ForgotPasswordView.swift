import SwiftUI

struct ForgotPasswordView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @Environment(\.dismiss) private var dismiss: DismissAction
    
    @State private var email: String = ""
    @State private var showSuccessAlert: Bool = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Text("Reset Password")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Enter your email to receive a password reset link")
                            .font(.headline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .padding(.top, 40)
                    
                    // Email Field
                    InputField(
                        label: "Email",
                        placeholder: "Enter your email",
                        text: $email,
                        keyboardType: .emailAddress
                    )
                    .padding(.top, 24)
                    
                    // Reset Button
                    StyledButton(
                        title: authViewModel.isLoading ? "Sending..." : "Send Reset Link",
                        type: .primary,
                        isFullWidth: true,
                        disabled: authViewModel.isLoading || email.isEmpty
                    ) {
                        resetPassword()
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
                }
                .padding(.horizontal, 24)
            }
            .navigationTitle("Forgot Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .alert("Password Reset Link Sent", isPresented: $showSuccessAlert) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Check your email for instructions to reset your password.")
            }
        }
    }
    
    private func resetPassword() {
        authViewModel.resetPassword(email: email)
        
        // In a real app, you would only show this after successful API response
        showSuccessAlert = true
    }
}

#Preview {
    ForgotPasswordView()
        .environmentObject(AuthViewModel())
} 