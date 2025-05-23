# Supabase Auth Setup Guide

This guide will help you set up Supabase Auth for the SpendSync backend with email/password, Google, and GitHub authentication.

## Prerequisites

1. A Supabase account and project
2. Google Cloud Console project (for Google OAuth)
3. GitHub OAuth App (for GitHub OAuth)

## 1. Supabase Project Setup

### Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in your project details
4. Wait for the project to be created

### Get Your Project Credentials

1. Go to your project settings
2. Navigate to "API" section
3. Copy the following values:
   - **Project URL** (SUPABASE_URL)
   - **Anon/Public Key** (SUPABASE_ANON_KEY)
   - **Service Role Key** (SUPABASE_SERVICE_ROLE_KEY)

## 2. Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:3000

# Other required variables
NODE_ENV=development
PORT=4000
SERVICE_AUTH_KEY=your-service-auth-key
```

## 3. Google OAuth Setup

### Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `https://your-project-id.supabase.co/auth/v1/callback`
   - `http://localhost:4000/api/v1/auth/callback` (for development)

### Configure in Supabase

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" → "Providers"
3. Enable "Google" provider
4. Enter your Google OAuth credentials:
   - **Client ID**
   - **Client Secret**
5. Save the configuration

## 4. GitHub OAuth Setup

### Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: SpendSync
   - **Homepage URL**: `http://localhost:4000` (or your domain)
   - **Authorization callback URL**: `https://your-project-id.supabase.co/auth/v1/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### Configure in Supabase

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" → "Providers"
3. Enable "GitHub" provider
4. Enter your GitHub OAuth credentials:
   - **Client ID**
   - **Client Secret**
5. Save the configuration

## 5. Email Authentication Setup

### Configure Email Settings

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" → "Settings"
3. Configure email settings:
   - **Enable email confirmations** (optional)
   - **Enable email change confirmations** (optional)
   - **Secure email change** (recommended)

### Email Templates (Optional)

You can customize email templates in the "Email Templates" section:
- Confirmation email
- Password reset email
- Email change confirmation

## 6. API Endpoints

Once configured, your authentication endpoints will be available at:

### Email/Password Authentication
- **Register**: `POST /api/v1/auth/register`
- **Login**: `POST /api/v1/auth/login`
- **Logout**: `POST /api/v1/auth/logout`

### Social Authentication
- **Google OAuth**: `GET /api/v1/auth/google`
- **GitHub OAuth**: `GET /api/v1/auth/github`
- **OAuth Callback**: `GET /api/v1/auth/callback`

### Session Management
- **Get Current User**: `GET /api/v1/auth/me`
- **Get Session**: `GET /api/v1/auth/session`
- **Refresh Session**: `POST /api/v1/auth/refresh`

## 7. Frontend Integration Example

### JavaScript/TypeScript Client

```javascript
// For frontend applications, use the browser client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project-id.supabase.co',
  'your-anon-key'
)

// Email/Password Sign Up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      name: 'John Doe'
    }
  }
})

// Email/Password Sign In
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Google OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'http://localhost:3000/dashboard'
  }
})

// GitHub OAuth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: 'http://localhost:3000/dashboard'
  }
})

// Sign Out
const { error } = await supabase.auth.signOut()

// Get Current User
const { data: { user } } = await supabase.auth.getUser()
```

### React Example

```jsx
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    })
  }

  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (user) {
    return (
      <div>
        <h1>Welcome, {user.user_metadata?.name || user.email}!</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
    )
  }

  return (
    <div>
      <h1>Login</h1>
      <button onClick={handleGoogleLogin}>Login with Google</button>
      <button onClick={handleGitHubLogin}>Login with GitHub</button>
    </div>
  )
}
```

## 8. Testing

### Test Email/Password Authentication

```bash
# Register a new user
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Social Authentication

- **Google OAuth**: Visit `http://localhost:4000/api/v1/auth/google`
- **GitHub OAuth**: Visit `http://localhost:4000/api/v1/auth/github`

## 9. Security Considerations

1. **Row Level Security (RLS)**: Enable RLS on your Supabase tables
2. **Environment Variables**: Never commit your Supabase keys to version control
3. **HTTPS**: Always use HTTPS in production
4. **CORS**: Configure CORS properly for your frontend domains
5. **Rate Limiting**: The backend includes rate limiting for auth endpoints

## 10. Troubleshooting

### Common Issues

1. **OAuth redirect mismatch**: Ensure redirect URIs match exactly in your OAuth provider settings
2. **CORS errors**: Check your Supabase project's allowed origins
3. **Session not persisting**: Ensure cookies are being set correctly
4. **Environment variables**: Double-check all environment variables are set correctly

### Debug Mode

Enable debug logging by setting:

```bash
LOG_LEVEL=debug
```

This will provide detailed logs for authentication requests and responses.

## 11. Production Deployment

### Environment Variables for Production

```bash
# Production Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Production Frontend URL
FRONTEND_URL=https://yourdomain.com

# Production settings
NODE_ENV=production
PORT=4000
```

### OAuth Redirect URLs for Production

Update your OAuth provider settings with production URLs:

- **Google**: `https://your-project-id.supabase.co/auth/v1/callback`
- **GitHub**: `https://your-project-id.supabase.co/auth/v1/callback`

## Support

For issues with Supabase Auth, refer to:
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
- [SpendSync GitHub Issues](https://github.com/your-repo/issues) 