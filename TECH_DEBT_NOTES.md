# Technical Debt & E2E Hardening Notes

## E2E Test Hardening
- **`demo-to-dashboard.spec.ts`**: Stabilized by adding `data-testid` selectors and explicit waits. Fixed timing issues with dashboard KPI loading.
- **`local-ingest-to-dashboard.spec.ts`**: Refactored to use `testHelpers`. Added fixture generation script. Currently debugging file ingestion stability.
- **`engineer-persistence.spec.ts`**: Created new test for engineer assignment. Currently debugging persistence verification (likely timing or IndexedDB flush issue).
- **`testHelpers.ts`**: Created reusable helpers for common flows (`loadDemoScenario`, `goToDashboard`, `ingestLocalFixtureFiles`, `changeCellEngineer`).

## Refactoring & Code Quality
- **`KpiTile.tsx`**: Updated to accept standard HTML attributes (including `data-testid`) for better testability.
- **`DataLoaderPage.tsx`**: Added `data-testid` attributes for reliable selectors.
- **`CellDetailPage.tsx`**: Added `data-testid` attributes for engineer editing flow.
- **`DaleConsole.tsx`**: Added `data-testid` attributes.

## Known Issues / Next Steps
- **Persistence Test**: `engineer-persistence.spec.ts` fails on reload. Needs investigation into `PersistenceManager` flush timing or Playwright context behavior.
- **Local Ingest Test**: `local-ingest-to-dashboard.spec.ts` fails during ingestion. Suspect file path resolution or dropzone interaction issues in headless mode.
- **Linting**: Fixed `getByPlaceholderText` deprecation warning.

## Recommendations
- **SimBridge**: Ensure SimBridge client handles connection failures gracefully (already implemented but verified).
- **CI**: Ensure GitHub Actions workflow installs necessary dependencies (e.g., `tsx` for fixture generation) and caches Playwright browsers.
