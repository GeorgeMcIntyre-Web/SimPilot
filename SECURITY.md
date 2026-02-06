# Security

## Do not commit secrets

Never commit:

- `.env`, `.env.*` (except `.env.example`)
- API tokens, private keys, or client secrets
- exported data files that contain customer/company data
- generated artifacts (reports, `coverage/`, `playwright-report/`, `test-results/`, `dist/`, `node_modules/`)

`.gitignore` is configured to prevent common leaks, but review changes before merging.

## Client-side environment variables are public

This is a Vite SPA. Any environment variable prefixed with `VITE_` is embedded into the browser bundle.

- Treat **all** `VITE_*` values as public.
- Do **not** store secrets behind `VITE_*`.

If you need secret-backed behavior (API keys, signing, private upstreams), add a server-side component (e.g., Cloudflare Worker) and keep secrets there.

## Cloudflare deployment credentials

Production deploys use GitHub Actions + Cloudflare API token:

- GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

Use **least privilege** when creating the API token:

- Account: Cloudflare Pages: Edit

Prefer scoping the token to only the required account/resources.

## Access control (recommended for company use)

If SimPilot should not be publicly accessible:

- Put the Pages project behind **Cloudflare Access / Zero Trust**
- Enforce SSO and device posture as required by policy

## Dependency hygiene

- Dependabot is configured in `.github/dependabot.yml`
- Review dependency updates promptly, especially auth and parsing libraries

## Reporting

If you discover a vulnerability or accidental secret exposure, rotate credentials immediately and remove the data from the repo (and build logs/artifacts) before public disclosure.
