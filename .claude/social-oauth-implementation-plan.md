# Social OAuth Implementation Plan

## Overview
Add social authentication for Google, Microsoft (Azure), and Apple to the existing Calc App. The app already has Google OAuth UI in place but needs the providers configured in Supabase and the UI needs to be fully functional.

## Current State
- **Google OAuth**: Partially implemented in UI, handler function exists but provider needs configuration
- **Microsoft OAuth**: Button exists but is disabled, no handler function
- **Apple OAuth**: Button exists but is disabled, no handler function
- **Branch**: `social-auth`

## Phase 1: Provider Configuration Setup

### 1.1 Google OAuth Setup
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create a new project or select existing
- [ ] Enable Google+ API
- [ ] Create OAuth 2.0 credentials (Web application type)
- [ ] Configure OAuth consent screen
  - Add app name, support email, and domain
  - Add scopes: email, profile
- [ ] Add authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] Obtain and save:
  - Client ID
  - Client Secret
- [ ] Configure in Supabase Dashboard under Authentication > Providers > Google

### 1.2 Microsoft (Azure) OAuth Setup
- [ ] Go to [Azure Portal](https://portal.azure.com)
- [ ] Navigate to Microsoft Entra ID (formerly Azure AD)
- [ ] Create new App Registration
  - Name: "Calc App" or similar
  - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
  - Redirect URI (Web): `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] After registration, note the Application (client) ID
- [ ] Create a client secret:
  - Go to Certificates & secrets
  - New client secret
  - Save the Value (not the Secret ID)
- [ ] Configure optional settings:
  - If needed, set specific tenant URL for organization-only access
  - Configure xms_edov claim for email verification (recommended)
- [ ] Configure in Supabase Dashboard under Authentication > Providers > Azure

### 1.3 Apple OAuth Setup
**Note: Requires Apple Developer account ($99/year)**

- [ ] Go to [Apple Developer Portal](https://developer.apple.com)
- [ ] Create an App ID:
  - Platform: iOS
  - Enable "Sign in with Apple" capability
- [ ] Create a Services ID (for web authentication):
  - Associate with your App ID
  - Configure domains and return URLs
  - Add domain: `supabase.co`
  - Add return URL: `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] Create and download a Sign in with Apple key:
  - Keep the .p8 file secure
  - Note the Key ID
- [ ] Gather required information:
  - Services ID (acts as client_id)
  - Team ID
  - Key ID
  - Private Key (.p8 file contents)
- [ ] Configure in Supabase Dashboard under Authentication > Providers > Apple

## Phase 2: Code Implementation

### 2.1 Update Login Component (`frontend/src/pages/Login.jsx`)
```javascript
// Add Microsoft OAuth handler
const handleMicrosoftSignIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${window.location.origin}/`,
      scopes: 'email',
    },
  })
  if (error) {
    setError(error.message)
  }
}

// Add Apple OAuth handler
const handleAppleSignIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: `${window.location.origin}/`,
    },
  })
  if (error) {
    setError(error.message)
  }
}
```

- [ ] Enable Apple button and add onClick handler
- [ ] Enable Microsoft button and add onClick handler
- [ ] Add loading states for OAuth buttons
- [ ] Improve error handling for OAuth-specific errors

### 2.2 Update SignUp Component (`frontend/src/pages/SignUpNew.jsx`)
- [ ] Add social OAuth buttons section (similar to Login page)
- [ ] Implement OAuth handlers for all three providers
- [ ] Ensure consistent UI/UX with login page
- [ ] Add "Or continue with" divider

### 2.3 Create OAuth Callback Handler
Create `frontend/src/pages/AuthCallback.jsx`:
```javascript
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallback() {
  const navigate = useNavigate()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      
      if (error) {
        console.error('Error during OAuth callback:', error)
        navigate('/login?error=' + encodeURIComponent(error.message))
      } else {
        navigate('/')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we redirect you.</p>
      </div>
    </div>
  )
}
```

### 2.4 Update App Router (`frontend/src/App.jsx`)
- [ ] Add route for `/auth/callback`
- [ ] Import AuthCallback component
- [ ] Ensure proper navigation flow

## Phase 3: Environment Configuration

### 3.1 Environment Variables
No additional environment variables needed - Supabase handles OAuth configuration server-side.

Current required variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Phase 4: Testing & Error Handling

### 4.1 Testing Checklist
- [ ] Test Google OAuth login
- [ ] Test Google OAuth signup
- [ ] Test Microsoft OAuth login
- [ ] Test Microsoft OAuth signup
- [ ] Test Apple OAuth login
- [ ] Test Apple OAuth signup
- [ ] Test account linking (existing email with different provider)
- [ ] Test error scenarios (cancelled auth, network errors)
- [ ] Test on different browsers
- [ ] Test on mobile devices

### 4.2 Error Handling Improvements
- [ ] Add specific error messages for:
  - OAuth provider unavailable
  - Email already exists with different provider
  - OAuth cancelled by user
  - Network timeout
- [ ] Add retry mechanism for transient failures
- [ ] Log errors to monitoring service (if applicable)

## Files to be Modified
1. `frontend/src/pages/Login.jsx` - Enable all OAuth providers
2. `frontend/src/pages/SignUpNew.jsx` - Add OAuth support
3. `frontend/src/App.jsx` - Add OAuth callback route

## Files to be Created
1. `frontend/src/pages/AuthCallback.jsx` - OAuth callback handler

## Important Security Considerations
1. **Never commit OAuth secrets to git**
2. **Use Supabase Dashboard for all OAuth configuration**
3. **Enable email verification for OAuth users if needed**
4. **Consider implementing account linking policies**
5. **Review Supabase RLS policies for OAuth users**

## Troubleshooting Guide

### Common Issues and Solutions

#### Google OAuth
- **Error: "redirect_uri_mismatch"**
  - Solution: Ensure the redirect URI in Google Console matches exactly: `https://<project-ref>.supabase.co/auth/v1/callback`
  
- **Error: "Access blocked: This app's request is invalid"**
  - Solution: Complete OAuth consent screen configuration in Google Console

#### Microsoft OAuth
- **Error: "AADSTS50011: The reply URL specified in the request does not match"**
  - Solution: Add the exact redirect URI in Azure App Registration
  
- **Error: Unverified email domains**
  - Solution: Configure xms_edov claim in Azure manifest

#### Apple OAuth
- **Error: "invalid_client"**
  - Solution: Verify Services ID and ensure domains are correctly configured
  
- **Error: "Invalid redirect_uri"**
  - Solution: Ensure domain and return URL are verified in Apple Developer Portal

## References
- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Azure OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-azure)
- [Supabase Apple OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Google Cloud Console](https://console.cloud.google.com)
- [Azure Portal](https://portal.azure.com)
- [Apple Developer Portal](https://developer.apple.com)

## Next Steps After Implementation
1. Configure OAuth providers in Supabase Dashboard
2. Deploy to staging environment for testing
3. Verify email linking and account merging works correctly
4. Add user profile management for OAuth users
5. Consider adding more providers if needed (GitHub, Discord, Twitter, etc.)
6. Implement refresh token handling if needed for API access
7. Add analytics to track OAuth usage

## Notes
- Apple OAuth requires a paid Apple Developer account ($99/year)
- Microsoft OAuth can be configured for specific tenant/organization if needed
- Google OAuth may require app verification for production use
- All providers support PKCE for enhanced security
- Consider implementing a fallback to magic link authentication