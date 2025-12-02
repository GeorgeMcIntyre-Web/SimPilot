# AGENT BRIEFS - PHASE 4: SimContext Integration

## Overview

Phase 3 is COMPLETE. We now have:
- **Excel Ingestion Orchestrator**: Full pipeline for loading primary assets + reuse lists + linking
- **Ingestion Facade**: Stable public API at `src/domain/ExcelIngestionFacade.ts`
- **Config Module**: Centralized config at `src/config/simpilotConfig.ts`

**NEXT PHASE**: Integrate the ingestion system into the live application.

---

## AGENT 1: SimulationContext Integration

**Goal**: Connect the Excel ingestion facade to the live React application via SimulationContext.

**Tasks**:
1. Locate the existing SimulationContext provider (likely in `src/features/simulation/` or `src/context/`)
2. Add state management for `SimPilotDataSnapshot`:
   ```ts
   import { loadSimPilotDataSnapshot, type SimPilotDataSnapshot } from '../domain/ExcelIngestionFacade';
   import { getDefaultDataRoot } from '../config/simpilotConfig';
   ```
3. Add loading state, error state, and refresh capability
4. Expose the data snapshot through the context:
   - `snapshot: SimPilotDataSnapshot | null`
   - `isLoading: boolean`
   - `error: string | null`
   - `refresh: () => Promise<void>`
5. Call `loadSimPilotDataSnapshot()` on mount using the default data root
6. Handle errors gracefully (store in state, don't crash app)

**Success Criteria**:
- SimulationContext successfully loads data on app startup
- Data is accessible to all child components
- Errors are caught and displayed to users
- Manual refresh works

**Files to Modify**:
- `src/features/simulation/SimulationContext.tsx` (or equivalent)
- May need to create if it doesn't exist

**Testing**:
- Verify data loads in browser console
- Check that `snapshot.assets` and `snapshot.reuseSummary` are populated
- Test error handling by providing invalid dataRoot

---

## AGENT 2: Dashboard Integration

**Goal**: Update the Dashboard page to consume live ingestion data from SimulationContext.

**Tasks**:
1. Locate the Dashboard component (likely `src/features/dashboard/DashboardPage.tsx`)
2. Replace mock/hardcoded data with real data from SimulationContext:
   ```ts
   const { snapshot, isLoading, error } = useSimulationContext();
   ```
3. Display key metrics:
   - Total assets: `snapshot.assets.length`
   - Total reuse records: `snapshot.reuseSummary.total`
   - Available reuse items: `snapshot.reuseSummary.byStatus['AVAILABLE']`
   - Allocated reuse items: `snapshot.reuseSummary.byStatus['ALLOCATED']`
   - Linking success rate: `(snapshot.linkingStats.matchedReuseRecords / snapshot.reuseSummary.total * 100).toFixed(1)%`
4. Add loading spinner while `isLoading === true`
5. Display error message if `error !== null`
6. Show data quality warnings from `snapshot.errors`

**Success Criteria**:
- Dashboard displays real metrics from Excel workbooks
- Loading states are user-friendly
- Errors are clearly communicated
- Metrics update when data refreshes

**Files to Modify**:
- `src/features/dashboard/DashboardPage.tsx`
- `src/features/dashboard/DashboardMetrics.tsx` (if separate component)

**Testing**:
- Verify all metrics display correctly
- Test loading state on slow network
- Verify error display

---

## AGENT 3: Asset Browser Integration

**Goal**: Build or update the Asset Browser to display ingested assets with reuse information.

**Tasks**:
1. Locate or create AssetBrowser component (likely `src/features/assets/AssetBrowser.tsx`)
2. Consume assets from SimulationContext:
   ```ts
   const { snapshot } = useSimulationContext();
   const assets = snapshot?.assets ?? [];
   ```
3. Display asset list with columns:
   - Project / Line / Station
   - Asset type (detailedKind)
   - Model / Part Number
   - Reuse tags (if present in `tags` array)
4. Add filtering:
   - By project
   - By asset type
   - By reuse status (assets with/without reuse info)
5. Add search (fuzzy match on model, part number, serial number)
6. Show reuse provenance tags (e.g., `REUSE:INTERNAL`, `REUSE:DESIGNOS`)

**Success Criteria**:
- Asset list displays all ingested assets
- Filtering and search work correctly
- Reuse tags are visible
- Performance is acceptable (handle 1000+ assets)

**Files to Create/Modify**:
- `src/features/assets/AssetBrowser.tsx`
- `src/features/assets/AssetFilters.tsx`
- `src/features/assets/AssetTable.tsx`

**Testing**:
- Load with real data and verify all assets appear
- Test filtering by project/type
- Test search functionality

---

## AGENT 4: Reuse Pool Viewer

**Goal**: Create a dedicated view for the reuse equipment pool with allocation tracking.

**Tasks**:
1. Create new page/component: `src/features/reuse/ReusePoolPage.tsx`
2. Consume reuse summary from SimulationContext:
   ```ts
   const { snapshot } = useSimulationContext();
   const { reuseSummary } = snapshot ?? {};
   ```
3. Display reuse pool overview:
   - Total items in pool: `reuseSummary.total`
   - By status (AVAILABLE, ALLOCATED, IN_USE): `reuseSummary.byStatus`
   - By type (Riser, TipDresser, TMSGun): `reuseSummary.byType`
4. Add detail table showing assets with reuse info:
   - Filter `snapshot.assets` for items with reuse tags
   - Show source project → target project allocation
   - Show allocation status
5. Add filtering:
   - By allocation status
   - By asset type
   - By source workbook (INTERNAL vs DesignOS)
6. Highlight unmatched reuse records count

**Success Criteria**:
- Reuse pool page displays accurate summary
- Status breakdown is clear
- Detail view shows allocation flow (old → new project)
- Unmatched records are highlighted for investigation

**Files to Create**:
- `src/features/reuse/ReusePoolPage.tsx`
- `src/features/reuse/ReusePoolSummary.tsx`
- `src/features/reuse/ReuseAllocationTable.tsx`

**Add Route**:
- Update router (likely `src/App.tsx` or `src/routes.tsx`) to add `/reuse-pool` route

**Testing**:
- Verify summary metrics match orchestrator output
- Test status filtering
- Check allocation flow display

---

## AGENT 5: Data Quality Dashboard

**Goal**: Create a data quality monitoring page to surface ingestion warnings and errors.

**Tasks**:
1. Create new page: `src/features/quality/DataQualityPage.tsx`
2. Display ingestion errors:
   ```ts
   const { snapshot } = useSimulationContext();
   const errors = snapshot?.errors ?? [];
   ```
3. Show summary cards:
   - Total errors: `errors.length`
   - Total assets loaded: `snapshot.assets.length`
   - Reuse linking success rate: `(matchedReuseRecords / total * 100)%`
   - Unmatched reuse records: `snapshot.linkingStats.unmatchedReuseRecords`
4. Display error list with:
   - Error message
   - Severity (if available)
   - Source workbook/sheet (parse from error message)
5. Add filtering:
   - By error type (parsing, validation, linking)
   - By workbook
6. Add "Refresh Data" button to reload ingestion pipeline

**Success Criteria**:
- Data quality page shows all ingestion errors
- Error list is filterable and searchable
- Refresh button triggers `refresh()` from SimulationContext
- Provides actionable insights for data cleanup

**Files to Create**:
- `src/features/quality/DataQualityPage.tsx`
- `src/features/quality/ErrorList.tsx`
- `src/features/quality/QualitySummary.tsx`

**Add Route**:
- Update router to add `/data-quality` route

**Testing**:
- Verify errors from `snapshot.errors` appear correctly
- Test refresh functionality
- Check filtering works

---

## Global Requirements for All Agents

### Code Style (NON-NEGOTIABLE)
- Use guard clauses (early returns)
- NO `else` or `elseif` statements
- Avoid nesting beyond 2 levels
- Prefer explicit comparisons over unary `!`
- No new `any` types
- Small, focused functions

### Import Conventions
```ts
// Always import from the facade, NOT internal modules
import { loadSimPilotDataSnapshot, type SimPilotDataSnapshot } from '../domain/ExcelIngestionFacade';
import { getDefaultDataRoot } from '../config/simpilotConfig';

// DO NOT import directly from orchestrator or parsers
// ❌ BAD: import { ingestAllExcelData } from '../ingestion/excelIngestionOrchestrator';
// ✅ GOOD: Use the facade
```

### Error Handling Pattern
```ts
// Always handle errors gracefully
try {
  const snapshot = await loadSimPilotDataSnapshot({ dataRoot });
  // success path
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  // set error state, display to user
  return; // guard clause - stop processing
}
```

### Testing Checklist
Each agent must:
1. Test with real Excel data (provide path via `VITE_SIMPILOT_DATA_ROOT`)
2. Test loading states
3. Test error states (invalid path, missing files)
4. Test empty data states (no assets, no reuse records)
5. Verify performance with large datasets (1000+ assets)

---

## Coordination Notes

### Execution Order
Agents can work in parallel, but integration order should be:
1. **Agent 1** (SimulationContext) - MUST complete first
2. **Agents 2-5** - Can work in parallel after Agent 1 completes

### Shared Dependencies
- All agents depend on the facade at `src/domain/ExcelIngestionFacade.ts`
- All agents depend on config at `src/config/simpilotConfig.ts`
- All agents consume SimulationContext created by Agent 1

### Communication Protocol
- Each agent commits to a feature branch: `feature/phase4-agent{N}`
- Create PRs with clear descriptions
- Tag @lead-engineer for review
- Merge only after approval and CI passes

---

## Environment Setup

### Required Environment Variable
Add to `.env.local`:
```
VITE_SIMPILOT_DATA_ROOT=C:/path/to/SimPilot_Data
```

This should point to the directory containing:
- `Robotlist_*.xlsx` files
- `Simulation_Status_*.xlsx` files
- Reuse workbooks (e.g., `Reuse_Risers_INTERNAL.xlsx`)

### Verification Command
```bash
npm run build && npm run dev
```

Navigate to each new route and verify:
- Data loads correctly
- No console errors
- UI is responsive

---

## Success Metrics - Phase 4 Complete

✅ All 5 agents complete their tasks
✅ SimulationContext loads real Excel data on startup
✅ Dashboard displays live metrics from ingestion
✅ Asset browser shows all ingested assets with reuse tags
✅ Reuse pool page tracks allocation workflow
✅ Data quality dashboard surfaces warnings/errors
✅ All routes work, no runtime errors
✅ Build passes: `npm run build`
✅ Dev server runs: `npm run dev`

---

## Next Steps After Phase 4

Once all agents complete:
1. End-to-end testing with production-like data
2. Performance optimization (lazy loading, virtualization)
3. Add export functionality (CSV, Excel)
4. Add real-time data refresh (file watcher)
5. Deploy to staging environment

---

**Created**: 2025-12-02
**Status**: Phase 3 Complete, Phase 4 Ready to Launch
**Owner**: Lead Engineer (Claude Code)
