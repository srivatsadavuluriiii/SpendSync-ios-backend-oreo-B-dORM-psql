//
//  SpendSync_ios_mocha_sUI_OAuth_RBDApp.swift
//  SpendSync-ios-mocha-sUI-OAuth-RBD
//
//  Created by srivatsa davuluri on 21/05/25.
//

import SwiftUI
import Foundation
import GoogleSignIn
// import Supabase - Package not properly installed yet

@main
struct SpendSync_ios_mocha_sUI_OAuth_RBDApp: App {
    @AppStorage("darkModeEnabled") private var darkModeEnabled: Bool = false
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var supabaseClient = SupabaseClient.shared
    
    init() {
        // Configure Google Sign-In
        configureGoogleSignIn()
        
        // Initialize the APIClient if still needed for backend communication
        let apiClient = APIClient.self
        apiClient.initialize()
    }
    
    private func configureGoogleSignIn() {
        // Configure Google Sign In with the client ID
        if let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let plist = NSDictionary(contentsOfFile: path),
           let clientId = plist["CLIENT_ID"] as? String {
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientId)
        } else {
            // Fallback to hardcoded client ID
            GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: Config.googleClientID)
        }
    }
    
    var body: some Scene {
        WindowGroup {
            SwiftUI.Group {
                if authViewModel.isAuthenticated {
                    ContentView()
                        .environmentObject(authViewModel)
                        .environmentObject(supabaseClient)
                } else {
                    LandingView()
                        .environmentObject(authViewModel)
                        .environmentObject(supabaseClient)
                }
            }
            .preferredColorScheme(darkModeEnabled ? .dark : .light)
            .accentColor(.blue)
            .onOpenURL { url in
                handleIncomingURL(url)
            }
        }
    }
    
    private func handleIncomingURL(_ url: URL) {
        print("📱 Received URL: \(url)")
        
        // Handle Google Sign-In callback
        if GIDSignIn.sharedInstance.handle(url) {
            print("✅ Google Sign-In handled the URL")
            return
        }
        
        // Handle Supabase OAuth callback
        if url.scheme == Config.appScheme && url.host == "auth" {
            print("🔐 Handling Supabase OAuth callback")
            authViewModel.handleOAuthCallback(url: url)
            return
        }
        
        // Handle other deep links
        print("🔗 Unhandled URL: \(url)")
    }
}
