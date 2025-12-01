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

---

## CI/CD Pipeline

The repository includes GitHub Actions workflows:

| Workflow | File | Purpose |
|----------|------|---------|
| CI | `.github/workflows/ci.yml` | Runs on every PR and push to `main`; builds and runs tests |
| Deploy | `.github/workflows/deploy-pages.yml` | (Disabled by default) Deploys to Cloudflare Pages on push to `main` |

---

## Post-Deployment Checklist

- [ ] Verify the site loads at your Cloudflare Pages URL
- [ ] Test navigation between pages
- [ ] Confirm demo data loads correctly
- [ ] Test file upload functionality
- [ ] (If using MS integration) Test Azure AD sign-in

---

## Support

For deployment issues:
1. Check Cloudflare Pages build logs
2. Compare with local `npm run build` output
3. Verify environment variables are set correctly
