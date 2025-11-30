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
npm install
npm run dev
```

## How to Deploy (Cloudflare Pages)

1. Connect repo to Cloudflare Pages.
2. Build settings:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. The `public/_redirects` file handles SPA routing.

## Usage

- **Simulation Manager**: Use Dashboard to monitor project health and engineer workload.
- **Simulation Engineer**: Go to Projects -> Select Cell -> Update Checklists and log changes.