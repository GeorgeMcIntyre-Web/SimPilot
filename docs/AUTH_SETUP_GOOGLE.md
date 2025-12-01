# Google Authentication Setup

This guide explains how to set up Google OAuth for SimPilot.

## Overview

SimPilot uses Google Identity Services via `@react-oauth/google` for authentication. The authentication is SPA-only (no backend required) and uses the OAuth 2.0 implicit flow.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "SimPilot")
4. Click "Create"

### 2. Enable OAuth Consent Screen

1. In the Google Cloud Console, go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (or Internal if using Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: SimPilot
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click "Save and Continue"
6. On the Scopes page, click "Add or Remove Scopes" and add:
   - `openid`
   - `email`
   - `profile`
7. Click "Save and Continue"
8. Add any test users if in testing mode
9. Click "Save and Continue"

### 3. Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. Select **Web application** as the application type
4. Enter a name (e.g., "SimPilot Web Client")
5. Add **Authorized JavaScript origins**:
   - For local development: `http://localhost:5173`
   - For production: Your Cloudflare Pages domain (e.g., `https://simpilot.pages.dev`)
6. Add **Authorized redirect URIs**:
   - For local development: `http://localhost:5173`
   - For production: Your Cloudflare Pages domain
7. Click "Create"
8. Copy the **Client ID** (looks like `xxx.apps.googleusercontent.com`)

### 4. Configure SimPilot

#### Local Development

1. Create a `.env.local` file in the project root:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

3. Restart the development server:
   ```bash
   npm run dev
   ```

#### Cloudflare Pages Deployment

1. Go to your Cloudflare Pages project
2. Navigate to **Settings** → **Environment variables**
3. Add a new variable:
   - **Name**: `VITE_GOOGLE_CLIENT_ID`
   - **Value**: Your Google OAuth Client ID
4. Redeploy your site for changes to take effect

## Troubleshooting

### "VITE_GOOGLE_CLIENT_ID is not set" Error

This error appears when the environment variable is missing. Make sure:
- You have a `.env.local` file with the correct variable
- You've restarted the dev server after adding the variable
- For production, the variable is set in Cloudflare Pages

### "popup_closed_by_user" Error

This typically means:
- The user closed the popup before completing sign-in
- A browser popup blocker is interfering

### "origin_not_allowed" or CORS Errors

This means your JavaScript origin isn't authorized. Check:
- Your domain is listed in "Authorized JavaScript origins" in Google Cloud Console
- You're using the correct protocol (http vs https)
- There are no trailing slashes in the origin

### Login Works Locally but Not in Production

1. Verify the production domain is in "Authorized JavaScript origins"
2. Check the environment variable is set in Cloudflare Pages
3. Redeploy after adding environment variables

## Security Notes

- The Client ID is public and safe to expose in frontend code
- Session data is stored in `sessionStorage` and cleared when the browser closes
- Tokens expire after 1 hour by default
- For sensitive operations, consider adding backend token validation

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    SimPilot SPA                        │
├────────────────────────────────────────────────────────┤
│  AuthProvider (wraps entire app)                       │
│  └── GoogleOAuthProvider                               │
│      └── AuthProviderInner (manages state)             │
│          ├── sessionStorage (persists session)         │
│          └── useGoogleLogin (handles OAuth flow)       │
├────────────────────────────────────────────────────────┤
│  AuthGate (guards app content)                         │
│  ├── Loading state → LoadingScreen                     │
│  ├── Not authenticated → SignInScreen                  │
│  └── Authenticated → App content                       │
├────────────────────────────────────────────────────────┤
│  useAuth hook (access auth state anywhere)             │
│  └── { user, isAuthenticated, login, logout, ... }     │
└────────────────────────────────────────────────────────┘
```

## Swapping to Another Provider

The auth architecture is designed to be provider-neutral:

1. `AuthTypes.ts` defines provider-agnostic types
2. `AuthContext.tsx` is the only file with Google-specific code
3. To add another provider (e.g., Microsoft, Auth0):
   - Add the provider ID to `AuthProviderId` type
   - Create a new `AuthContext` implementation
   - Update `AuthProvider` to use the new implementation

## Related Files

- `src/auth/AuthContext.tsx` - Main authentication context
- `src/auth/AuthGate.tsx` - Authentication gate component
- `src/auth/AuthTypes.ts` - Type definitions
- `src/auth/googleConfig.ts` - Google configuration
- `src/auth/useAuth.ts` - Hook for consuming auth state
- `src/auth/index.ts` - Module exports
