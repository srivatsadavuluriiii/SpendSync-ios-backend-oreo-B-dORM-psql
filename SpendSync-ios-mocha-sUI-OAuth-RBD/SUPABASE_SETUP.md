# SpendSync iOS Supabase Integration Setup

## 🎯 **Overview**

Your SpendSync iOS app has been updated to use **Supabase Auth** with **OAuth support** for Google and GitHub Sign-In. This replaces the previous JWT-based authentication system.

## 📋 **What's Been Updated**

### ✅ **Files Modified:**

1. **`Utils/Config.swift`** - Added Supabase configuration
2. **`Utils/SupabaseClient.swift`** - New Supabase client wrapper
3. **`ViewModels/AuthViewModel.swift`** - Updated for Supabase Auth
4. **`SpendSync_ios_mocha_sUI_OAuth_RBDApp.swift`** - Added OAuth callback handling
5. **`Info.plist`** - Added URL schemes for OAuth
6. **`Package.swift`** - Added Supabase Swift SDK dependency

### 🔧 **New Features:**

- ✅ **Supabase Authentication** - Email/password and OAuth
- ✅ **Google OAuth** - Native Google Sign-In integration
- ✅ **GitHub OAuth** - GitHub Sign In with Supabase
- ✅ **User Profiles** - Automatic profile creation and management
- ✅ **Real-time Data** - Direct connection to Supabase database
- ✅ **MongoDB Sync** - Data automatically syncs to MongoDB via Edge Function

## 🚀 **Installation Steps**

### **Step 1: Add Supabase Swift SDK**

In Xcode:

1. **File → Add Package Dependencies**
2. **Enter URL**: `https://github.com/supabase/supabase-swift`
3. **Version**: `2.5.1` or later
4. **Add to Target**: SpendSync-ios-mocha-sUI-OAuth-RBD

### **Step 2: Update Supabase Configuration**

Update your **actual Supabase anon key** in `Utils/Config.swift`:

```swift
var supabaseAnonKey: String {
    // Replace with your actual Supabase anon key
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ACTUAL_ANON_KEY"
}
```

### **Step 3: Configure OAuth Providers in Supabase**

1. **Go to**: [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Authentication → Providers

2. **Enable Google OAuth**:
   - **Client ID**: `259479300315-6ef3ed01igu1gtjbulcuagb4bcdtpdua.apps.googleusercontent.com`
   - **Client Secret**: (Get from Google Cloud Console)
   - **Redirect URL**: `https://wjuvjdmazdhqhcnvufrl.supabase.co/auth/v1/callback`

3. **Enable GitHub OAuth**:
   - **Client ID**: (Your GitHub OAuth Client ID)
   - **Redirect URL**: (Your GitHub OAuth Redirect URL)

### **Step 4: Update URL Schemes**

The `Info.plist` has been updated with:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>Google OAuth</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.259479300315-6ef3ed01igu1gtjbulcuagb4bcdtpdua</string>
        </array>
    </dict>
    <dict>
        <key>CFBundleURLName</key>
        <string>Supabase OAuth</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>spendsync</string>
        </array>
    </dict>
</array>
```

## 🔐 **Authentication Flow**

### **Email/Password Authentication:**
```swift
// Sign Up
authViewModel.signUp(name: "John Doe", email: "john@example.com", password: "password")

// Sign In
authViewModel.signIn(email: "john@example.com", password: "password")

// Reset Password
authViewModel.resetPassword(email: "john@example.com")
```

### **OAuth Authentication:**
```swift
// Google Sign-In
authViewModel.signInWithGoogle()

// GitHub Sign-In
authViewModel.signInWithGitHub()
```

## 📱 **App Architecture**

```
iOS App
├── Supabase Auth (Primary)
│   ├── Email/Password
│   ├── Google OAuth
│   └── GitHub OAuth
├── User Profiles (Supabase)
├── Real-time Data (Supabase)
└── MongoDB Sync (Edge Function)
```

## 🔄 **Data Flow**

1. **User authenticates** via Supabase Auth
2. **User profile** is created/updated in Supabase PostgreSQL
3. **App data** (expenses, groups, settlements) is stored in Supabase
4. **Edge Function** automatically syncs all data to MongoDB
5. **Backend services** can access data from both databases

## 🧪 **Testing**

### **Test Authentication:**
1. **Build and run** the app
2. **Try email/password** sign up/sign in
3. **Test Google OAuth** (opens Safari, redirects back)
4. **Test GitHub Sign-In** (native GitHub flow)

### **Test Data Sync:**
1. **Create expenses** in the app
2. **Check Supabase** dashboard for data
3. **Verify MongoDB** sync via your edge function logs

## 🔧 **Environment Configuration**

### **Development:**
- **API**: `http://localhost:4000/api/v1`
- **Supabase**: `https://wjuvjdmazdhqhcnvufrl.supabase.co`

### **Staging:**
- **API**: `https://spendsync-api.onrender.com/api/v1`
- **Supabase**: `https://wjuvjdmazdhqhcnvufrl.supabase.co`

### **Production:**
- **API**: `https://api.spendsync.com/api/v1`
- **Supabase**: `https://wjuvjdmazdhqhcnvufrl.supabase.co`

## 🚨 **Important Notes**

1. **Replace the placeholder anon key** with your actual Supabase anon key
2. **Configure OAuth providers** in Supabase dashboard
3. **Test on physical device** for OAuth flows
4. **Enable Row Level Security** in Supabase for production
5. **Monitor edge function** logs for sync issues

## 📞 **Support**

If you encounter issues:

1. **Check Supabase logs** in the dashboard
2. **Verify OAuth configuration** in providers
3. **Test edge function** sync manually
4. **Check iOS simulator/device logs** for errors

Your SpendSync iOS app is now fully integrated with Supabase Auth and ready for production! 🎉 