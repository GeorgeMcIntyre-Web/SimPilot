# SimPilot: Cloudflare Pages Deployment Guide

This guide covers deploying SimPilot to Cloudflare Pages for production hosting.

---

## Quick Reference

| Setting                | Value           |
|------------------------|-----------------|
| **Build Command**      | `npm run build` |
| **Output Directory**   | `dist`          |
| **Node Version**       | 20 (LTS)        |
| **Framework Preset**   | Vite            |

---

## Prerequisites

- **Node.js**: v20 LTS (recommended) or v18+
- **npm**: v9+ (comes with Node.js)
- **Cloudflare Account**: Free tier is sufficient

---

## Deployment Options

### Option A: Git Integration (Recommended)

Cloudflare automatically builds and deploys when you push to your connected branch.

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create Application** → **Pages**
3. Click **Connect to Git** and select the SimPilot repository
4. Configure build settings:
   - **Production branch**: `main`
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Add environment variable:
   - **Variable name**: `NODE_VERSION`
   - **Value**: `20`
6. Click **Save and Deploy**

### Option B: Wrangler CLI

Deploy directly from your local machine or CI pipeline.

```bash
# Install Wrangler globally (one-time)
npm install -g wrangler

# Authenticate with Cloudflare (one-time)
wrangler login

# Build the app
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=simpilot
```

### Option C: GitHub Actions

The repository includes a pre-configured workflow at `.github/workflows/deploy-pages.yml`.

To enable:

1. Add secrets to your GitHub repository:
   - `CLOUDFLARE_API_TOKEN`: Create at Cloudflare → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"
   - `CLOUDFLARE_ACCOUNT_ID`: Found in Cloudflare Dashboard URL or sidebar
2. Uncomment the `on:` trigger in `.github/workflows/deploy-pages.yml`

---

## Environment Variables

### Build-Time Variables

Set these in Cloudflare Pages → Settings → Environment Variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_VERSION` | Yes | — | Set to `20` for Node.js 20 LTS |
| `VITE_APP_ENV` | No | `local` | Set to `production` for production builds |
| `VITE_SIMPILOT_DATA_ROOT` | No | `''` | Default data root path (typically left empty for browser-based file loading) |

### Optional: Microsoft Integration

If you're using Azure AD / SharePoint integration:

| Variable | Description |
|----------|-------------|
| `VITE_MSAL_CLIENT_ID` | Azure AD Application (Client) ID |
| `VITE_MSAL_TENANT_ID` | Azure AD Tenant ID |
| `VITE_MSAL_REDIRECT_URI` | Your production URL (e.g., `https://simpilot.pages.dev`) |
| `VITE_MSAL_SHAREPOINT_SITE_ID` | SharePoint Site ID |
| `VITE_MSAL_SHAREPOINT_DRIVE_ID` | SharePoint Drive ID |
| `VITE_MSAL_SHAREPOINT_ROOT_PATH` | SharePoint root path (default: `/Shared Documents/`) |

**Note**: If MS integration variables are not set, the feature is gracefully disabled—the app continues to work with local file uploads.

### Optional: SimBridge Integration

| Variable | Description |
|----------|-------------|
| `VITE_SIMBRIDGE_URL` | SimBridge service URL |

---

## Security: Cloudflare Access / Zero Trust

For internal or enterprise deployments, you can protect SimPilot behind **Cloudflare Access** (part of Cloudflare Zero Trust) to require authentication before users can access the app.

### Why Use Cloudflare Access?

- **No secrets in frontend code**: All authentication is handled at the edge by Cloudflare
- **SSO integration**: Works with Okta, Azure AD, Google Workspace, GitHub, and more
- **Per-request authentication**: Every request is authenticated, not just the initial page load
- **Audit logging**: Full access logs available in Cloudflare Dashboard

### Setting Up Cloudflare Access

1. **Enable Zero Trust** (if not already):
   - Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
   - Complete the onboarding wizard

2. **Add an Access Application**:
   - Navigate to **Access** → **Applications** → **Add an application**
   - Select **Self-hosted**
   - Configure:
     - **Application name**: `SimPilot`
     - **Session Duration**: Choose based on your security requirements (e.g., 24 hours)
     - **Application domain**: Your Cloudflare Pages URL (e.g., `simpilot.pages.dev`)

3. **Create an Access Policy**:
   - **Policy name**: e.g., `SimPilot Users`
   - **Action**: `Allow`
   - **Include rules**: Configure who can access:
     - **Emails**: Specific email addresses
     - **Emails ending in**: e.g., `@yourcompany.com`
     - **Identity provider groups**: SSO groups from your IdP
     - **Everyone**: (Not recommended for internal apps)

4. **Configure Identity Providers** (optional but recommended):
   - Go to **Settings** → **Authentication** → **Login methods**
   - Add your corporate SSO provider (Azure AD, Okta, Google Workspace, etc.)
   - This allows users to sign in with their existing corporate credentials

### Access Policy Examples

**Allow specific team members:**
```
Include:
  - Emails: alice@company.com, bob@company.com
```

**Allow entire organization:**
```
Include:
  - Emails ending in: @company.com
```

**Allow Azure AD group:**
```
Include:
  - Azure AD Groups: "SimPilot Users"
```

### Important Security Notes

> ⚠️ **NEVER store secret keys in frontend code**
>
> All `VITE_*` environment variables are bundled into the client-side JavaScript and are visible to anyone who can access the app.
>
> - ✅ Use Cloudflare Access for authentication
> - ✅ Use backend APIs with proper authentication for sensitive operations
> - ❌ Do NOT put API keys, database credentials, or secrets in `VITE_*` variables

### Verifying Access is Working

After configuring Access:

1. Open an incognito/private browser window
2. Navigate to your SimPilot URL
3. You should be redirected to the Cloudflare Access login page
4. After authenticating, you'll be redirected back to SimPilot

---

## Local Production Preview

Test the production build locally before deploying:

```bash
# Install dependencies (if not already done)
npm install

# Build the production bundle
npm run build

# Preview the production build
npm run preview
```

Open the URL shown in the terminal (typically `http://localhost:4173`).

---

## Troubleshooting

### Build Fails with "Node version not supported"

**Solution**: Add `NODE_VERSION=20` as an environment variable in Cloudflare Pages settings.

### Blank Page After Deployment

**Possible causes**:
- Incorrect build output directory (should be `dist`)
- Base path issues (verify `base: '/'` in `vite.config.ts`)

**Debug steps**:
1. Check Cloudflare Pages build logs
2. Verify the deployment includes `index.html`
3. Check browser console for 404 errors

### MS Integration Not Working

**Check**:
1. Environment variables are set correctly
2. Azure AD redirect URI matches your Cloudflare Pages URL
3. Azure AD app has correct permissions

### Cloudflare Access Issues

**Access policy not enforcing:**
- Verify the application domain matches exactly
- Check that the policy is set to "Allow" (not "Block" or "Bypass")
- Ensure Zero Trust is properly connected to your Cloudflare account

**SSO not working:**
- Verify your Identity Provider is correctly configured in Zero Trust
- Check the callback URL in your IdP matches Cloudflare's expected URL
- Review Cloudflare Access audit logs for authentication errors

---

## CI/CD Pipeline

The repository includes GitHub Actions workflows:

| Workflow | File | Purpose |
|----------|------|---------|
| CI | `.github/workflows/ci.yml` | Runs on every PR and push to `main`; builds and runs tests |
| Deploy | `.github/workflows/deploy-pages.yml` | Deploys to Cloudflare Pages on push to `main` |

---

## Post-Deployment Checklist

- [ ] Verify the site loads at your Cloudflare Pages URL
- [ ] Test navigation between pages
- [ ] Confirm demo data loads correctly
- [ ] Test file upload functionality
- [ ] (If using MS integration) Test Azure AD sign-in
- [ ] (If using Cloudflare Access) Verify authentication is required
- [ ] (If using Cloudflare Access) Test with an unauthorized user

---

## Architecture Notes

SimPilot is a **static SPA (Single Page Application)** that runs entirely in the browser:

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Edge                       │
│  ┌─────────────────┐    ┌────────────────────────────┐  │
│  │ Cloudflare      │    │ Cloudflare Pages           │  │
│  │ Access          │───▶│ (Static SPA)               │  │
│  │ (Auth at Edge)  │    │                            │  │
│  └─────────────────┘    └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ SimPilot React App                                 │ │
│  │  • Loads Excel files directly in browser          │ │
│  │  • Processes data client-side                     │ │
│  │  • No backend server required                     │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Key points:**
- All data processing happens in the browser
- No secret keys are stored in the frontend
- Cloudflare Access provides authentication at the edge
- The app can work offline once loaded (PWA-capable in future)

---

## Support

For deployment issues:
1. Check Cloudflare Pages build logs
2. Compare with local `npm run build` output
3. Verify environment variables are set correctly
4. Review Cloudflare Access audit logs (if using Zero Trust)
