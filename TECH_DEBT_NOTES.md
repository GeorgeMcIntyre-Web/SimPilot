# Technical Debt & E2E Hardening Notes

## E2E Hardening
- **`local-ingest-to-dashboard.spec.ts`**:
  - Replaced fragile text-based selectors ("Data Loaded") with stable `data-testid` attributes (`data-status-indicator`, `result-projects-count`, etc.).
  - Added explicit attribute checks (`data-status="loaded"`) to ensure state changes are caught.
  - Added verification of ingestion results (checking project/cell counts > 0) to prevent false positives where ingestion "completes" but loads nothing.

## Refactoring
- **`DashboardPage.tsx`**:
  - Refactored `handleSort` to use guard clauses, removing `else` block.
  - Refactored `getSortedCells` to remove nested `else if` chain, extracting a `getValue` helper function.
- **`ProjectsPage.tsx`**:
  - Refactored `handleSort` to use guard clauses.
  - Refactored `getSortedProjects` to use a helper function and early returns, eliminating `else if` chains.

## Known Issues
- `local-ingest-to-dashboard.spec.ts` is currently failing in the CI/local run, likely due to ingestion not populating the store correctly (counts remain 0). This requires further investigation into the `ingestFiles` logic or file fixture validity.
- `hasData` in `LayoutShell` remains false after ingestion in the test environment.
