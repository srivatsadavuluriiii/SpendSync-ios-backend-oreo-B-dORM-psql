import SwiftUI

struct LandingView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    
    var body: some View {
        NavigationView {
            VStack(spacing: 30) {
                // Logo and Welcome Text
                VStack(spacing: 16) {
                    Image(systemName: "dollarsign.circle.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 100, height: 100)
                        .foregroundColor(.blue)
                    
                    Text("Welcome to SpendSync")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Track, manage, and optimize your finances with ease")
                        .font(.headline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .padding(.top, 60)
                
                Spacer()
                
                // Auth Buttons
                VStack(spacing: 16) {
                    NavigationLink(destination: LoginView()) {
                        HStack {
                            Text("Log In")
                                .fontWeight(.semibold)
                            Spacer()
                            Image(systemName: "arrow.right")
                        }
                        .padding()
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    NavigationLink(destination: SignUpView()) {
                        HStack {
                            Text("Sign Up")
                                .fontWeight(.semibold)
                            Spacer()
                            Image(systemName: "arrow.right")
                        }
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(10)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    // Divider
                    HStack {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                        
                        Text("OR")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                        
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 1)
                    }
                    .padding(.vertical)
                    
                    // OAuth Buttons
                    Button(action: {
                        authViewModel.signInWithApple()
                    }) {
                        HStack {
                            Image(systemName: "apple.logo")
                                .font(.title3)
                            Text("Continue with Apple")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.systemGray6))
                        .foregroundColor(.primary)
                        .cornerRadius(10)
                    }
                    
                    Button(action: {
                        authViewModel.signInWithGoogle()
                    }) {
                        HStack {
                            Image(systemName: "g.circle.fill")
                                .font(.title3)
                            Text("Continue with Google")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.systemGray6))
                        .foregroundColor(.primary)
                        .cornerRadius(10)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
    }
}

#Preview {
    LandingView()
        .environmentObject(AuthViewModel())
} 