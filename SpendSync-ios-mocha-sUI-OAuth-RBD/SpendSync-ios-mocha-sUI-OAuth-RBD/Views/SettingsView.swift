import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    
    @State private var userName: String = ""
    @State private var userEmail: String = ""
    @State private var darkModeEnabled: Bool = false
    @State private var notificationsEnabled: Bool = true
    @State private var currencySymbol: String = "$"
    @State private var showingLogoutAlert: Bool = false
    
    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        ZStack {
                            Circle()
                                .fill(Color.gray.opacity(0.2))
                                .frame(width: 60, height: 60)
                            
                            Text(userInitials)
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.blue)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            if userName.isEmpty {
                                Text("Set Your Name")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                            } else {
                                Text(userName)
                                    .font(.headline)
                            }
                            
                            if userEmail.isEmpty {
                                Text("Set Your Email")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            } else {
                                Text(userEmail)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.leading, 8)
                    }
                    .padding(.vertical, 8)
                    
                    NavigationLink(destination: EditProfileView(userName: $userName, userEmail: $userEmail)) {
                        Text("Edit Profile")
                    }
                } header: {
                    Text("Profile")
                }
                
                Section {
                    Toggle("Dark Mode", isOn: $darkModeEnabled)
                    
                    Picker("Currency", selection: $currencySymbol) {
                        Text("Dollar ($)").tag("$")
                        Text("Euro (€)").tag("€")
                        Text("Pound (£)").tag("£")
                        Text("Yen (¥)").tag("¥")
                    }
                } header: {
                    Text("Appearance")
                }
                
                Section {
                    Toggle("Enable Notifications", isOn: $notificationsEnabled)
                } header: {
                    Text("Notifications")
                }
                
                Section {
                    NavigationLink(destination: PrivacyPolicyView()) {
                        Text("Privacy Policy")
                    }
                    
                    NavigationLink(destination: TermsOfServiceView()) {
                        Text("Terms of Service")
                    }
                    
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("About")
                }
                
                Section {
                    Button(action: {
                        showingLogoutAlert = true
                    }) {
                        HStack {
                            Spacer()
                            Text("Log Out")
                                .foregroundColor(.red)
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .alert(isPresented: $showingLogoutAlert) {
                Alert(
                    title: Text("Log Out"),
                    message: Text("Are you sure you want to log out?"),
                    primaryButton: .destructive(Text("Log Out")) {
                        // Perform logout action with auth view model
                        authViewModel.signOut()
                    },
                    secondaryButton: .cancel()
                )
            }
        }
    }
    
    private var userInitials: String {
        if userName.isEmpty {
            return "?"
        }
        
        let components = userName.components(separatedBy: " ")
        if components.count > 1, 
           let firstInitial = components.first?.first,
           let lastInitial = components.last?.first {
            return "\(firstInitial)\(lastInitial)"
        } else if let first = userName.first {
            return String(first)
        } else {
            return "?"
        }
    }
}

struct EditProfileView: View {
    @Environment(\.dismiss) private var dismiss: DismissAction
    @Binding var userName: String
    @Binding var userEmail: String
    
    @State private var tempName: String = ""
    @State private var tempEmail: String = ""
    
    var body: some View {
        Form {
            Section {
                TextField("Name", text: $tempName)
                TextField("Email", text: $tempEmail)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
            } header: {
                Text("Profile Information")
            }
            
            Section {
                Button("Save Changes") {
                    userName = tempName
                    userEmail = tempEmail
                    dismiss()
                }
                .frame(maxWidth: .infinity)
                .foregroundColor(.blue)
            }
        }
        .navigationTitle("Edit Profile")
        .onAppear {
            tempName = userName
            tempEmail = userEmail
        }
    }
}

struct PrivacyPolicyView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Privacy Policy")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.bottom, 8)
                
                Text("Last updated: May 21, 2025")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 16)
                
                Text("This is a sample privacy policy for the SpendSync app. In a real app, this would contain information about how user data is collected, stored, and used.")
                
                Text("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor velit eget magna facilisis, in commodo nisi faucibus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.")
            }
            .padding()
        }
        .navigationTitle("Privacy Policy")
    }
}

struct TermsOfServiceView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Terms of Service")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .padding(.bottom, 8)
                
                Text("Last updated: May 21, 2025")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 16)
                
                Text("This is a sample terms of service for the SpendSync app. In a real app, this would contain the legal agreement between the user and the app provider.")
                
                Text("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor velit eget magna facilisis, in commodo nisi faucibus. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.")
            }
            .padding()
        }
        .navigationTitle("Terms of Service")
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthViewModel())
} 