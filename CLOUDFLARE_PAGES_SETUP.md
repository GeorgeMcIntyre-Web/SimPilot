# Cloudflare Pages Setup - Step by Step

## ⚠️ Make Sure You're on PAGES, Not Workers!

If you see "Deploy command: npx wrangler deploy" or "API token" fields, you're in the **Workers** flow. You need **Pages** instead.

---

## Correct Navigation Path

1. **Go to:** https://dash.cloudflare.com/
2. **Click:** "Workers & Pages" in left sidebar
3. **Click:** "Pages" tab (NOT "Workers")
4. **Click:** "Create a project" button (blue button, top right)

---

## Configuration Settings

Once you're on the **Pages** setup screen, use these settings:

### Basic Settings

- **Project name:** `simpilot` (or `SimPilot`)
- **Production branch:** `main`
- **Framework preset:** Select **"Vite"** from dropdown
  - This will auto-fill build settings correctly

### Build Settings (Auto-filled if you select Vite)

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/` (leave empty or `/`)

### Advanced Settings (Optional)

- **Node version:** `20` (if available)
- **Environment variables:** (only if needed)
  - `VITE_APP_ENV` = `production`
  - Add others only if using Google OAuth, MS365, etc.

---

## What You Should See

**Correct (Pages):**
- ✅ Framework preset dropdown (Vite, React, etc.)
- ✅ Build command field
- ✅ Build output directory field
- ✅ "Save and Deploy" button

**Wrong (Workers):**
- ❌ "Deploy command: npx wrangler deploy"
- ❌ "API token" fields
- ❌ "Variable name/value" fields

---

## If You're Stuck on Workers Screen

1. **Go back** (click "Back" button)
2. **Look for tabs** at the top: "Workers" vs "Pages"
3. **Click "Pages" tab**
4. **Then click "Create a project"**

---

## After Configuration

1. Click **"Save and Deploy"**
2. Wait 2-3 minutes for build
3. Your site will be at: `https://simpilot.pages.dev`

---

## Need Help?

If you're still seeing Workers setup:
- Make sure you clicked "Pages" tab, not "Workers"
- Try going directly to: https://dash.cloudflare.com/pages
- Or start fresh: Workers & Pages → Pages → Create a project

