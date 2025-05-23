//
//  SpendSync_ios_mocha_sUI_OAuth_RBDApp.swift
//  SpendSync-ios-mocha-sUI-OAuth-RBD
//
//  Created by srivatsa davuluri on 21/05/25.
//

import SwiftUI
import Foundation
import GoogleSignIn

@main
struct SpendSync_ios_mocha_sUI_OAuth_RBDApp: App {
    @AppStorage("darkModeEnabled") private var darkModeEnabled: Bool = false
    @StateObject private var authViewModel = AuthViewModel()
    
    init() {
        // Initialize the APIClient directly
        // Since we have APIClient as a class in the same module, we don't need imports
        let apiClient = APIClient.self
        apiClient.initialize()
        
        // Configure Google Sign-In
        configureGoogleSignIn()
    }
    
    private func configureGoogleSignIn() {
        // This method is called automatically at app startup
        // No need to call Firebase.configure() since we're using standalone Google Sign-In
    }
    
    var body: some Scene {
        WindowGroup {
            Group {
                if authViewModel.isAuthenticated {
                    ContentView()
                        .environmentObject(authViewModel)
                } else {
                    LandingView()
                        .environmentObject(authViewModel)
                }
            }
            .preferredColorScheme(darkModeEnabled ? .dark : .light)
            .accentColor(.blue)
            .onOpenURL { url in
                // Handle the URL that the app was launched with
                GIDSignIn.sharedInstance.handle(url)
            }
        }
    }
}
