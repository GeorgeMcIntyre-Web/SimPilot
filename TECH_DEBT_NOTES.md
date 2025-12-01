# Technical Debt & E2E Hardening Notes

## E2E Hardening & Test Improvements
- **`local-ingest-to-dashboard.spec.ts`**:
  - Replaced fragile text-based selectors ("Data Loaded") with stable `data-testid` attributes (`data-status-indicator`, `result-projects-count`, etc.).
  - Added explicit attribute checks (`data-status="loaded"`) to ensure state changes are caught.
  - Added verification of ingestion results (checking project/cell counts > 0) to prevent false positives.
  - Refactored to use `testHelpers`. Added fixture generation script. Currently debugging file ingestion stability.
- **`demo-to-dashboard.spec.ts`**: Stabilized by adding `data-testid` selectors and explicit waits. Fixed timing issues with dashboard KPI loading.
- **`engineer-persistence.spec.ts`**: Created new test for engineer assignment. Currently debugging persistence verification (likely timing or IndexedDB flush issue).
- **`testHelpers.ts`**: Created reusable helpers for common flows (`loadDemoScenario`, `goToDashboard`, `ingestLocalFixtureFiles`, `changeCellEngineer`).

## Refactoring & Code Quality
- **`DashboardPage.tsx`**:
  - Refactored `handleSort` to use guard clauses, removing `else` block.
  - Refactored `getSortedCells` to remove nested `else if` chain, extracting a `getValue` helper function.
- **`ProjectsPage.tsx`**:
  - Refactored `handleSort` to use guard clauses.
  - Refactored `getSortedProjects` to use a helper function and early returns, eliminating `else if` chains.
- **`KpiTile.tsx`**: Updated to accept standard HTML attributes (including `data-testid`) for better testability.
- **`DataLoaderPage.tsx`**: Added `data-testid` attributes for reliable selectors.
- **`CellDetailPage.tsx`**: Added `data-testid` attributes for engineer editing flow.
- **`DaleConsole.tsx`**: Added `data-testid` attributes.

## Known Issues / Next Steps
- **Local Ingest Test**: `local-ingest-to-dashboard.spec.ts` is currently failing in the CI/local run, likely due to ingestion not populating the store correctly (counts remain 0). This requires further investigation into the `ingestFiles` logic or file fixture validity.
- **Persistence Test**: `engineer-persistence.spec.ts` fails on reload. Needs investigation into `PersistenceManager` flush timing or Playwright context behavior.
- **Layout State**: `hasData` in `LayoutShell` remains false after ingestion in the test environment.
- **Linting**: Fixed `getByPlaceholderText` deprecation warning.

## Recommendations
- **SimBridge**: Ensure SimBridge client handles connection failures gracefully (already implemented but verified).
- **CI**: Ensure GitHub Actions workflow installs necessary dependencies (e.g., `tsx` for fixture generation) and caches Playwright browsers.
