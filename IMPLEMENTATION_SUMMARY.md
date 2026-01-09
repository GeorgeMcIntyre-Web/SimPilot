# Implementation Summary: Proof of Ambiguity Workflow

## Goal
Produce hard proof that `--mutate-names` exercises the ambiguity workflow end-to-end, with trustworthy reporting.

## Implementation Complete

### ✅ A) Fixed Reporting (Cannot Lie)
**Commit:** `2bc0372` - feat(tools): add per-category row tracking and per-file artifacts

**Changes:**
- Split counters by category in `DatasetSummary`:
  - `simulationStatusRows`
  - `toolListRows`
  - `robotListRows`
  - `assembliesRows`
  - `totalRowsParsed` (sum of all above)

- Track row counts at parse time (before UID resolution):
  - `simulationStatusRowsParsed = result.cells.length`
  - `toolListRowsParsed = result.tools.length`
  - `robotListRowsParsed = result.robots.length`

- Per-file artifact generation:
  - Created `artifacts/.../per-file/<dataset>/<safeFileName>.json`
  - Contains: dataset, fileName, fileCategory, chosenSheetName, metrics (all category counts + mutations), diffCounts (creates/updates/deletes/renames/ambiguous)

- Enhanced summary.md:
  - Added "Row Counts by Category" section
  - Updated table to show: Rows, Mutations, Creates, Updates, Deletes, Renames, Ambiguous, Status
  - Removed redundant "Key Errors" column (not tracked in UID mode)

**Proof:** Run shows tool rows correctly counted:
```
Tool List: 372  (STLA_S_ZAR Tool List.xlsx parsed 372 tools)
```
No more "138" lies.

---

### ✅ B) Deterministic Mutations BEFORE UID Resolution
**Commits:**
- `1beeb78` - refactor(tools): move mutations BEFORE UID resolution
- `23c4153` - test(tools): add pre-resolution mutation tests

**Key Insight:** Mutations must happen BEFORE UID resolution to allow fuzzy matching to detect ambiguity.

**Changes:**
- Added pre-resolution mutation functions:
  - `mutateCellIds(cells: Cell[], config): { mutated: Cell[]; mutationLog: string[] }`
  - `mutateToolIds(tools: Tool[], config)`
  - `mutateRobotIds(robots: Robot[], config)`

- Refactored `uidAwareIngestion.ts`:
  - Parse → **Mutate IDs** → UID Resolution → Collect Ambiguity → Compute Diff
  - Old flow was: Parse → UID Resolution → Mutate Records (created renames, not ambiguity)

- Mutation strategies (seeded, deterministic):
  - Stations: Remove leading zeros, add/remove prefixes (ST/OP), change separators
  - Tools: Add/remove spaces, underscore/space swaps, remove leading zeros
  - Robots: Case changes, prefix additions, space/underscore swaps

- Tests (`mutatePreResolution.test.ts`):
  - Determinism: same seed → same mutations ✅
  - Different seeds → different mutations ✅
  - Mutation rate controls percentage ✅
  - Mutations actually change keys ✅

**Proof:** Console output shows mutations being applied:
```
[INFO] [UidIngestion] Mutated 9 tool IDs before UID resolution
[DEBUG]   - Tool: "tool-AA020 EGR 01" -> "tool-AA020_EGR_01"
[DEBUG]   - Tool: "tool-AL010 PSJ 10" -> "tool-AL 010 PSJ 10"
...
```

---

### ✅ C) Always Write Ambiguity Artifacts
**Commit:** `f57df7d` - feat(tools): always write ambiguity index with explanation

**Changes:**
- Create `artifacts/.../ambiguity/<dataset>/index.json` for EVERY dataset (even when totalAmbiguous === 0)
- Index structure:
  ```json
  {
    "totalAmbiguous": 0,
    "datasetName": "J11006_TMS",
    "timestamp": "2026-01-08T05:53:09.276Z",
    "files": [ { "fileName": "...", "filePath": "...", "ambiguousCount": 0 } ],
    "explanation": "No ambiguous matches produced. Possible reasons: insufficient mutation rate, no collision zones in existing data, or all keys resolved cleanly."
  }
  ```

- Log output clarifies: `- 3 ambiguity index files (always created)`
- Prevents "no folder => maybe bug" confusion

**Proof:** Artifacts directory structure:
```
artifacts/real-data-regress/2026-01-08T05-53-20/
├── summary.json
├── summary.md
├── per-file/
│   ├── BMW/ (15 files)
│   ├── J11006_TMS/ (11 files)
│   └── V801/ (25 files)
└── ambiguity/
    ├── BMW/index.json
    ├── J11006_TMS/index.json
    └── V801/index.json
```

---

## Command to Run

```bash
npm run real-data-regress -- --uid --mutate-names
```

**Expected Output:**
- ✅ Per-category row counts (tool list rows NOT zero)
- ✅ Per-file stats with mutation counts
- ✅ Ambiguity index files (3, one per dataset)
- ✅ Mutation logs showing deterministic ID changes

---

## Where to Find Artifacts

**Latest run:** `artifacts/real-data-regress/2026-01-08T05-53-20/`

**Key files:**
1. `summary.md` - Human-readable report with category breakdowns
2. `summary.json` - Machine-readable full report
3. `per-file/<dataset>/<file>.json` - Detailed stats per file
4. `ambiguity/<dataset>/index.json` - Ambiguity tracking (always present)

**Proof of work:**
```bash
# Category row counts are accurate
cat artifacts/real-data-regress/2026-01-08T05-53-20/summary.md | grep "Tool List:"
# Output: Tool List: 372

# Per-file mutations are tracked
cat "artifacts/real-data-regress/2026-01-08T05-53-20/per-file/J11006_TMS/STLA_S_ZAR_Tool_List.xlsx.json" | grep mutationsApplied
# Output: "mutationsApplied": 9

# Ambiguity index always exists
ls artifacts/real-data-regress/2026-01-08T05-53-20/ambiguity/*/index.json
# Output: BMW/index.json, J11006_TMS/index.json, V801/index.json
```

---

## Current Status: Mutations Applied, But Not Generating Ambiguity

### Root Cause
The mutation strategies (space/underscore swaps, leading zero removal) create **renames**, not **fuzzy collisions**.

**Example:**
- Original: `"tool-AA020 EGR 01"`
- Mutated: `"tool-AA020_EGR_01"`
- Fuzzy matcher sees these as **different enough** that no candidates are returned

### Why Fuzzy Matching Fails
The fuzzy matcher in `fuzzyMatcher.ts` uses:
- Partial key matching (40 points)
- Line/bay/station matching (20-30 points each)
- Tool code matching (30 points)

Our mutations change separators/spacing but don't create:
- **Shared discriminators** (same line+bay, same tool code)
- **Partial key overlaps** (similar prefixes/suffixes)

### Next Steps to Generate Ambiguity

**Option 1: Smarter Collision Strategy** (Recommended)
- Analyze `prevRecords` to find existing "collision zones" (entities sharing discriminators)
- Mutate keys to land IN those zones
- Example: If `tool-AA020-EGR-01` and `tool-AA020-EGR-02` exist, mutate a third to `tool-AA020-EGR-03-VARIANT`
- This guarantees fuzzy matcher returns multiple candidates (partial key match + same tool code)

**Option 2: Cross-File Duplication**
- First file: create entity with key `K1`
- Second file: parse entity with key `K1'` (mutated version of K1)
- If mutation is subtle enough (e.g., `AL_010` → `AL_10`), fuzzy matcher WILL return candidate

**Option 3: Increase Mutation Aggressiveness**
- Current rate: 2%
- Increase to 10-20% for testing
- Use mutations that preserve partial keys: `"AL_010-010"` → `"AL_010-010-VARIANT"` (appends instead of replacing)

### Recommendation
Implement **`ambiguityMutator.ts`** (already scaffolded in commit `1beeb78`):
- Build collision zone index from `prevRecords`
- Select N entities to mutate based on `--mutate-ambiguity-target`
- Mutate keys to collide with existing zones
- Guarantee ambiguity by design

---

## Files Changed

### New Files
- `tools/regressionTypes.ts` - Comprehensive type definitions for regression testing
- `tools/ambiguityMutator.ts` - Scaffolding for deterministic collision-based mutations
- `tools/__tests__/mutatePreResolution.test.ts` - Unit tests for pre-resolution mutations
- `IMPLEMENTATION_SUMMARY.md` - This document

### Modified Files
- `tools/realDataRegress.ts` - Category counters, per-file artifacts, always-write ambiguity index
- `tools/uidAwareIngestion.ts` - Pre-resolution mutation integration
- `tools/identifierMutator.ts` - Pre-resolution mutation functions (mutateCellIds, etc.)

---

## Commits

1. `2bc0372` - feat(tools): add per-category row tracking and per-file artifacts
2. `1beeb78` - refactor(tools): move mutations BEFORE UID resolution
3. `f57df7d` - feat(tools): always write ambiguity index with explanation
4. `23c4153` - test(tools): add pre-resolution mutation tests

---

## Conclusion

✅ **Reporting is trustworthy** - Category breakdowns prove row counts are accurate
✅ **Mutations are deterministic** - Seeded RNG, reproducible results
✅ **Artifacts always created** - No "missing folder" ambiguity
✅ **Infrastructure complete** - Pre-resolution mutations + diff tracking works

⚠️ **Ambiguity not yet generated** - Need smarter collision strategy (see "Next Steps")

The foundation is solid. The next iteration should implement collision-zone analysis to guarantee fuzzy matches.
