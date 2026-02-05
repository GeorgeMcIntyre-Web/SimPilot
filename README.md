# SimPilot

**Simulation Management & Control** for Tecnomatix Process Simulate in Automotive BIW.

SimPilot is a control tower for the Simulation Department, tracking Projects, Cells, Checklists, Change Logs, and Equipment.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Deployment**: Cloudflare Pages

## Features

- **Dashboard**: Project health, At-Risk cells, Engineer workload.
- **Projects**: Area/Cell hierarchy, Status tracking.
- **Cell Control**: Checklists (PRE_SIM, FULL_SIM), Change Logs.
- **Equipment (Phase 2)**: Robots, Weld Guns, Stands, Assignments.

## How to Run Locally

```bash
npm ci
# optional
cp .env.example .env.local
npm run dev
```

## Scripts

```bash
npm run lint
npm run typecheck:all
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:ci
npm run build
```

## Environment Variables

See `.env.example`. Key points:

- `VITE_APP_ENV`: `local | preview | production`
- `VITE_*` variables are bundled into the client (treat as public)
- Optional integrations (Google OAuth, MSAL/SharePoint, SimBridge) are disabled when their env vars are missing

## Deployment (Cloudflare Pages)

- Company deployment + migration: `docs/DEPLOYMENT.md`
- Testing details: `docs/TESTING.md`
- Security guidance: `SECURITY.md`

## Usage

- **Simulation Manager**: Use Dashboard to monitor project health and engineer workload.
- **Simulation Engineer**: Go to Projects -> Select Cell -> Update Checklists and log changes.
