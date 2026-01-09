# DiffResult Computation Analysis

**Date**: 2026-01-09
**Author**: Analysis based on codebase review
**Status**: Current Implementation Review

---

## Executive Summary

The **DiffResult** computation system is a critical component of SimPilot's UID-backed linking architecture. It enables change detection and tracking for imported manufacturing data (stations, tools, robots) while handling identity resolution across Excel file variations, plant contexts, and identifier drift.

### Key Findings

✅ **What's Working Well:**
- Clean separation of concerns (diffEngine, uidResolver, ambiguityCollector)
- Comprehensive diff detection (creates, updates, deletes, renames, ambiguous)
- Multi-plant awareness throughout the type system
- Deterministic UID generation with entity-type prefixes

⚠️ **Critical Gaps (Phase 0 Incomplete):**
- **DiffResult persistence incomplete** - diffResults stored in coreStore but not fully utilized
- **Ambiguity resolution UI partial** - ImportReviewPage exists but limited functionality
- **No soft delete visibility** - deleted entities not shown with reactivation option
- **Import history basic** - exists but lacks detailed drill-down and status tracking

🔴 **Design Issues Requiring Attention:**
1. **Rename detection logic incomplete** - diffEngine only detects renames when UID is already resolved
2. **Cross-plant carryover not implemented** - multi-plant tool tracking types exist but no UI/workflow
3. **Deletion detection simplistic** - no "last seen" tracking or batch deletion warnings
4. **Performance concerns** - in-memory diff computation may not scale beyond 1000+ entities

---

## Architecture Overview

### Component Responsibilities

```
┌─────────────────────────────────────────────────────────────┐
│                     Import Pipeline Flow                     │
└─────────────────────────────────────────────────────────────┘

1. Excel Upload
   ↓
2. Sheet Detection (sheetSniffer.ts)
   ↓
3. Parsing (toolListParser, robotListParser, simulationStatusParser)
   ↓
4. UID Resolution (uidResolver.ts)
   │  - Check aliasRules
   │  - Exact key match
   │  - Fuzzy matching → ambiguous
   ↓
5. Diff Computation (diffEngine.ts)
   │  - Compare prev vs new records by UID
   │  - Classify: create/update/delete/rename
   ↓
6. Ambiguity Collection (ambiguityCollector.ts)
   │  - Gather unresolved entities
   │  - Collect candidate matches
   ↓
7. DiffResult Creation
   │  - Aggregate all diff types
   │  - Generate summary counts
   ↓
8. Storage (coreStore.ts)
   │  - Store in diffResults array
   │  - Create ImportRun record
   ↓
9. UI Display (ImportReviewPage.tsx)
   │  - Show ambiguous items
   │  - User resolution workflow
   └─────────────────────────────────────────────────────────┘
```

---

## DiffResult Type Structure

### Core Interface (from uidTypes.ts:300-323)

```typescript
interface DiffResult {
  importRunId: string          // Links to ImportRun record
  sourceFile: string           // Excel filename
  sourceType: ImportSourceType // 'toolList' | 'robotList' | 'simulationStatus'
  plantKey: PlantKey          // Plant context (multi-plant support)
  computedAt: string          // ISO timestamp

  // Diff categories
  creates: DiffCreate[]
  updates: DiffUpdate[]
  deletes: DiffDelete[]
  renamesOrMoves: DiffRenameOrMove[]
  ambiguous: DiffAmbiguous[]

  // Summary metrics
  summary: {
    totalRows: number
    created: number
    updated: number
    deleted: number
    renamed: number
    ambiguous: number
    skipped: number
  }

  warnings?: string[]  // e.g., "Plant context PLANT_UNKNOWN; collisions possible"
}
```

### Diff Item Types

**DiffCreate** (uidTypes.ts:236-242)
```typescript
{
  key: string                    // New canonical key
  plantKey: PlantKey
  entityType: 'station' | 'tool' | 'robot'
  attributes: Record<string, any>
  suggestedName?: string         // Display name for UI
}
```

**DiffUpdate** (uidTypes.ts:244-252)
```typescript
{
  uid: EntityUid                 // Existing entity UID
  key: string                    // Current key
  plantKey: PlantKey
  entityType: EntityType
  oldAttributes: Record<string, any>
  newAttributes: Record<string, any>
  changedFields: string[]        // Specific fields that changed
}
```

**DiffDelete** (uidTypes.ts:254-260)
```typescript
{
  uid: EntityUid
  key: string
  plantKey: PlantKey
  entityType: EntityType
  lastSeen: string              // ISO timestamp of last import
}
```

**DiffRenameOrMove** (uidTypes.ts:262-280)
```typescript
{
  oldKey?: string
  newKey: string
  plantKey: PlantKey
  entityType: EntityType
  oldPlantKey?: PlantKey        // Cross-plant carryover
  uid?: EntityUid               // If already resolved
  confidence: number            // 0-100 match confidence
  matchReasons: string[]        // Human-readable explanations
  requiresUserDecision: boolean // True = ambiguous, False = auto-applied
  isCrossPlant?: boolean
  candidates?: Array<{          // Possible matches
    uid: EntityUid
    key: string
    plantKey: PlantKey
    matchScore: number
    reasons: string[]
  }>
}
```

**DiffAmbiguous** (uidTypes.ts:282-295)
```typescript
{
  newKey: string
  plantKey: PlantKey
  entityType: EntityType
  newAttributes: Record<string, any>
  candidates: Array<{
    uid: EntityUid
    key: string
    plantKey: PlantKey
    matchScore: number
    reasons: string[]
  }>
  action: 'resolve'            // User must choose
}
```

---

## Computation Implementation

### Location: `src/ingestion/diffEngine.ts`

#### Station Diff Logic (lines 24-102)

```typescript
export function diffStationRecords(
  prevRecords: StationRecord[],
  newRecords: StationRecord[]
): {
  creates: DiffCreate[]
  updates: DiffUpdate[]
  deletes: DiffDelete[]
  renamesOrMoves: DiffRenameOrMove[]
}
```

**Algorithm:**
1. Build UID-indexed maps of prev and new records
2. **For each new record:**
   - If UID not in prev → **create**
   - If UID exists but key changed → **rename/move** (confidence 100%)
   - If attributes changed → **update**
3. **For each prev record:**
   - If UID not in new → **delete**

**Critical Observation:**
```typescript
// Line 59: Key change detection
if (prevRecord.key !== newRecord.key) {
  renamesOrMoves.push({
    oldKey: prevRecord.key,
    newKey: newRecord.key,
    uid: newRecord.uid,
    confidence: 100,  // ← SAME UID = 100% CONFIDENCE
    matchReasons: ['Same UID'],
    requiresUserDecision: false
  })
}
```

**Issue:** This only detects renames **after UID resolution**. If a key changed and UID is not yet resolved, it will show up as **delete + create** instead of **rename**.

#### Tool Diff Logic (lines 112-187)

Identical pattern to station diff. Same limitation.

#### Combined Diff (lines 219-258)

```typescript
export function computeImportDiff(
  importRunId: string,
  sourceFile: string,
  sourceType: ImportSourceType,
  prevStationRecords: StationRecord[],
  prevToolRecords: ToolRecord[],
  newStationRecords: StationRecord[],
  newToolRecords: ToolRecord[],
  ambiguous: DiffAmbiguous[] = []
): DiffResult
```

**What it does:**
- Runs `diffStationRecords()` and `diffToolRecords()`
- Merges results into combined arrays
- Adds provided ambiguous items (passed from uidResolver)
- Computes summary counts
- Returns complete DiffResult

**Note:** Robot diff not implemented yet (robotRecords not in params).

---

## Critical Analysis

### 1. Rename Detection Gap

**Current Behavior:**
```
Scenario: Station "AL_010-010" renumbered to "AL_010-010A"

Without alias rule:
  uidResolver → "AL_010-010A" not found → ambiguous
  diffEngine → sees new UID (not same as old) → create + delete

With user-resolved alias:
  uidResolver → "AL_010-010A" → st_abc123 (via alias rule)
  diffEngine → same UID, key changed → rename (confidence 100%)
```

**Problem:** First import after rename shows as **delete + create** instead of **rename candidate**.

**Expected Behavior:**
```
Scenario: Station "AL_010-010" renumbered to "AL_010-010A"

Smart rename detection:
  1. uidResolver marks "AL_010-010A" as ambiguous
  2. diffEngine notices "AL_010-010" disappeared (delete candidate)
  3. Fuzzy matching finds "AL_010-010" similar to "AL_010-010A"
  4. Suggests rename: "AL_010-010" → "AL_010-010A" (confidence 85%)
  5. User confirms → creates alias rule
  6. Next import auto-resolves via alias
```

**Gap:** Steps 3-4 not implemented. No fuzzy matching in diffEngine.

### 2. Ambiguity Handling Flow

**Where ambiguities come from:**

```typescript
// tools/uidAwareIngestion.ts:136
const ambiguousResolutions: AmbiguousResolutionInput[] = []

// During station resolution (example):
const stationResolution = resolveStationUid(
  stationKey,
  plantKey,
  context
)

if (stationResolution.resolution === 'ambiguous') {
  ambiguousResolutions.push({
    entityType: 'station',
    newKey: stationKey,
    plantKey,
    newAttributes: rawStationAttrs,
    candidates: stationResolution.candidates || []
  })
}

// Later, passed to diff:
const ambiguousItems = collectAmbiguousItems(ambiguousResolutions)
const diff = computeImportDiff(..., ambiguousItems)
```

**Collection Logic** (src/ingestion/ambiguityCollector.ts):
```typescript
export function collectAmbiguousItems(
  inputs: AmbiguousResolutionInput[]
): DiffAmbiguous[] {
  return inputs.map(input => ({
    newKey: input.newKey,
    plantKey: input.plantKey,
    entityType: input.entityType,
    newAttributes: input.newAttributes,
    candidates: input.candidates,
    action: 'resolve'
  }))
}
```

**Simple transformation** - no fuzzy matching, no delete correlation.

### 3. Storage and Retrieval

**In coreStore.ts:**

```typescript
// Line 54: DiffResult storage
export interface CoreStoreState {
  // ...
  diffResults: DiffResult[]  // Store diff results from imports for UI display
  importRuns: ImportRun[]
  // ...
}

// Line 76: Initial state
storeState = {
  // ...
  diffResults: [],
  importRuns: [],
  // ...
}
```

**Methods Available** (from coreStore.ts review):
- `diffResults` array is part of state
- No explicit `addDiffResult()` or `updateDiffResult()` in the file excerpt
- ImportReviewPage.tsx line 55 calls `coreStore.updateDiffResult()` → **method must exist elsewhere**

**Gap:** DiffResult CRUD methods not visible in reviewed code sections. Likely incomplete.

### 4. UI Implementation Status

**ImportReviewPage.tsx** (lines 1-100 reviewed):

✅ **Implemented:**
- Fetches diffResult by importRunId
- Displays ambiguous items
- User can link to candidate (creates alias rule)
- User can create new entity
- Updates diffResult to remove resolved ambiguities

❌ **Missing:**
- No display of creates/updates/deletes/renames
- No drill-down into changed fields
- No "approve all" or "reject all" actions
- No diff comparison view (old vs new attributes)
- No soft-delete reactivation workflow

**Example UI Code:**
```typescript
// Line 40: Handle link to candidate
const handleLinkToCandidate = (
  ambiguousKey: string,
  candidateUid: string,
  entityType: string
) => {
  const rule = createAliasRule(
    ambiguousKey,
    candidateUid,
    entityType as any,
    `User linked ${ambiguousKey} to ${candidateUid} via Import Review`,
    'local-user'
  )

  coreStore.createAliasRule(rule)  // ← Alias rule created

  // Remove from ambiguous list
  const updatedAmbiguous = ambiguousItems.filter(a => a.newKey !== ambiguousKey)
  coreStore.updateDiffResult(importRunId!, {
    ambiguous: updatedAmbiguous,
    summary: { ...diffResult.summary, ambiguous: updatedAmbiguous.length }
  })
}
```

**Workflow:**
1. User sees ambiguous item with candidates
2. Clicks "Link to this" on candidate
3. Alias rule created and stored
4. Ambiguous item removed from diff
5. Summary updated

**Good:** Clean workflow, creates persistent alias rules.

**Missing:** No way to see the full diff context (what else changed in this import?).

---

## Integration with Real Data Regression

### tools/realDataRegress.ts

**Purpose:** Headless testing harness for Excel ingestion with mutation support.

**Key Features:**
1. Runs UID-aware ingestion on real Excel files
2. Optional identifier mutation (--mutate-names flag)
3. Generates ambiguity bundles for testing
4. Validates counts and detects regressions

**DiffResult Usage:**
```typescript
// From uidAwareIngestion.ts (inferred from types):
export interface UidIngestionResult {
  // ...
  diff?: DiffResult  // ← DiffResult included in result
  ambiguousCount: number
  // ...
}
```

**Regression Validation:**
- Compares entity counts across runs
- Detects unexpected creates/deletes
- Exports ambiguity bundles to artifacts/ for UI testing
- Strict mode fails if ambiguous > 0

**Ambiguity Bundle Structure** (from AMBIGUITY_WORKFLOW.md:87-119):
```json
{
  "fileName": "STLA_S_Tool_List.xlsx",
  "filePath": "C:\\...\\STLA_S_Tool_List.xlsx",
  "ambiguousItems": [{
    "newKey": "AL_10-10",
    "plantKey": "PLANT_TEST",
    "entityType": "station",
    "newAttributes": {...},
    "candidates": [{
      "uid": "st_abc123",
      "key": "AL_010-010",
      "plantKey": "PLANT_TEST",
      "matchScore": 85,
      "reasons": ["Same line", "Same bay", "Similar station number"]
    }],
    "action": "resolve"
  }],
  "totalAmbiguous": 1
}
```

**Gap:** DiffResult not exported to JSON for analysis. Only ambiguity bundles exported.

---

## Performance Considerations

### Current Implementation

**Algorithm Complexity:**
```typescript
// diffStationRecords() - O(n) where n = record count
const prevByUid = new Map(prevRecords.map(r => [r.uid, r]))  // O(n)
const newByUid = new Map(newRecords.map(r => [r.uid, r]))     // O(n)

for (const newRecord of newRecords) {                         // O(n)
  const prevRecord = prevByUid.get(newRecord.uid)             // O(1)
  // ...
}

for (const prevRecord of prevRecords) {                       // O(n)
  if (!newByUid.has(prevRecord.uid)) { /* ... */ }            // O(1)
}
```

**Overall:** O(n) - linear time, excellent for typical use cases.

### Memory Usage

**Worst Case:**
```
Scenario: 1000 stations, 5000 tools, 500 robots = 6500 entities

DiffResult size estimate:
  - creates: 100 × 500 bytes = 50 KB
  - updates: 200 × 800 bytes = 160 KB
  - deletes: 50 × 300 bytes = 15 KB
  - renames: 20 × 600 bytes = 12 KB
  - ambiguous: 30 × 1000 bytes = 30 KB
  Total: ~270 KB per import

  10 imports stored: ~2.7 MB (well within browser limits)
```

**Conclusion:** Memory not a concern for typical projects (<10,000 entities).

### Scaling Concerns

**When n > 10,000 entities:**
- O(n) computation still fast (<100ms)
- UI rendering becomes bottleneck (large lists)
- IndexedDB storage grows (but manageable)

**Mitigation (future):**
- Virtualized lists for diff display
- Pagination for import history
- Archive old diffs (keep last 50)

---

## Recommendations

### Phase 0 Completion (Immediate)

1. **Complete DiffResult Storage**
   - Add explicit `addDiffResult(result: DiffResult)` to coreStore
   - Ensure persistence via storeSnapshot.ts
   - Test reload after page refresh

2. **Enhance ImportReviewPage**
   - Add tabs for: Ambiguous | Creates | Updates | Deletes | Renames
   - Show attribute diffs for updates (old vs new side-by-side)
   - Add "Approve Import" button (applies all changes)
   - Add "Reject Import" button (discards diff)

3. **Implement Soft Delete Visibility**
   - Add "Deleted Entities" tab to Registry
   - Show lastSeen timestamp
   - Add "Reactivate" button (sets status: 'active')

4. **Improve Import History**
   - Add status badge: "Clean" | "Needs Review" | "Approved"
   - Link to ImportReviewPage from each row
   - Show warnings count
   - Add drill-down to DiffResult details

### Phase 1 Enhancements

1. **Smart Rename Detection**
   - Integrate fuzzy matcher into diffEngine
   - Correlate deletes with creates (high similarity → rename candidate)
   - Add confidence thresholds (>90% auto-suggest, 70-90% user confirm)

2. **Cross-Plant Carryover UI**
   - Detect tools with same attributes in different plants
   - Suggest: "Is Tool GUN10 at Plant B the same as GUN10 at Plant A?"
   - Link via UID if confirmed (update labelsByPlant)

3. **Batch Operations**
   - "Approve all high-confidence renames" (confidence > 90%)
   - "Reactivate all deleted entities"
   - "Create alias rules for all similar keys"

4. **Audit Trail Integration**
   - Log all user decisions (link, create new, reactivate)
   - Show in AuditTrailPage with context
   - Enable undo within session

### Phase 2+ Optimizations

1. **Incremental Diff**
   - Only diff entities that changed (via file hash comparison)
   - Skip unchanged files entirely

2. **Diff Caching**
   - Cache computed diffs by fileHash + plantKey
   - Reuse for identical re-imports

3. **Advanced Analytics**
   - Diff timeline: "How did Station ST010 evolve over 10 imports?"
   - Churn metrics: "How many renames per month?"
   - Ambiguity trends: "Are we reducing ambiguities over time?"

---

## Testing Requirements

### Unit Tests Needed

1. **diffEngine.ts**
   - ✅ Basic create/update/delete detection
   - ❌ Rename detection with confidence scoring
   - ❌ Attribute change detection (specific fields)
   - ❌ Plant-scoped key handling

2. **uidResolver.ts**
   - ✅ Alias rule resolution
   - ❌ Fuzzy matching with thresholds
   - ❌ Multi-plant context handling

3. **ambiguityCollector.ts**
   - ❌ Candidate ranking by match score
   - ❌ Reason generation accuracy

### Integration Tests Needed

1. **Full import cycle:**
   - Parse Excel → UID resolution → Diff → Store → Reload
   - Verify persistence across page refresh

2. **Ambiguity resolution workflow:**
   - Import with mutations → Resolve ambiguities → Re-import clean
   - Verify alias rules applied

3. **Multi-plant scenario:**
   - Import Plant A → Import Plant B → Detect cross-plant tools
   - Verify plant-scoped keys

### E2E Tests (Playwright)

From `tests/e2e/import-ambiguity-resolution.spec.ts`:

```typescript
test('resolve ambiguous station via UI', async ({ page }) => {
  // 1. Upload Excel with mutations
  // 2. Navigate to Import Review
  // 3. Click "Link to this" on candidate
  // 4. Verify alias rule created
  // 5. Re-import same file
  // 6. Verify no ambiguities
})
```

**Gap:** E2E test exists but may need expansion for full diff display.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    EXCEL FILE UPLOAD                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │   sheetSniffer.scanWorkbook   │
         │  Detect: ToolList/RobotList   │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │    Parser (toolList/robot)    │
         │   Extract normalized rows     │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │    keyDerivation.ts           │
         │  buildStationKey(row)         │
         │  buildToolKey(row, stationKey)│
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │     uidResolver.ts            │
         │  resolveStationUid(key)       │
         │  - Check aliasRules           │
         │  - Exact match                │
         │  - Fuzzy match → ambiguous    │
         └──────────────┬───────────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
           ▼                         ▼
    ┌─────────────┐          ┌──────────────┐
    │  RESOLVED   │          │  AMBIGUOUS   │
    │  (UID found)│          │  (Multiple   │
    │             │          │   candidates)│
    └──────┬──────┘          └──────┬───────┘
           │                         │
           │                         ▼
           │              ┌─────────────────────┐
           │              │ ambiguityCollector  │
           │              │ Collect candidates  │
           │              └──────┬──────────────┘
           │                     │
           └─────────┬───────────┘
                     │
                     ▼
         ┌──────────────────────────────┐
         │      diffEngine.ts            │
         │  diffStationRecords(prev,new) │
         │  diffToolRecords(prev, new)   │
         │  Classify: C/U/D/R/A          │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │     DiffResult Created        │
         │  - creates: []                │
         │  - updates: []                │
         │  - deletes: []                │
         │  - renamesOrMoves: []         │
         │  - ambiguous: []              │
         │  - summary: {...}             │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │    coreStore.diffResults      │
         │  Store in IndexedDB           │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │   ImportReviewPage.tsx        │
         │  Display ambiguous items      │
         │  User resolves → alias rules  │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │   Re-import triggers          │
         │  Alias rules auto-resolve     │
         │  Diff shows clean (no ambig)  │
         └───────────────────────────────┘
```

---

## Conclusion

### Strengths

1. **Well-structured type system** - DiffResult and related types are comprehensive
2. **Clean separation** - diffEngine, uidResolver, ambiguityCollector distinct responsibilities
3. **Multi-plant awareness** - PlantKey throughout enables cross-plant projects
4. **UID stability** - Immutable UIDs solve identity drift problem
5. **Incremental adoption** - Works alongside legacy asset system

### Weaknesses

1. **Incomplete rename detection** - Only works post-resolution, no fuzzy correlation
2. **Limited UI implementation** - ImportReviewPage only shows ambiguous items
3. **No soft delete workflow** - Deleted entities hidden, no reactivation
4. **Missing analytics** - No diff history or trend analysis
5. **Sparse documentation** - Diff computation logic not documented inline

### Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| User confusion from delete+create for renames | **High** | Add fuzzy rename detection in Phase 1 |
| Ambiguity accumulation over time | **Medium** | Batch alias rule creation, guided resolution |
| DiffResult storage growth | **Low** | Archive old diffs, keep last 50 |
| Performance at 10K+ entities | **Low** | Not expected; optimize if needed |
| Data loss from incorrect links | **High** | Audit trail + undo functionality (Phase 2) |

### Next Steps

**Immediate (This Week):**
1. Complete `coreStore.addDiffResult()` and persistence
2. Expand ImportReviewPage to show all diff categories
3. Add Import History status tracking
4. Write unit tests for diffEngine edge cases

**Short Term (Phase 0 Completion):**
1. Implement soft delete visibility
2. Add diff approval workflow
3. Improve ambiguity resolution UX
4. Document diff computation algorithm

**Medium Term (Phase 1):**
1. Integrate fuzzy matcher into diffEngine
2. Build Registry UI with full CRUD
3. Add audit trail for user decisions
4. Implement cross-plant carryover detection

---

**End of Analysis**
