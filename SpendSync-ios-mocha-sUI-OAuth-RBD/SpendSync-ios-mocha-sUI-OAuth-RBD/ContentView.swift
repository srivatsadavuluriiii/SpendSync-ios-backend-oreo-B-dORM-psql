//
//  ContentView.swift
//  SpendSync-ios-mocha-sUI-OAuth-RBD
//
//  Created by srivatsa davuluri on 21/05/25.
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var authViewModel: AuthViewModel
    @State private var selectedTab: Tab = .home
    
    enum Tab {
        case home
        case stats
        case settings
    }
    
    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(Tab.home)
            
            StatsView()
                .tabItem {
                    Label("Statistics", systemImage: "chart.bar.fill")
                }
                .tag(Tab.stats)
            
            SettingsView()
                .environmentObject(authViewModel)
                .tabItem {
                    Label("Settings", systemImage: "gear")
        }
                .tag(Tab.settings)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthViewModel())
}
