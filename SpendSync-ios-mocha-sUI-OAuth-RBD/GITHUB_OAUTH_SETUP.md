# GitHub OAuth Setup for SpendSync

## 🔧 **GitHub OAuth App Configuration**

### **Step 1: Create GitHub OAuth App**

1. **Go to GitHub Settings**:
   - Navigate to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **"OAuth Apps"** → **"New OAuth App"**

2. **Configure OAuth App**:
   ```
   Application name: SpendSync iOS App
   Homepage URL: https://www.spendsync.com
   Authorization callback URL: https://wjuvjdmazdhqhcnvufrl.supabase.co/auth/v1/callback
   ```

3. **Get Credentials**:
   - **Client ID**: Copy this value
   - **Client Secret**: Generate and copy this value

### **Step 2: Configure Supabase**

1. **Go to Supabase Dashboard**:
   - Navigate to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project → **Authentication** → **Providers**

2. **Enable GitHub Provider**:
   - Toggle **GitHub** to enabled
   - **Client ID**: Paste your GitHub OAuth App Client ID
   - **Client Secret**: Paste your GitHub OAuth App Client Secret
   - **Redirect URL**: `https://wjuvjdmazdhqhcnvufrl.supabase.co/auth/v1/callback`

### **Step 3: Update iOS App Configuration**

Update your `Config.swift` file:

```swift
static let githubClientID = "your-actual-github-client-id"
```

### **Step 4: Test GitHub OAuth**

1. **Build and run** your iOS app
2. **Tap "Sign in with GitHub"** button
3. **Authorize** the app in Safari
4. **Verify** successful redirect back to app

## 🔐 **OAuth Flow**

```
iOS App → Supabase Auth → GitHub OAuth → User Authorization → Callback → iOS App
```

## 🚨 **Important Notes**

- **Callback URL** must match exactly in GitHub and Supabase
- **Test on physical device** for best OAuth experience
- **Check Safari** for any authorization errors
- **Monitor Supabase logs** for debugging

## 📱 **Usage in iOS App**

```swift
// Trigger GitHub OAuth
authViewModel.signInWithGitHub()

// Handle successful authentication
if authViewModel.isAuthenticated {
    // User is signed in with GitHub
    let user = authViewModel.currentUser
    let profile = authViewModel.userProfile
}
```

Your GitHub OAuth integration is now ready! 🎉 