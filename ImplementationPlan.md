# Implementation Plan - SimPilot

> [!NOTE]
> **Quick Start for New Dev / Agent**
>
> **How to run:**
> ```bash
> npm install
> npm run dev
> ```
>
> **See the system in action (< 2 mins):**
> 1. **Load Demo:** Go to Data Loader -> Demo Data -> Click "Load STLA Sample".
> 2. **Explore:** Open **Dashboard** to see metrics, then **Dale Console** for the manager view.
> 3. **Deep Dive:** Check **Warnings**, **Engineers**, and **Tools** pages.
>
> **Test Live Ingestion:**
> - Go to **Data Loader** -> **Local Files**.
> - Select sample STLA Excel files (Simulation Status, Robot List, etc.).
> - Click **Ingest Files**.
> - (Optional) Use **Microsoft 365** tab if env vars are configured.

## Overview

**SimPilot** is a "Simulation Control Board" designed for simulation managers like **Dale**. It bridges the gap between the existing "source of truth" (Excel trackers, SharePoint lists) and a modern, reactive web application.

**Primary Persona: Dale**
- Extremely busy simulation manager.
- **Cannot** do manual data cleaning, schema tweaking, or complex setup.
- Needs a "heads-up display" of project health, engineer workload, and critical warnings.
- The tool must work *for* him, not require him to work for it.

## Architecture Snapshot (Current State)

The application is a **client-side only** React app (Vite) with a clean separation of concerns:

- **Domain & Ingestion** (`src/domain`, `src/ingestion`)
  - Pure TypeScript logic.
  - `coreStore.ts`: Reactive in-memory store (Zustand-like but custom/simple).
  - `ingestionCoordinator.ts`: Main entry point for all data loading.
- **UI Routes** (`src/app/routes`)
  - `DashboardPage.tsx`: High-level metrics.
  - `DaleConsole.tsx`: Manager-focused view (The "Cockpit").
  - `DataLoaderPage.tsx`: Ingestion UI (Local, M365, Demo).
  - `WarningsPage.tsx`, `EngineersPage.tsx`, `ToolsPage.tsx`, `ProjectsPage.tsx`.
- **Shared UI** (`src/app`, `src/ui`, `src/components`)
  - Reusable components (`Card`, `Button`, `Badge`, etc.).
  - Layouts (`LayoutShell`, `EssentialModeLayout`).
- **Integrations** (`src/integrations/ms`)
  - **Optional** Microsoft 365 integration (MSAL, Graph API).
  - Feature-gated by environment variables.

**Data Source Agnostic:**
The system feeds the **same** in-memory store regardless of the source:
- Local Excel Uploads
- SharePoint / OneDrive (via Graph API)
- Built-in Demo Data

## User Flows (Optimised for Dale)

### 1. First-Time Use
1.  **Load Demo Scenario**: User lands on Data Loader or Dashboard, clicks "Load Demo".
2.  **Explore Dashboard**: Sees immediate charts, project status, and "simulation health".
3.  **Dale Console**: Visits the dedicated manager view to see "Red" cells and engineer bottlenecks.

### 2. Normal Daily Use
1.  **Open App**: Loads SimPilot.
2.  **Data Loader**:
    - Selects "Microsoft 365" (if connected) -> Pick latest status file.
    - OR Selects "Local Files" -> Drag & drop latest Excel export.
3.  **Refresh**: System parses, validates, and updates the store in memory.
4.  **Review**:
    - Checks **Dashboard** for trends.
    - Checks **Dale Console** for urgent items.
    - Checks **Warnings** to see if data quality is degrading.
    - Checks **Engineers** to balance workload.

> [!IMPORTANT]
> **Zero Config Required**: Dale does not need to map columns, define schemas, or clean data. The parsers handle real-world messiness (multi-row headers, blank lines, fuzzy matching).

## Implemented Phases (1–6 Summary)

- **Phase 1: MVP Scaffold**: Domain types, core store, and basic UI skeleton.
- **Phase 2: Excel Ingestion**: Robust parsing for STLA Status & Equipment sheets (Robots/Tools).
- **Phase 3: Logic & Metrics**: Engineer workload calculations, project/cell status aggregation.
- **Phase 4: Architecture Hardening**: Demo data injection, preparation for MS integration.
- **Phase 5: Microsoft Integration**: Optional MSAL login, SharePoint file picker, Demo Mode UI.
- **Phase 6: Dale Console**: The "Manager's Cockpit", Warnings Center, User Preferences, Dev Diagnostics.
- **Phase 7: E2E Testing**: Playwright setup, Demo flow verification (Pass), Local Ingest verification (Partial).
- **Phase 8: Deployment**: CI/CD via GitHub Actions, Cloudflare Pages wiring, centralized Environment Config.

## Key Technical Decisions

- **Guard Clauses**: Strict "early return" style. No `else` or `else if`.
- **Browser-Only Storage**: Currently runs entirely in browser memory. Refreshes clear data (by design for MVP).
- **Ingestion Strategy**: "Append + Override". New data updates existing entities based on IDs/Names.
- **Microsoft Optionality**: The app works 100% offline/local if MS env vars are missing.
- **Agent-Friendly Code**: Explicit types, clear naming, small functions.

## How the Current System Works (Deep-Dive)

### Ingestion Flow
1.  **Source**: User selects files in `DataLoaderPage` (Local input or MS Graph selection).
2.  **Coordinator**: `ingestFiles(files)` in `src/ingestion/ingestionCoordinator.ts` is called.
3.  **Parsing**:
    - `excelUtils.ts` reads raw bytes/blobs.
    - Parsers (`simulationStatusParser.ts`, `robotListParser.ts`, etc.) convert rows to Domain Entities.
4.  **Linking**: `applyIngestedData.ts` links Robots/Tools to Cells/Areas using fuzzy matching.
5.  **Store Update**: `coreStore.setData(...)` triggers React updates.

### Demo Mode
- **Scenarios**: Defined in `src/ingestion/demo_data/scenarios.ts` (e.g., `STLA_SAMPLE`).
- **Loading**: `loadDemoScenario(id)` simulates the file ingestion process using pre-parsed JSON/Object data to populate the store instantly.

### Dale Console (`src/app/routes/DaleConsole.tsx`)
- **Purpose**: High-density information for decision making.
- **Data Hooks**: Consumes `useProjects`, `useEngineers`, `useWarnings` from `coreStore`.
- **Components**: Uses `StatCard`, `ActivityFeed` (mocked/real), and `ProjectHealth` widgets.

### Warnings Page (`src/app/routes/WarningsPage.tsx`)
- **Source**: `ingestionWarning` array in `coreStore`.
- **Logic**: Grouped by `filename` or `type`.
- **UX**: Non-blocking. Bad data generates a warning, not a crash.

### Microsoft Integration (`src/integrations/ms`)
- **Auth**: `msAuthClient.ts` handles popup/redirect login.
- **Graph**: `msGraphClient.ts` fetches drive items and downloads file content as `Blob`.
- **Bridge**: Blobs are converted to `File` objects and passed to `ingestFiles`, keeping the domain layer unaware of Microsoft.

### Environment Configuration (`src/config/env.ts`)
- **Centralized Config**: All env vars are read via `envConfig`.
- **Variables**:
  - `VITE_APP_ENV`: 'local' | 'preview' | 'production'
  - `VITE_MSAL_CLIENT_ID`: Optional MS Client ID.
  - `VITE_MSAL_TENANT_ID`: Optional MS Tenant ID.
  - `VITE_MSAL_REDIRECT_URI`: Redirect URI (default localhost).
  - `VITE_SIMBRIDGE_URL`: URL for the SimBridge API Gateway (default http://localhost:5000).

### SimBridge Integration (`src/integrations/simbridge`)
- **Client**: `SimBridgeClient.ts` handles communication with the SimBridge API Gateway.
- **Features**:
  - Connection status check.
  - Loading studies (.psz files).
  - Getting/Setting signal values.
- **UI**: Integrated into `DataLoaderPage.tsx` as a new tab.

### CI Pipeline (`.github/workflows/ci.yml`)
- **Triggers**: Push/PR to `main`.
- **Jobs**:
  - `build-and-test`:
    - Installs dependencies (`npm ci`).
    - Builds app (`npm run build`).
    - Installs Playwright browsers.
    - Runs E2E tests (`npm run test:e2e`).
- **Artifacts**: Uploads Playwright report on failure/success.

### Deployment (`DEPLOYMENT.md`)
- **Cloudflare Pages**: Recommended static host.
- **Configuration**:
  - Build Command: `npm run build`
  - Output Dir: `dist`
  - Env Vars: `VITE_APP_ENV=production`
- **Automation**:
  - Option A: Direct Cloudflare-Git integration (Simplest).
  - Option B: GitHub Actions via `deploy-pages.yml` (Advanced).

- **Phase 7: E2E Testing**: Implement Playwright tests for the critical "Load -> View" flows.
- **Phase 9: Persistence**: Browser-based persistence (IndexedDB) implemented.
  - `StoreSnapshot` schema defined.
  - `PersistenceService` abstraction and `IndexedDbService` implementation.
# Implementation Plan - SimPilot

> [!NOTE]
> **Quick Start for New Dev / Agent**
>
> **How to run:**
> ```bash
> npm install
> npm run dev
> ```
>
> **See the system in action (< 2 mins):**
> 1. **Load Demo:** Go to Data Loader -> Demo Data -> Click "Load STLA Sample".
> 2. **Explore:** Open **Dashboard** to see metrics, then **Dale Console** for the manager view.
> 3. **Deep Dive:** Check **Warnings**, **Engineers**, and **Tools** pages.
>
> **Test Live Ingestion:**
> - Go to **Data Loader** -> **Local Files**.
> - Select sample STLA Excel files (Simulation Status, Robot List, etc.).
> - Click **Ingest Files**.
> - (Optional) Use **Microsoft 365** tab if env vars are configured.

## Overview

**SimPilot** is a "Simulation Control Board" designed for simulation managers like **Dale**. It bridges the gap between the existing "source of truth" (Excel trackers, SharePoint lists) and a modern, reactive web application.

**Primary Persona: Dale**
- Extremely busy simulation manager.
- **Cannot** do manual data cleaning, schema tweaking, or complex setup.
- Needs a "heads-up display" of project health, engineer workload, and critical warnings.
- The tool must work *for* him, not require him to work for it.

## Architecture Snapshot (Current State)

The application is a **client-side only** React app (Vite) with a clean separation of concerns:

- **Domain & Ingestion** (`src/domain`, `src/ingestion`)
  - Pure TypeScript logic.
  - `coreStore.ts`: Reactive in-memory store (Zustand-like but custom/simple).
  - `ingestionCoordinator.ts`: Main entry point for all data loading.
- **UI Routes** (`src/app/routes`)
  - `DashboardPage.tsx`: High-level metrics.
  - `DaleConsole.tsx`: Manager-focused view (The "Cockpit").
  - `DataLoaderPage.tsx`: Ingestion UI (Local, M365, Demo).
  - `WarningsPage.tsx`, `EngineersPage.tsx`, `ToolsPage.tsx`, `ProjectsPage.tsx`.
- **Shared UI** (`src/app`, `src/ui`, `src/components`)
  - Reusable components (`Card`, `Button`, `Badge`, etc.).
  - Layouts (`LayoutShell`, `EssentialModeLayout`).
- **Integrations** (`src/integrations/ms`)
  - **Optional** Microsoft 365 integration (MSAL, Graph API).
  - Feature-gated by environment variables.

**Data Source Agnostic:**
The system feeds the **same** in-memory store regardless of the source:
- Local Excel Uploads
- SharePoint / OneDrive (via Graph API)
- Built-in Demo Data

## User Flows (Optimised for Dale)

### 1. First-Time Use
1.  **Load Demo Scenario**: User lands on Data Loader or Dashboard, clicks "Load Demo".
2.  **Explore Dashboard**: Sees immediate charts, project status, and "simulation health".
3.  **Dale Console**: Visits the dedicated manager view to see "Red" cells and engineer bottlenecks.

### 2. Normal Daily Use
1.  **Open App**: Loads SimPilot.
2.  **Data Loader**:
    - Selects "Microsoft 365" (if connected) -> Pick latest status file.
    - OR Selects "Local Files" -> Drag & drop latest Excel export.
3.  **Refresh**: System parses, validates, and updates the store in memory.
4.  **Review**:
    - Checks **Dashboard** for trends.
    - Checks **Dale Console** for urgent items.
    - Checks **Warnings** to see if data quality is degrading.
    - Checks **Engineers** to balance workload.

> [!IMPORTANT]
> **Zero Config Required**: Dale does not need to map columns, define schemas, or clean data. The parsers handle real-world messiness (multi-row headers, blank lines, fuzzy matching).

## Implemented Phases (1–6 Summary)

- **Phase 1: MVP Scaffold**: Domain types, core store, and basic UI skeleton.
- **Phase 2: Excel Ingestion**: Robust parsing for STLA Status & Equipment sheets (Robots/Tools).
- **Phase 3: Logic & Metrics**: Engineer workload calculations, project/cell status aggregation.
- **Phase 4: Architecture Hardening**: Demo data injection, preparation for MS integration.
- **Phase 5: Microsoft Integration**: Optional MSAL login, SharePoint file picker, Demo Mode UI.
- **Phase 6: Dale Console**: The "Manager's Cockpit", Warnings Center, User Preferences, Dev Diagnostics.
- **Phase 7: E2E Testing**: Playwright setup, Demo flow verification (Pass), Local Ingest verification (Partial).
- **Phase 8: Deployment**: CI/CD via GitHub Actions, Cloudflare Pages wiring, centralized Environment Config.

## Key Technical Decisions

- **Guard Clauses**: Strict "early return" style. No `else` or `else if`.
- **Browser-Only Storage**: Currently runs entirely in browser memory. Refreshes clear data (by design for MVP).
- **Ingestion Strategy**: "Append + Override". New data updates existing entities based on IDs/Names.
- **Microsoft Optionality**: The app works 100% offline/local if MS env vars are missing.
- **Agent-Friendly Code**: Explicit types, clear naming, small functions.

## How the Current System Works (Deep-Dive)

### Ingestion Flow
1.  **Source**: User selects files in `DataLoaderPage` (Local input or MS Graph selection).
2.  **Coordinator**: `ingestFiles(files)` in `src/ingestion/ingestionCoordinator.ts` is called.
3.  **Parsing**:
    - `excelUtils.ts` reads raw bytes/blobs.
    - Parsers (`simulationStatusParser.ts`, `robotListParser.ts`, etc.) convert rows to Domain Entities.
4.  **Linking**: `applyIngestedData.ts` links Robots/Tools to Cells/Areas using fuzzy matching.
5.  **Store Update**: `coreStore.setData(...)` triggers React updates.

### Demo Mode
- **Scenarios**: Defined in `src/ingestion/demo_data/scenarios.ts` (e.g., `STLA_SAMPLE`).
- **Loading**: `loadDemoScenario(id)` simulates the file ingestion process using pre-parsed JSON/Object data to populate the store instantly.

### Dale Console (`src/app/routes/DaleConsole.tsx`)
- **Purpose**: High-density information for decision making.
- **Data Hooks**: Consumes `useProjects`, `useEngineers`, `useWarnings` from `coreStore`.
- **Components**: Uses `StatCard`, `ActivityFeed` (mocked/real), and `ProjectHealth` widgets.

### Warnings Page (`src/app/routes/WarningsPage.tsx`)
- **Source**: `ingestionWarning` array in `coreStore`.
- **Logic**: Grouped by `filename` or `type`.
- **UX**: Non-blocking. Bad data generates a warning, not a crash.

### Microsoft Integration (`src/integrations/ms`)
- **Auth**: `msAuthClient.ts` handles popup/redirect login.
- **Graph**: `msGraphClient.ts` fetches drive items and downloads file content as `Blob`.
- **Bridge**: Blobs are converted to `File` objects and passed to `ingestFiles`, keeping the domain layer unaware of Microsoft.

### Environment Configuration (`src/config/env.ts`)
- **Centralized Config**: All env vars are read via `envConfig`.
- **Variables**:
  - `VITE_APP_ENV`: 'local' | 'preview' | 'production'
  - `VITE_MSAL_CLIENT_ID`: Optional MS Client ID.
  - `VITE_MSAL_TENANT_ID`: Optional MS Tenant ID.
  - `VITE_MSAL_REDIRECT_URI`: Redirect URI (default localhost).

### CI Pipeline (`.github/workflows/ci.yml`)
- **Triggers**: Push/PR to `main`.
- **Jobs**:
  - `build-and-test`:
    - Installs dependencies (`npm ci`).
    - Builds app (`npm run build`).
    - Installs Playwright browsers.
    - Runs E2E tests (`npm run test:e2e`).
- **Artifacts**: Uploads Playwright report on failure/success.

### Deployment (`DEPLOYMENT.md`)
- **Cloudflare Pages**: Recommended static host.
- **Configuration**:
  - Build Command: `npm run build`
  - Output Dir: `dist`
  - Env Vars: `VITE_APP_ENV=production`
- **Automation**:
  - Option A: Direct Cloudflare-Git integration (Simplest).
  - Option B: GitHub Actions via `deploy-pages.yml` (Advanced).

- **Phase 7: E2E Testing**: Implement Playwright tests for the critical "Load -> View" flows.
- **Phase 9: Persistence**: Browser-based persistence (IndexedDB) implemented.
  - `StoreSnapshot` schema defined.
  - `PersistenceService` abstraction and `IndexedDbService` implementation.
  - Auto-save on change (debounced) / Auto-load on startup.
- **Phase 10: Write-Back** (Completed): Controlled engineer assignment editing.
  - `ChangeLog` domain model and `coreStore` integration.
  - UI for editing in `CellDetailPage`.
  - Persistence of changes in `StoreSnapshot`.
  - CSV Export and "Unsynced Changes" indicators in Header and Dale Console.
- [x] Phase 15: Flower Theme Phase 4 (Bad Day Rescue & Dale-Friendly Demo) - **Completed**
- [x] Phase 16: Flower Theme Phase 5 (Cloudflare First Run & Value Prop) - **Completed**
- [x] Phase 17: Polish & Fixes (First Run Banner, Fast Path Hint, Lint Cleanup) - **Completed**
  - Extended domain model with `ScheduleInfo`, `SchedulePhase`, and `ScheduleStatus` types.
  - Created `scheduleMetrics.ts` with pure functions for computing schedule status and risk.
  - Built Readiness Board page (kanban-style, grouped by phase) at `/readiness`.
  - Built Timeline View page (Gantt-like layout) at `/timeline/:projectId`.
  - Enhanced demo data with realistic schedule dates covering all states.
  - Integrated schedule KPIs into Dale Console (Late Cells, Schedule At Risk).
  - Zero configuration design - gracefully degrades when schedule data is sparse.
- **Phase 12: SimBridge Service & Diagnostics**: Implemented core service layer for SimBridge integration.
  - `SimBridgeService` with state management and error mapping.
  - `useSimBridge` hook for React components.
  - `simBridgeDiagnostics` for in-memory event logging.
  - Basic domain mapping heuristics (Study Path -> Project/Cell).
  - UI integration is currently optional/partial (Data Loader tab, Cell Detail button).

## History (Context)

*Historical notes for context only.*
- *Microsoft integration was a "stretch goal" that became a core (but optional) feature.*

## Current Status (Agent 3 Sync)
- **Repo Synced**: `main` is up to date.
- **Build**: Passing (`npm run build`).
- **E2E**: Hardened `local-ingest-to-dashboard.spec.ts` with stable selectors. Known issue with ingestion state in test environment documented in `TECH_DEBT_NOTES.md`.
- **Refactoring**: Cleaned up `DashboardPage` and `ProjectsPage` logic.
