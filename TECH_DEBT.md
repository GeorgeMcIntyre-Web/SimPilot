# Technical Debt Tracker

This document tracks known technical debt and deferred improvements from code reviews.

## High Priority

### 1. Re-enable Bottleneck Integration
**Status**: Blocked - waiting for generic workflow system migration
**Locations**:
- [src/features/simulation/components/StationCard.tsx:9](src/features/simulation/components/StationCard.tsx#L9)
- [src/features/simulation/components/StationCard.tsx:223](src/features/simulation/components/StationCard.tsx#L223)
- [src/features/simulation/components/StationCard.tsx:257](src/features/simulation/components/StationCard.tsx#L257)
- [src/features/simulation/components/SimulationDetailDrawer.tsx:34](src/features/simulation/components/SimulationDetailDrawer.tsx#L34)

**Description**: Bottleneck integration was disabled pending migration to a generic workflow system. The old tooling workflow types need to be replaced.

**Acceptance Criteria**:
- [ ] Complete migration to generic workflow system
- [ ] Update bottleneck linking to use new workflow types
- [ ] Re-enable bottleneck badges and indicators in UI
- [ ] Add tests for bottleneck detection

---

### 2. Complete Primary Assets Ingestion
**Status**: Stub implementation
**Location**: [src/ingestion/excelIngestionOrchestrator.ts:135-150](src/ingestion/excelIngestionOrchestrator.ts#L135-L150)

**Description**: The `loadPrimaryAssetsFromWorkbooks` function is a placeholder that returns an empty array.

**Acceptance Criteria**:
- [ ] Wire in existing robotlist parser
- [ ] Wire in simulation status parser
- [ ] Add error handling for missing files
- [ ] Add tests for full ingestion pipeline

---

### 3. TypeScript Strict Checks
**Status**: 10 violations remaining (down from 29, 16 fixed)
**Location**: [tsconfig.json:21-22](tsconfig.json#L21-L22)

**Description**: `noUnusedLocals` and `noUnusedParameters` are disabled due to remaining violations.

**Files with violations** (fixed):
- ✅ ~~src/app/components/VersionComparisonModal.tsx~~ - Fixed (Week 3)
- ✅ ~~src/app/routes/DashboardPage.tsx~~ - Fixed (Week 3)
- ✅ ~~src/app/routes/ProjectsPage.tsx~~ - Fixed (Week 3 & Week 3+)
- ✅ ~~src/app/routes/ReadinessBoard.tsx~~ - Fixed (Week 3+)
- ✅ ~~src/features/assets/AssetsFilters.tsx~~ - Fixed (Week 3+)
- ✅ ~~src/utils/prefsStorage.ts~~ - Fixed (Week 3+)
- ✅ ~~src/app/hooks/useM365Ingest.ts~~ - Fixed (Week 3+)
- ✅ ~~src/app/hooks/useSimBridge.ts~~ - Fixed (Week 3+)
- ✅ ~~src/integrations/simbridge/SimBridgeClient.ts~~ - Fixed (Week 3+)
- ✅ ~~src/features/dashboard/stationsTable/useStationsFiltering.ts~~ - Fixed (Week 3+)
- ✅ ~~src/features/simulation/components/SimulationBoardGrid.tsx~~ - Fixed (Week 3+)
- ✅ ~~src/features/simulation/components/SimulationDetailDrawer.tsx~~ - Fixed (Week 3+)
- ✅ ~~src/features/simulation/components/SimulationFiltersBar.tsx~~ - Fixed (Week 3+)
- ✅ ~~src/features/simulation/components/StationCard.tsx~~ - Fixed (Week 3+)
- ✅ ~~src/ingestion/versionComparison.ts~~ - Fixed (Week 3+)
- ✅ ~~src/ui/components/FlowerAccent.tsx~~ - Fixed (Week 3+)

**Files with violations** (remaining ~10):
- src/excel/engineBridge.ts (3 unused types)
- src/ingestion/ (multiple files)

**Acceptance Criteria**:
- [x] Fix or remove unused imports (16/29 fixed - 62% complete)
- [x] Prefix intentionally unused error parameters with `_`
- [ ] Continue fixing remaining 10 violations
- [ ] Enable `noUnusedLocals: true`
- [ ] Enable `noUnusedParameters: true`

---

## Medium Priority

### 4. Console.log Cleanup
**Status**: 86 occurrences across 40 files
**Locations**: See ESLint warnings with `npm run lint`

**Description**: Production code contains console.log statements that should use the logger utility.

**Acceptance Criteria**:
- [ ] Replace console.log with `logInfo()` from src/utils/logger.ts
- [ ] Replace console.error with `logError()`
- [ ] Replace console.warn with `logWarning()`
- [ ] Keep console methods only in logger.ts and test files

---

### 5. State Mutation Risk
**Status**: ✅ **COMPLETED**
**Location**: [src/domain/crossRef/CrossRefEngine.ts:84-129](src/domain/crossRef/CrossRefEngine.ts#L84-L129)

**Description**: ~~Direct state mutation in several functions could cause subtle bugs.~~ **FIXED**

**Completed**:
- [x] Refactored `getOrCreateCell()` to use immutable updates
- [x] Creates new object with spread operator instead of mutating
- [x] Only updates Map when changes are needed
- [x] Added documentation comment explaining immutable pattern

**Impact**: Prevents subtle bugs from state mutations, easier debugging

---

### 6. Input Validation Missing
**Status**: ✅ **COMPLETED**
**Location**: [src/domain/coreStore.ts:73-146](src/domain/coreStore.ts#L73-L146)

**Description**: ~~`setData()` doesn't validate input structure before overwriting store.~~ **FIXED**

**Completed**:
- [x] Added `validateSetDataInput()` helper function
- [x] Validates all required array fields (projects, areas, cells, robots, tools, warnings)
- [x] Validates referenceData structure if provided
- [x] Throws descriptive errors for invalid data
- [x] Added test file with 11 test cases

**Impact**: Prevents corrupt data from breaking the application state

---

### 7. OpenAI/LLM Features Unimplemented
**Status**: Stub implementations
**Locations**:
- [src/ingestion/embeddingTypes.ts:284](src/ingestion/embeddingTypes.ts#L284)
- [src/ingestion/llmMappingHelper.ts:150](src/ingestion/llmMappingHelper.ts#L150)

**Description**: OpenAI embedding provider and LLM mapping helper are stubbed.

**Acceptance Criteria**:
- [ ] Decide if AI features are still needed
- [ ] If yes: Implement OpenAI API integration
- [ ] If no: Remove stub code
- [ ] Update documentation

---

## Low Priority

### 8. Magic Numbers
**Example**: `AT_RISK_THRESHOLD = 80` in derivedMetrics.ts

**Acceptance Criteria**:
- [ ] Document why 80% is the threshold
- [ ] Consider making thresholds configurable
- [ ] Add to config/featureFlags.ts if needed

---

### 9. Deep Component Nesting
**Description**: Some page components are 500+ lines

**Acceptance Criteria**:
- [ ] Extract sub-components from large pages
- [ ] Aim for <200 lines per component
- [ ] Improve maintainability

---

### 10. Test Coverage
**Status**: Unknown baseline

**Acceptance Criteria**:
- [ ] Run `npm run test -- --coverage`
- [ ] Document current coverage %
- [ ] Set target: 80% for domain logic
- [ ] Add missing tests for critical paths

---

## Completed

### ✅ Route-based Code Splitting
Completed in commit be3f250 - Bundle reduced from 958 KB to 550 KB

### ✅ Error Boundary Protection
Completed in commit be3f250 - All routes wrapped

### ✅ Backup Files Removed
Completed in commit be3f250 - 3 backup files deleted

### ✅ Dependencies Updated
Completed in commit be3f250 - React, Vite, Vitest updated

### ✅ ESLint Configuration
Added in Week 2 improvements

---

## How to Use This Document

1. **Create GitHub Issues**: Convert each section to a GitHub issue when ready to work on it
2. **Link to Code**: Use file:line references to jump directly to problem areas
3. **Track Progress**: Check off acceptance criteria as work progresses
4. **Update Status**: Keep status field current (Blocked, In Progress, etc.)
