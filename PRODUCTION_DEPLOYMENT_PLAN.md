# Production Deployment Plan - SimPilot

## Overview

This plan covers getting all current SimPilot features production-ready, testing locally first, then deploying to Cloudflare Pages.

**Goal**: Deploy a fully functional, production-ready version of SimPilot with all features working.

---

## Phase 1: Feature Inventory & Status

### ✅ Implemented Features

#### Core Pages (12 routes)
1. **Dashboard** (`/dashboard`) - Project health, metrics, at-risk cells
2. **Dale Console** (`/dale-console`) - Manager cockpit view
3. **Projects** (`/projects`) - Project list and hierarchy
4. **Project Detail** (`/projects/:projectId`) - Individual project view
5. **Cell Detail** (`/cells/:cellId`) - Individual cell management
6. **Engineers** (`/engineers`) - Engineer workload tracking
7. **Tools** (`/tools`) - Equipment/tools management
8. **Data Loader** (`/data-loader`) - File ingestion (Local, M365, Demo)
9. **Warnings** (`/warnings`) - Ingestion warnings and issues
10. **Changes** (`/changes`) - Change log viewer
11. **Readiness Board** (`/readiness`) - Readiness tracking
12. **Timeline** (`/timeline/:projectId`) - Project timeline view

#### Data Ingestion
- ✅ Local file upload (Excel files)
- ✅ Microsoft 365 integration (SharePoint/OneDrive)
- ✅ Demo data loading
- ✅ Schema-agnostic parsing
- ✅ Sheet sniffer (auto-detects sheet types)
- ✅ Column role detector
- ✅ Multi-file processing
- ✅ Warning system

#### Data Management
- ✅ In-memory store (coreStore)
- ✅ IndexedDB persistence (auto-save)
- ✅ Snapshot system
- ✅ Change log tracking
- ✅ Cross-reference engine
- ✅ Health scoring

#### Authentication
- ✅ Google OAuth (optional, falls back to mock for dev)
- ✅ Auth gate component
- ✅ Session management

#### UI/UX
- ✅ Responsive layout
- ✅ Theme support (light/dark)
- ✅ Loading states
- ✅ Error handling
- ✅ Navigation
- ✅ Dev diagnostics

---

## Phase 2: Production Readiness Checklist

### 🔍 Pre-Deployment Testing

#### Build & Compilation
- [ ] Production build succeeds without errors
- [ ] No TypeScript errors
- [ ] No console errors in production build
- [ ] All assets load correctly
- [ ] Source maps work (for debugging)

#### Environment Configuration
- [ ] Environment variables documented
- [ ] `.env.example` file complete
- [ ] Production env vars configured
- [ ] Google OAuth configured (if using)
- [ ] MS365 integration configured (if using)

#### Functionality Testing
- [ ] All routes load without errors
- [ ] Navigation works correctly
- [ ] Data ingestion works (local files)
- [ ] Data ingestion works (M365 - if configured)
- [ ] Demo data loads correctly
- [ ] Dashboard displays data correctly
- [ ] All pages render without crashes
- [ ] Persistence (IndexedDB) works
- [ ] Auth flow works (or mock auth works)

#### Performance
- [ ] Build output size reasonable
- [ ] Initial load time acceptable
- [ ] No memory leaks
- [ ] Large file ingestion doesn't crash

#### Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Edge
- [ ] Works in Safari (if required)

---

## Phase 3: Local Production Testing

### Step 1: Production Build Verification

```bash
# Clean previous builds
rm -rf dist

# Build for production
npm run build

# Verify build output
ls -la dist/
```

**Checklist:**
- [ ] `dist/index.html` exists
- [ ] `dist/assets/` contains JS and CSS files
- [ ] No build errors or warnings
- [ ] Build completes successfully

### Step 2: Local Production Preview

```bash
# Preview production build
npm run preview
```

**Testing Steps:**
1. [ ] Open `http://localhost:4173` (or shown port)
2. [ ] Verify app loads without errors
3. [ ] Test authentication (or mock auth)
4. [ ] Load demo data
5. [ ] Navigate to all pages
6. [ ] Test data ingestion with local files
7. [ ] Verify IndexedDB persistence
8. [ ] Check browser console for errors
9. [ ] Test on different browsers

### Step 3: Production Build Analysis

```bash
# Analyze bundle size
npm run build -- --analyze  # if configured
```

**Check:**
- [ ] Bundle sizes are reasonable
- [ ] No duplicate dependencies
- [ ] Code splitting working (if implemented)

### Step 4: Environment Variable Testing

**Test with production environment:**
```bash
# Set production env
export VITE_APP_ENV=production
npm run build
npm run preview
```

**Verify:**
- [ ] App works with `VITE_APP_ENV=production`
- [ ] Optional features gracefully degrade if env vars missing
- [ ] No hardcoded localhost URLs

---

## Phase 4: Cloudflare Pages Deployment

### Step 1: Pre-Deployment Configuration

#### Environment Variables Setup
Configure in Cloudflare Pages Dashboard:

**Required:**
- `NODE_VERSION` = `20`
- `VITE_APP_ENV` = `production`

**Optional (if using):**
- `VITE_GOOGLE_CLIENT_ID` = (your Google OAuth client ID)
- `VITE_MSAL_CLIENT_ID` = (your Azure AD client ID)
- `VITE_MSAL_TENANT_ID` = (your Azure AD tenant ID)
- `VITE_MSAL_REDIRECT_URI` = (your Cloudflare Pages URL)
- `VITE_MSAL_SHAREPOINT_SITE_ID` = (if using SharePoint)
- `VITE_MSAL_SHAREPOINT_DRIVE_ID` = (if using SharePoint)
- `VITE_SIMBRIDGE_URL` = (if using SimBridge)

#### Build Settings
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Root Directory**: `/` (root)

### Step 2: Initial Deployment

**Option A: Git Integration (Recommended)**
1. [ ] Connect GitHub repo to Cloudflare Pages
2. [ ] Configure build settings
3. [ ] Set environment variables
4. [ ] Deploy from `main` branch
5. [ ] Verify deployment succeeds

**Option B: Manual Deploy (Testing)**
```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
npm run build
wrangler pages deploy dist --project-name=simpilot
```

### Step 3: Post-Deployment Verification

**Checklist:**
- [ ] Site loads at Cloudflare Pages URL
- [ ] All routes work (test navigation)
- [ ] No 404 errors
- [ ] Assets load correctly
- [ ] Authentication works (if configured)
- [ ] Demo data loads
- [ ] File upload works (if CORS allows)
- [ ] IndexedDB works (browser storage)
- [ ] Console shows no errors

### Step 4: Production Testing

**Test All Features:**
1. [ ] **Dashboard**: Loads and displays data
2. [ ] **Dale Console**: Manager view works
3. [ ] **Projects**: List and detail pages work
4. [ ] **Cells**: Cell detail pages work
5. [ ] **Engineers**: Engineer page works
6. [ ] **Tools**: Tools page works
7. [ ] **Data Loader**: 
   - [ ] Local file upload works
   - [ ] M365 integration works (if configured)
   - [ ] Demo data loads
8. [ ] **Warnings**: Warnings page displays correctly
9. [ ] **Changes**: Change log works
10. [ ] **Readiness**: Readiness board works
11. [ ] **Timeline**: Timeline view works

---

## Phase 5: Known Issues & Fixes Needed

### Critical Issues

1. **Google OAuth Required** (FIXED ✅)
   - Status: Made optional with mock auth fallback
   - Action: Already implemented

2. **Sheet Selection for Simulation Files** (FIXED ✅)
   - Status: Now prefers SIMULATION sheet over DATA sheet
   - Action: Already implemented

3. **Robot List Parser Headers** (PARTIAL ⚠️)
   - Status: Some robot files can't find headers
   - Action: Added new header patterns, may need more

### Non-Critical Issues

1. **Large Bundle Size Warning**
   - Status: Some chunks > 500KB
   - Impact: Performance (acceptable for MVP)
   - Action: Can optimize later with code splitting

2. **Many Ingestion Warnings**
   - Status: Some rows skipped due to format issues
   - Impact: Data still loads, just warnings
   - Action: Improve parsers over time

---

## Phase 6: Deployment Checklist

### Pre-Deployment
- [ ] All tests pass locally
- [ ] Production build succeeds
- [ ] Local preview works correctly
- [ ] Environment variables documented
- [ ] `.env.example` updated
- [ ] README updated with deployment info

### Deployment
- [ ] Cloudflare Pages project created
- [ ] Git repository connected
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Initial deployment successful
- [ ] Site accessible at production URL

### Post-Deployment
- [ ] All pages load correctly
- [ ] Navigation works
- [ ] Data ingestion works
- [ ] Authentication works (or mock)
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Mobile responsive (if required)

---

## Phase 7: Rollback Plan

If deployment fails or issues found:

1. **Cloudflare Pages Rollback**
   - Go to Cloudflare Dashboard
   - Navigate to Pages → Deployments
   - Select previous working deployment
   - Click "Retry deployment" or "Rollback"

2. **Quick Fix Process**
   - Fix issue locally
   - Test with `npm run build && npm run preview`
   - Commit and push to `main`
   - Cloudflare auto-deploys new version

---

## Phase 8: Monitoring & Maintenance

### Post-Launch Monitoring

- [ ] Monitor Cloudflare Pages build logs
- [ ] Check browser console for errors (user reports)
- [ ] Monitor IndexedDB usage (browser storage limits)
- [ ] Track file upload success rates
- [ ] Monitor authentication issues

### Maintenance Tasks

- [ ] Regular dependency updates
- [ ] Security patches
- [ ] Performance optimization
- [ ] Parser improvements based on real-world files
- [ ] User feedback integration

---

## Quick Reference Commands

### Local Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run unit tests
npm run test:e2e     # Run E2E tests
```

### Production Build
```bash
npm run build        # Creates dist/ folder
npm run preview      # Test production build locally
```

### Cloudflare Deployment
```bash
# Manual deploy
wrangler pages deploy dist --project-name=simpilot

# Or use Git integration (automatic on push to main)
```

---

## Success Criteria

✅ **Production Ready When:**
1. Production build succeeds without errors
2. All pages load and function correctly
3. Data ingestion works (local files)
4. Authentication works (or graceful fallback)
5. No critical console errors
6. Site deployed to Cloudflare Pages
7. All features accessible and working

---

## Next Steps After Production

1. **Shared Database** (Future Phase)
   - Design database schema
   - Implement Cloudflare D1 + Workers
   - Add API endpoints
   - Update app to use shared storage

2. **User Management** (Future Phase)
   - Multi-user support
   - Permissions/roles
   - User-specific data views

3. **Real-time Updates** (Future Phase)
   - WebSocket connections
   - Live data sync
   - Collaborative features

---

## Notes

- **Current State**: All features are implemented and working locally
- **Data Storage**: Currently browser-only (IndexedDB), not shared between users
- **Authentication**: Optional Google OAuth, falls back to mock for development
- **Deployment**: Static site, no backend required (for now)
- **Future**: Will need backend for shared multi-user database

