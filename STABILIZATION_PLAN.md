# Plan: Stabilization Phase

## Phase 2: Harden E2E Tests
**Objective**: Fix `local-ingest-to-dashboard.spec.ts` and ensure stability.

### Analysis
- The test fails, likely at the assertion of project/cell counts > 0.
- `LayoutShell`'s `hasData` indicator depends on `cell.simulation.percentComplete >= 0`.
- The previous `excelUtils` fix for `isEmptyRow` should have improved data parsing, not broken it.

### Action Plan
1.  **Debug**: Add logging to `local-ingest-to-dashboard.spec.ts` to inspect the actual values of `result-projects-count` and `result-cells-count` when it fails.
2.  **Refactor Test**:
    - Replace `waitForTimeout` (if any remain) with `expect.poll` or `toPass`.
    - Ensure assertions wait for the UI to settle.
3.  **Verify**: Run the test 3 times.

## Phase 3: Stabilize Persistence
**Objective**: Fix `engineer-persistence.spec.ts` race conditions.

### Analysis
- `PersistenceManager` has a hardcoded 2s debounce.
- Tests race against this debounce.

### Action Plan
1.  **Refactor `PersistenceManager`**: Add a static `setDebounceDelay` method or a prop to override the delay for testing.
2.  **Update Test**: Set delay to 0ms or small value in `beforeEach`.
3.  **Verify**: Run `engineer-persistence.spec.ts`.
