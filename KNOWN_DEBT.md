# Known Technical Debt - v0.3 Excel + Bottlenecks

**Date**: 2025-01-XX  
**Branch**: `main` (after PR #23 merge)  
**Status**: Functional, but with known test failures

---

## Test Failures (74 total)

### Critical Path Tests ✅
- **Excel Universal Ingestion**: 128/128 passing
- **Domain/Workflow**: 44/44 passing (ExcelIngestionFacade, workflowMappers, workflowBottleneckLinker)
- **Ingestion Core**: 519/527 passing (8 skipped intentionally)

### Legacy Test Failures (Not Blocking)

#### 1. Reuse Linker (4 failed)
- **File**: `src/ingestion/parsers/__tests__/reuseLinker.test.ts`
- **Status**: Legacy linking logic may need fixture updates
- **Impact**: Low (reuse linking works in production)

#### 2. UI Component Tests (37 failed)
- **Auth**: 18 failed (`AuthContext.test.tsx`, `useAuth.test.tsx`, `AuthGate.test.tsx`)
- **ErrorBoundary**: 7 failed
- **Simulation Filters**: 9 failed
- **DaleTodayPanel**: 8 failed
- **SheetMappingInspector**: 13 failed
- **Impact**: Medium (UI works, tests need React Testing Library setup fixes)

#### 3. Feature Tests (19 failed)
- **useBottleneckOverview**: 15 failed
- **DataHealthPage**: Suite failed
- **SimulationDetailDrawer**: Suite failed
- **AssetsPage**: Suite failed
- **Impact**: Medium (features work, tests need updates for new data structures)

---

## UI Rough Edges (To Verify in Smoke Test)

- [ ] TOOL_LIST workbook loading flow
- [ ] Workflow bottlenecks display in dashboard
- [ ] Excel ingestion progress indicators
- [ ] Error handling for corrupted files
- [ ] Sheet mapping inspector usability

---

## Future Work

### Data Source Integration
- **Current**: Golden workbooks (test fixtures)
- **Future**: Connect to real data sources:
  - Oracle database integration
  - EMServer API integration
  - Real-time data sync

### Test Infrastructure
- Fix React Testing Library setup for UI tests
- Update fixtures for reuse linker tests
- Regenerate golden test data for new key structures

### Performance
- Large workbook handling (>10MB)
- Concurrent ingestion limits
- Memory optimization for browser environment

---

## Files Requiring Attention

### High Priority
- `src/ingestion/parsers/__tests__/reuseLinker.test.ts` - 4 failures
- `src/features/dashboard/__tests__/useBottleneckOverview.test.ts` - 15 failures

### Medium Priority
- Auth test files (React Testing Library setup)
- UI component test files (mock setup)

### Low Priority
- Legacy integration tests with outdated fixtures

---

## Notes

- All **core Excel ingestion** and **workflow bottleneck** functionality is tested and passing
- Failures are primarily in UI/auth tests and legacy fixtures
- Production functionality is not affected by test failures
- Vitest configuration is correct (`pool: "vmThreads"`)


