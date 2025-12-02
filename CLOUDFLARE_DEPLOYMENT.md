# Cloudflare Pages Deployment Guide

## Quick Deployment Steps

### Option 1: Git Integration (Recommended)

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com/
   - Navigate to: **Workers & Pages** → **Create Application** → **Pages**

2. **Connect Repository**
   - Click **"Connect to Git"**
   - Select **GitHub**
   - Authorize Cloudflare to access your repositories
   - Select **SimPilot** repository

3. **Configure Build Settings**
   - **Project name:** `simpilot` (or your preferred name)
   - **Production branch:** `main`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (leave empty or `/`)
   - **Node version:** `20`

4. **Environment Variables** (Optional - only if using)
   - Click **"Add variable"** for each:
     - `VITE_APP_ENV` = `production`
     - `VITE_GOOGLE_CLIENT_ID` = (your Google OAuth client ID, if using)
     - `VITE_MSAL_CLIENT_ID` = (your Azure AD client ID, if using)
     - `VITE_MSAL_TENANT_ID` = (your Azure AD tenant ID, if using)
     - `VITE_MSAL_REDIRECT_URI` = (your Cloudflare Pages URL, if using)
     - `VITE_SIMBRIDGE_URL` = (your SimBridge URL, if using)

5. **Deploy**
   - Click **"Save and Deploy"**
   - Wait for build to complete (usually 2-3 minutes)
   - Your site will be available at: `https://simpilot.pages.dev` (or your custom domain)

---

### Option 2: Manual Deploy (via Wrangler CLI)

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the project
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=simpilot
```

---

## Post-Deployment Verification

### Checklist

- [ ] Site loads at Cloudflare Pages URL
- [ ] All routes work (test navigation)
- [ ] No 404 errors
- [ ] Assets load correctly (CSS, JS files)
- [ ] Authentication works (or mock auth works)
- [ ] Demo data loads
- [ ] File upload works (if CORS allows)
- [ ] IndexedDB works (browser storage)
- [ ] Console shows no errors
- [ ] All pages render correctly

### Test These Features

1. **Dashboard** - Should load and show metrics
2. **Projects** - Should list all projects
3. **Data Loader** - Should allow file upload
4. **Demo Data** - Should load sample data
5. **Navigation** - All links should work
6. **Persistence** - Data should save to IndexedDB

---

## Custom Domain (Optional)

1. Go to your Pages project in Cloudflare Dashboard
2. Click **"Custom domains"**
3. Click **"Set up a custom domain"**
4. Enter your domain name
5. Follow DNS configuration instructions

---

## Troubleshooting

### Build Fails
- Check build logs in Cloudflare Dashboard
- Verify Node version is 20
- Ensure all dependencies are in `package.json`

### 404 Errors on Routes
- Verify `public/_redirects` file exists with: `/*  /index.html  200`
- Check Cloudflare Pages routing settings

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix
- Rebuild after adding variables
- Check variable names match exactly

### Assets Not Loading
- Check build output directory is `dist`
- Verify file paths in HTML
- Check browser console for 404 errors

---

## Monitoring

- **Build Logs:** Available in Cloudflare Dashboard → Pages → Your Project → Deployments
- **Analytics:** Available in Cloudflare Dashboard → Pages → Your Project → Analytics
- **Error Tracking:** Check browser console and Cloudflare logs

---

## Rollback

If deployment has issues:

1. Go to Cloudflare Dashboard → Pages → Your Project
2. Click **"Deployments"** tab
3. Find previous working deployment
4. Click **"Retry deployment"** or **"Rollback"**

---

## Success!

Once deployed, your SimPilot application will be live and accessible to users!

**Default URL:** `https://simpilot.pages.dev`  
**Custom Domain:** (if configured)

