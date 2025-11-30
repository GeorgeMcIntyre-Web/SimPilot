# SimPilot Deployment Guide

SimPilot is designed to be deployed to **Cloudflare Pages** as a static site.

## Option A: Manual Setup (Recommended for Dale)

This is the simplest method. Cloudflare will automatically build and deploy whenever you push to `main`.

1.  **Log in** to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Go to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3.  Select the **SimPilot** repository.
4.  **Configure Build Settings**:
    - **Framework Preset**: `Vite`
    - **Build Command**: `npm run build`
    - **Build Output Directory**: `dist`
    - **Node Version**: Set `NODE_VERSION` environment variable to `20` (or match your local version).
5.  **Environment Variables** (Settings -> Environment variables):
    - `VITE_APP_ENV`: `production`
    - *(Optional)* `VITE_MSAL_CLIENT_ID`: Your Azure AD Client ID.
    - *(Optional)* `VITE_MSAL_TENANT_ID`: Your Azure AD Tenant ID.
    - *(Optional)* `VITE_MSAL_REDIRECT_URI`: Your production URL (e.g., `https://simpilot.pages.dev`).

## Option B: GitHub Actions (Advanced)

If you prefer to control deployment via GitHub Actions (e.g., to run tests before deploying), you can enable the `deploy-pages.yml` workflow.

1.  **Get Cloudflare Tokens**:
    - **API Token**: Create a token with "Edit Cloudflare Workers" permissions.
    - **Account ID**: Found in the Cloudflare Dashboard URL or sidebar.
2.  **Add Secrets to GitHub**:
    - Go to Repo Settings -> Secrets and variables -> Actions.
    - Add `CLOUDFLARE_API_TOKEN`.
    - Add `CLOUDFLARE_ACCOUNT_ID`.
3.  **Enable Workflow**:
    - Uncomment the triggers in `.github/workflows/deploy-pages.yml`.

## For Dale (Manager Notes)

- **One URL**: Once set up, you will have a single URL (e.g., `https://simpilot.pages.dev`) for the latest version.
- **Automatic Updates**: Any changes approved and merged into `main` will automatically appear on the site within minutes.
- **Safe Rollout**:
    - We develop on feature branches.
    - We merge to `main` only when ready.
    - If something breaks, Cloudflare allows instant "Rollback" to a previous deployment in the dashboard.
