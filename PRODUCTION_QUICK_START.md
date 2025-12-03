# Production Deployment Quick Start

> For a high-level overview of v0.3, see [SIMPILOT_v0.3_MASTER_OVERVIEW.md](../SIMPILOT_v0.3_MASTER_OVERVIEW.md).

## 🚀 Quick Steps to Production

### Step 1: Test Locally (Production Build)

```bash
# 1. Build for production
npm run build

# 2. Preview production build
npm run preview

# 3. Open browser to http://localhost:4173
# 4. Test all features:
#    - Load demo data
#    - Navigate all pages
#    - Test file upload
#    - Check console for errors
```

### Step 2: Deploy to Cloudflare Pages

#### Option A: Git Integration (Recommended)

1. **Connect Repository**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Workers & Pages → Create Application → Pages
   - Connect to Git → Select SimPilot repository

2. **Configure Build Settings**
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`

3. **Set Environment Variables**
   - `NODE_VERSION` = `20`
   - `VITE_APP_ENV` = `production`
   - (Optional) Add Google OAuth / MS365 vars if using

4. **Deploy**
   - Click "Save and Deploy"
   - Wait for build to complete
   - Site will be available at `https://[project-name].pages.dev`

#### Option B: Manual Deploy (Testing)

```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Build and deploy
npm run build
wrangler pages deploy dist --project-name=simpilot
```

### Step 3: Verify Deployment

**Checklist:**
- [ ] Site loads at Cloudflare Pages URL
- [ ] All routes work (test navigation)
- [ ] Demo data loads
- [ ] File upload works
- [ ] No console errors
- [ ] Authentication works (or mock auth)

---

## 📋 Pre-Deployment Checklist

### Build Verification
- [x] Production build succeeds (`npm run build`)
- [x] No TypeScript errors
- [x] Preview server works (`npm run preview`)
- [ ] All pages load correctly
- [ ] All features work in preview

### Configuration
- [ ] Environment variables documented
- [ ] `.env.example` updated
- [ ] Production env vars ready for Cloudflare

### Testing
- [ ] Local production preview tested
- [ ] All routes accessible
- [ ] Data ingestion works
- [ ] No critical errors

---

## 🔧 Current Status

✅ **Ready:**
- Production build working
- All features implemented
- Authentication with fallback
- Data persistence working

⏳ **Testing:**
- Local production preview (in progress)
- Cloudflare deployment (next)

📝 **Documentation:**
- Production plan created
- Feature mapping complete
- Quick start guide ready

---

## 📚 Full Documentation

- **Detailed Plan**: `PRODUCTION_DEPLOYMENT_PLAN.md`
- **Feature Map**: `FEATURE_MAPPING.md`
- **Deployment Guide**: `docs/DEPLOYMENT_CLOUDFLARE_PAGES.md`

---

## 🎯 Success Criteria

Production is ready when:
1. ✅ Build succeeds
2. ⏳ Preview works locally
3. ⏳ Deployed to Cloudflare
4. ⏳ All features work on production URL


