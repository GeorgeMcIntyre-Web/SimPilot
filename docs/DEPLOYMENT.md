# Deployment (Company Cloudflare)

## Platform decisions

- **Cloudflare Pages: Yes** — static SPA hosting for the Vite/React build (`dist/`).
- **Cloudflare Workers: No (default)** — no server-side secrets or API proxy required today.
  - Add a Worker only if you need a secret-backed API (e.g., private upstreams, API keys, or request signing).
- **Cloudflare R2 / D1: No (default)** — no persistence layer is required for the current client-only app.

## Environments (local / preview / production)

SimPilot uses `VITE_APP_ENV` to distinguish environments:

- `local` (default): developer machine (`npm run dev`)
- `preview`: CI + preview deployments
- `production`: Cloudflare production deployment

GitHub Actions sets:

- CI: `VITE_APP_ENV=preview`
- Deploy: `VITE_APP_ENV=production`

## Environment variables

### Rule: `VITE_*` is public

Anything prefixed with `VITE_` is bundled into the client. Treat these values as **public**, not secrets.

### Common variables

- `VITE_APP_ENV` — `local | preview | production`
- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID (public)
- `VITE_SIMBRIDGE_URL` — optional external integration base URL (public)

### Microsoft 365 / SharePoint (optional)

If you enable MS integration, configure:

- `VITE_MSAL_CLIENT_ID` (public)
- `VITE_MSAL_TENANT_ID` (public)
- `VITE_MSAL_REDIRECT_URI` (public)
- `VITE_MSAL_SHAREPOINT_SITE_ID` (public)
- `VITE_MSAL_SHAREPOINT_DRIVE_ID` (public)
- `VITE_MSAL_SHAREPOINT_ROOT_PATH` (public, e.g. `/Shared Documents/SimPilot`)

See `.env.example` for the full list.

## Routing / redirects (SPA)

Cloudflare Pages is configured for SPA routing via:

- `public/_redirects` — `/*  /index.html  200`
- `public/_headers` — security + caching headers

## GitHub → Cloudflare Pages (company account)

This repo deploys via GitHub Actions (`.github/workflows/deploy.yml`), using the company Cloudflare account.

### Required GitHub secrets

- `CLOUDFLARE_API_TOKEN` — Cloudflare API token (company-owned)
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID (company-owned)

### Optional GitHub variable

- `CLOUDFLARE_PAGES_PROJECT` — Pages project name (defaults to `simpilot` in the workflow)

### Cloudflare token scopes (least privilege)

Create a token scoped to:

- Account: **Cloudflare Pages: Edit**
- (Optional) Account: **Account Settings: Read** (if your setup requires reading account metadata)

Avoid “All zones / All resources” where possible.

## Migration steps (personal → company Cloudflare)

1. **Create a new Pages project** in the company Cloudflare account (recommended) with the target name (e.g. `simpilot`).
2. **Configure GitHub repo secrets** in the company-owned repo:
   - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
3. **Run a manual deploy** from GitHub Actions (`Deploy (Cloudflare Pages)` → `Run workflow`) to validate credentials and build output.
4. **Attach the production custom domain** to the company Pages project.
5. **Cut over DNS** (lower TTL first).

## Rollback plan (no downtime)

Keep the personal Pages project intact until production is stable.

- **Rollback trigger:** production deploy failure, severe client errors, auth misconfig, or broken routing.
- **Rollback action:** revert DNS back to the personal Pages project hostname.
- **Fast path:** lower TTL before cutover so DNS rollback propagates quickly.
