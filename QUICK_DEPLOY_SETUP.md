# Quick Setup: GitHub Actions → Cloudflare Pages

## 3 Steps to Auto-Deploy

### Step 1: Get Cloudflare API Token (2 minutes)

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use **"Edit Cloudflare Workers"** template
4. Click **"Continue to summary"** → **"Create Token"**
5. **Copy the token** (save it!)

### Step 2: Get Account ID (30 seconds)

1. Go to: https://dash.cloudflare.com/
2. Right sidebar → **"Account ID"**
3. **Copy it**

### Step 3: Add GitHub Secrets (1 minute)

1. Go to: https://github.com/GeorgeMcIntyre-Web/SimPilot/settings/secrets/actions
2. Click **"New repository secret"**
3. Add:
   - Name: `CLOUDFLARE_API_TOKEN` → Value: (token from Step 1)
   - Name: `CLOUDFLARE_ACCOUNT_ID` → Value: (ID from Step 2)
4. Click **"Add secret"** for each

---

## Done! 🎉

Now every time you push to `main`:
1. GitHub Actions builds your app
2. Automatically deploys to Cloudflare Pages
3. Your site is live!

---

## Test It

```bash
git commit --allow-empty -m "Test deployment"
git push origin main
```

Then check: https://github.com/GeorgeMcIntyre-Web/SimPilot/actions

---

## Your Site Will Be At

`https://simpilot.pages.dev` (or your custom domain)

---

## Need Help?

See `SETUP_CI_CD.md` for detailed instructions.



