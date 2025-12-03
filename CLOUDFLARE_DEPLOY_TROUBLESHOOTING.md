# Cloudflare Pages Deployment Troubleshooting

**Purpose:** Quick reference for diagnosing and fixing Cloudflare Pages deployment failures.

---

## Section 1: Current Configuration

### Node Version
- **package.json engines:** `"node": ">=20.0.0", "npm": ">=10.0.0"`
- **.nvmrc:** `20`
- **GitHub Actions:** Node 20 (see `.github/workflows/deploy-pages.yml`)

### Build Command
- **Command:** `npm run build`
- **Expands to:** `tsc && vite build`
- **TypeScript check:** Runs before Vite build
- **Output:** TypeScript errors will fail the build before Vite runs

### Build Output Directory
- **Vite config:** `outDir: 'dist'` (see `vite.config.ts`)
- **Cloudflare Pages:** Configured to serve from `dist/`
- **SPA routing:** `public/_redirects` file contains `/*  /index.html  200`

### Environment Variables (Optional)
- `VITE_APP_ENV` = `production` (set in GitHub Actions workflow)
- Other `VITE_*` vars are optional and gracefully degrade if missing

---

## Section 2: What to Capture from Cloudflare Logs

When a Cloudflare deployment fails, copy these specific lines from the build logs:

### 1. First Real Error Line
- **What to look for:** The first line that shows an actual error (not just warnings)
- **Example format:** `Error: ...` or `TypeError: ...` or `SyntaxError: ...`
- **Where to find:** Usually appears after dependency installation and before build completion
- **Copy:** The full error line including the error type and message

### 2. Node/npm Version Mismatch
- **What to look for:** Any line mentioning Node version or npm version
- **Example:** `Using Node.js v18.x.x` or `npm version 9.x.x`
- **Where to find:** Usually at the start of the build logs
- **Copy:** The exact version numbers shown

### 3. Missing Environment Variables
- **What to look for:** Lines mentioning undefined variables or missing env vars
- **Example:** `process.env.VITE_XXX is undefined` or `Cannot read property of undefined`
- **Where to find:** Usually during the build step
- **Copy:** The variable name and error context

### 4. Final Error Summary
- **What to look for:** The last error line before the build fails
- **Example:** `Error: Build failed with exit code 1` or `Command failed: npm run build`
- **Where to find:** Usually at the very end of the failed build log
- **Copy:** The final error summary line

---

## Section 3: Next Agent Playbook

Once you have the error lines from Section 2, follow this playbook:

### If Node Version Mismatch:
1. **Check Cloudflare Pages settings:**
   - Go to Cloudflare Dashboard → Pages → Your Project → Settings → Builds & deployments
   - Verify "Node version" is set to `20` (or add `NODE_VERSION=20` environment variable)
2. **If still failing:**
   - Update `.nvmrc` to match Cloudflare's available versions
   - Update `package.json` engines to match
   - Commit and push

### If Build Command Fails:
1. **TypeScript errors:**
   - Run `npm run build` locally to reproduce
   - Fix TypeScript errors
   - Commit and push
2. **Vite build errors:**
   - Check for missing dependencies in `package.json`
   - Verify `vite.config.ts` is valid
   - Check for path resolution issues

### If Missing Environment Variables:
1. **Check Cloudflare Pages environment variables:**
   - Go to Cloudflare Dashboard → Pages → Your Project → Settings → Environment variables
   - Add missing `VITE_*` variables if needed
   - Note: Most are optional and should gracefully degrade
2. **If variable is required:**
   - Add default/fallback in code (e.g., `process.env.VITE_XXX || 'default'`)
   - Commit and push

### If Output Directory Issue:
1. **Verify `dist/` exists after build:**
   - Check Cloudflare build logs for `dist/` directory creation
   - Verify `vite.config.ts` has `outDir: 'dist'`
2. **Check Cloudflare Pages build settings:**
   - Verify "Build output directory" is set to `dist`
   - Verify "Root directory" is `/` (or empty)

### If SPA Routing Fails (404s on routes):
1. **Verify `_redirects` file:**
   - Check `public/_redirects` exists with content: `/*  /index.html  200`
   - Verify file is copied to `dist/` during build
2. **Check Cloudflare Pages routing:**
   - Verify SPA routing is enabled in Cloudflare Pages settings
   - May need to add `_redirects` file if missing

### If Dependency Installation Fails:
1. **Check `package.json` and `package-lock.json`:**
   - Verify both files are committed to repo
   - Run `npm ci` locally to test
2. **Check for platform-specific issues:**
   - Some packages may not work on Cloudflare's build environment
   - Consider alternatives or polyfills

### General Debugging Steps:
1. **Reproduce locally:**
   ```bash
   npm ci
   npm run build
   ```
2. **Check build output:**
   - Verify `dist/` directory is created
   - Check `dist/index.html` exists
   - Verify assets are in `dist/assets/`
3. **Compare with working deployment:**
   - Check previous successful deployment logs
   - Compare configuration differences

---

## Quick Fix Checklist

When deployment fails, check in this order:

- [ ] Node version matches (20) in Cloudflare settings
- [ ] Build command is `npm run build`
- [ ] Output directory is `dist`
- [ ] `_redirects` file exists in `public/`
- [ ] `package.json` engines specify Node 20
- [ ] `.nvmrc` file exists with `20`
- [ ] Build succeeds locally (`npm run build`)
- [ ] No TypeScript errors locally
- [ ] Environment variables are set (if required)

---

## Common Error Patterns

### Pattern 1: "Cannot find module"
- **Cause:** Missing dependency or wrong Node version
- **Fix:** Check `package.json`, run `npm ci` locally, verify Node version

### Pattern 2: "TypeScript error"
- **Cause:** Type errors in code
- **Fix:** Run `tsc` locally, fix errors, commit

### Pattern 3: "Build output directory not found"
- **Cause:** Build failed or output directory misconfigured
- **Fix:** Check build logs, verify `dist/` is created, check Cloudflare settings

### Pattern 4: "404 on routes"
- **Cause:** SPA routing not configured
- **Fix:** Verify `_redirects` file exists and is in `public/`

---

## Notes

- **Don't guess:** Always wait for the actual error message from Cloudflare logs before making changes
- **Test locally first:** Reproduce the issue locally before committing fixes
- **Small changes:** Make minimal, focused fixes rather than large refactors
- **Document fixes:** Update this guide if you discover new common issues

