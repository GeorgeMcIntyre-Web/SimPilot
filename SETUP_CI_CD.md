# CI/CD Setup - GitHub Actions → Cloudflare Pages

This guide sets up automatic deployment: when you push to `main`, GitHub Actions will build and deploy to Cloudflare Pages.

---

## Step 1: Get Cloudflare API Token

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use **"Edit Cloudflare Workers"** template, OR create custom token with:
   - **Permissions:**
     - Account: `Cloudflare Pages:Edit`
     - Zone: (if using custom domain)
   - **Account Resources:** Include - All accounts
   - **Zone Resources:** (if using custom domain)
4. Click **"Continue to summary"** → **"Create Token"**
5. **Copy the token** (you'll only see it once!)

---

## Step 2: Get Cloudflare Account ID

1. Go to: https://dash.cloudflare.com/
2. Select your account (if you have multiple)
3. In the right sidebar, find **"Account ID"**
4. **Copy the Account ID**

---

## Step 3: Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/GeorgeMcIntyre-Web/SimPilot
2. Click **"Settings"** tab
3. Click **"Secrets and variables"** → **"Actions"**
4. Click **"New repository secret"**
5. Add these secrets:

   **Secret 1:**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: (paste your API token from Step 1)

   **Secret 2:**
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: (paste your Account ID from Step 2)

6. Click **"Add secret"** for each

---

## Step 4: Create Cloudflare Pages Project (First Time Only)

### Option A: Via Dashboard (Recommended)

1. Go to: https://dash.cloudflare.com/pages
2. Click **"Create a project"**
3. Select **"Connect to Git"**
4. Choose **GitHub** → Authorize → Select **SimPilot** repo
5. Configure:
   - **Project name:** `simpilot`
   - **Production branch:** `main`
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Deploy command:** (LEAVE EMPTY - GitHub Actions will handle deployment)
6. Click **"Save and Deploy"**

### Option B: Via Wrangler CLI

```bash
# Create the project (one-time setup)
wrangler pages project create simpilot
```

---

## Step 5: Push Code to Trigger Deployment

The workflow is already set up! Just push to `main`:

```bash
git add .
git commit -m "Trigger Cloudflare deployment"
git push origin main
```

---

## How It Works

1. **You push to `main`** → GitHub Actions triggers
2. **GitHub Actions:**
   - Checks out code
   - Installs dependencies
   - Builds the project (`npm run build`)
   - Deploys to Cloudflare Pages
3. **Cloudflare Pages:** Your site is live!

---

## Manual Deployment (If Needed)

You can also trigger manually:

1. Go to: https://github.com/GeorgeMcIntyre-Web/SimPilot/actions
2. Click **"Deploy to Cloudflare Pages"** workflow
3. Click **"Run workflow"** → **"Run workflow"**

---

## Troubleshooting

### Build Fails
- Check Actions logs: https://github.com/GeorgeMcIntyre-Web/SimPilot/actions
- Verify Node version is 20
- Check build command is correct

### Deployment Fails
- Verify `CLOUDFLARE_API_TOKEN` secret is set correctly
- Verify `CLOUDFLARE_ACCOUNT_ID` secret is set correctly
- Check Cloudflare project name matches (`simpilot`)

### Site Not Updating
- Check deployment status in Cloudflare Dashboard
- Verify the workflow ran successfully
- Check Cloudflare Pages → Deployments tab

---

## Workflow File Location

The workflow is at: `.github/workflows/deploy-cloudflare.yml`

It automatically:
- ✅ Runs on every push to `main`
- ✅ Builds the project
- ✅ Deploys to Cloudflare Pages
- ✅ Uses your Cloudflare API token securely

---

## Benefits

- ✅ **Automatic:** Every push to `main` = new deployment
- ✅ **Fast:** Builds in ~30 seconds
- ✅ **Secure:** API tokens stored as GitHub secrets
- ✅ **Reliable:** Builds in clean environment
- ✅ **Trackable:** See all deployments in GitHub Actions

---

## Next Steps

1. Add the GitHub secrets (Step 3)
2. Create Cloudflare Pages project (Step 4)
3. Push to `main` and watch it deploy!



