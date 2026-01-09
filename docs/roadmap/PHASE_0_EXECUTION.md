# Phase 0 Execution Plan: Excel-Tolerant Ingestion

## Objective

Build a resilient ingestion system that tolerates Excel inconsistencies, produces actionable diffs, and establishes UID-backed identity as the foundation for all future phases.

---

## Work Packages

### WP1: Identity & Linking System

**Scope:**
- UID generation (Stations, Tools, Robots)
- Canonical key derivation from Excel columns (multi-strategy: line+bay+station, area+station, fullLabel)
- Alias rule system (fromKey → UID with plant scope)
- UID resolver (applies aliases → exact match → create new)

**Files:**
- `src/domain/uidTypes.ts` - UID types, EntityRecord interfaces, AliasRule
- `src/ingestion/keyDerivation.ts` - Canonical key builders
- `src/ingestion/uidResolver.ts` - Resolution logic

**Acceptance Checks:**
- [ ] `buildStationKey()` handles all 3 strategies, returns error if insufficient data
- [ ] `resolveStationUid()` checks alias rules first, then existing records, then creates new
- [ ] Alias rules are plant-scoped by default, global if `isGlobal: true`
- [ ] Re-resolving same key with alias rule returns same UID (stable)
- [ ] Unit tests: 100% coverage for key derivation + UID resolution

**Dependencies:** None (foundation)

**Non-Goals:**
- Cross-plant carryover logic (Phase 2)
- Fuzzy matching for aliases (manual only)
- Automatic alias rule creation (user must confirm)

---

### WP2: Diff Engine

**Scope:**
- Compute creates/updates/deletes/renames between prev and new import
- Detect ambiguities (multiple candidates, unknown references)
- Store DiffResult per ImportRun with plantKey and entityType

**Files:**
- `src/ingestion/diffEngine.ts` - Diff computation logic
- `src/domain/uidTypes.ts` - DiffResult, DiffCreate, DiffUpdate, DiffDelete, DiffRenameOrMove, DiffAmbiguous

**Acceptance Checks:**
- [ ] Diff detects creates (new UID not in prev)
- [ ] Diff detects updates (same UID, changed attributes)
- [ ] Diff detects renames (same UID, different key)
- [ ] Diff detects deletes (prev UID not in new)
- [ ] Ambiguous items include candidates with match scores
- [ ] DiffResult includes plantKey, entityType on all items
- [ ] Re-import unchanged Excel → all items in `noChange` category (computed but not stored separately)
- [ ] Unit tests: All diff scenarios covered

**Dependencies:** WP1 (needs UID resolution)

**Non-Goals:**
- Fuzzy rename detection (Phase 1 enhancement)
- Automatic conflict resolution (user must decide)
- Historical diff comparison (only prev vs. new)

---

### WP3: Import Review UI

**Scope:**
- Import History page (list all ImportRuns, status badges)
- Diff viewer (expandable creates/updates/deletes/renames/ambiguities)
- Warning display (plant unknown, unlinked refs)
- Unlinked entity report (tools/robots without valid station)

**Files:**
- `src/app/routes/ImportHistoryPage.tsx` - Main page
- `src/app/routes/UnlinkedEntitiesPage.tsx` (new) - Report page

**Acceptance Checks:**
- [ ] Import History lists all imports, newest first
- [ ] Each import shows: filename, plant, sourceType, counts (created/updated/deleted/renamed/ambiguous), status (clean/needs resolution)
- [ ] Click import → expands diff detail (creates, updates, deletes, renames, ambiguities)
- [ ] Ambiguous items show candidates with match scores and reasons
- [ ] Warnings displayed prominently (e.g., "Plant context PLANT_UNKNOWN")
- [ ] Unlinked report shows tools/robots where stationUid not found or inactive
- [ ] Dark mode support, responsive design
- [ ] Playwright: Navigate to /import-history → see list → click item → see diff

**Dependencies:** WP2 (needs DiffResult), WP4 (needs persistence)

**Non-Goals:**
- Inline ambiguity resolution (Phase 0 just shows; resolution UI is optional polish)
- Historical trend charts (future enhancement)
- Export diff to Excel (Phase 2)

---

### WP4: Persistence & Migrations

**Scope:**
- Schema v3 with UID collections (stationRecords, toolRecords, robotRecords, aliasRules, importRuns, diffResults)
- IndexedDB persistence with migration from v2 → v3
- Snapshot save/load with backward compatibility

**Files:**
- `src/domain/coreStore.ts` - Schema v3 state, upsert methods
- `src/domain/storeSnapshot.ts` - Snapshot serialization, migration logic
- `src/persistence/PersistenceManager.tsx` - Auto-save on changes

**Acceptance Checks:**
- [ ] Schema v3 includes all UID collections
- [ ] `upsertStationRecords()` merges by UID (update if exists, insert if new)
- [ ] `addAliasRules()` deduplicates by (entityType, fromKey)
- [ ] `addImportRun()` appends to list
- [ ] `addDiffResult()` appends to list
- [ ] Migration from v2 → v3: initializes new collections as empty arrays
- [ ] Snapshot save → reload → all data intact (including diffResults)
- [ ] Unit tests: Migration from v2 snapshot preserves old data, adds empty v3 collections

**Dependencies:** WP1 (needs UID types)

**Non-Goals:**
- Cloud sync (local-only for now)
- Snapshot versioning beyond v3 (future phases)
- Compression of large snapshots (optimize later)

---

### WP5: Multi-Plant Support

**Scope:**
- PlantKey detection (filename patterns, metadata, user selection)
- PLANT_UNKNOWN sentinel with warnings
- Plant-scoped keys and alias rules

**Files:**
- `src/ingestion/plantKeyDetector.ts` (new) - Detection logic
- `src/domain/uidTypes.ts` - PLANT_UNKNOWN constant
- UI: Plant selector dropdown on import (if detection fails)

**Acceptance Checks:**
- [ ] Filename patterns detect plant: "STLA_S_ToolList.xlsx" → "STLA_S"
- [ ] Metadata (if present) overrides filename
- [ ] User can manually select plant via dropdown
- [ ] If no detection and no user selection → PLANT_UNKNOWN + warning in DiffResult
- [ ] Alias rules with `plantKey` only match within that plant
- [ ] Alias rules with `isGlobal: true` match across all plants
- [ ] Unit tests: All detection scenarios (filename, metadata, user, unknown)

**Dependencies:** WP1 (needs UID types)

**Non-Goals:**
- Cross-plant carryover detection (Phase 2)
- Plant hierarchy (e.g., Plant A > Line 1 > Area X) - flat for now
- Plant renaming (treat as new plant)

---

### WP6: Unlinked Entity Report

**Scope:**
- Report showing tools/robots where stationUid is null, not found, or inactive
- Warn about orphaned entities
- Suggest resolution (create station, link to existing, inactivate tool)

**Files:**
- `src/app/routes/UnlinkedEntitiesPage.tsx` (new)
- `src/domain/linkingUtils.ts` (new) - Helper to find unlinked entities

**Acceptance Checks:**
- [ ] Report lists tools where `stationUid` is null
- [ ] Report lists tools where `stationUid` points to non-existent station
- [ ] Report lists tools where `stationUid` points to inactive station
- [ ] Each row shows: tool key, plant, referenced station key (if any), suggested actions
- [ ] Suggested actions: "Create station ST010" / "Link to station ST002" / "Inactivate tool"
- [ ] Playwright: Navigate to /unlinked-entities → see list → verify suggested actions

**Dependencies:** WP3 (UI framework), WP4 (persistence)

**Non-Goals:**
- Automatic relinking (user must decide)
- Historical unlinked trends (future)
- Email alerts for unlinked entities (future)

---

## Acceptance Criteria (Phase 0 Complete)

**Functional:**
- [ ] Import Excel → produces DiffResult showing creates/updates/deletes/renames
- [ ] Ambiguities visible with candidate suggestions (not auto-resolved)
- [ ] Plant key unknown triggers warning (not error)
- [ ] Alias rules persist across sessions
- [ ] Re-import unchanged Excel → diff shows all noChange (verify via UI or unit test)
- [ ] Unlinked entities report shows tools/robots without valid station refs
- [ ] Import History shows status: clean / needs resolution

**Technical:**
- [ ] Schema v3 snapshots save/load successfully
- [ ] Unit tests: >80% coverage for UID/key/alias/diff logic
- [ ] Playwright: Import → view diff → see warnings → verify persistence → re-import
- [ ] Typecheck passes (npx tsc --noEmit)
- [ ] Build succeeds (npm run build)

**UX:**
- [ ] Import warnings are clear and actionable ("Station ST020 not found. Did you mean ST002?")
- [ ] Dark mode support in all new UI
- [ ] No breaking changes to existing UI (backward compatible)

---

## Dependencies Between Work Packages

```
WP1 (Identity & Linking)
  └─ Foundation for all other WPs

WP2 (Diff Engine)
  └─ Depends on: WP1 (UID resolution)

WP3 (Import Review UI)
  └─ Depends on: WP2 (DiffResult), WP4 (persistence)

WP4 (Persistence)
  └─ Depends on: WP1 (UID types)

WP5 (Multi-Plant)
  └─ Depends on: WP1 (UID types)
  └─ Integrates with: WP2 (DiffResult plantKey), WP3 (plant display in UI)

WP6 (Unlinked Report)
  └─ Depends on: WP3 (UI framework), WP4 (persistence)
```

**Critical Path:** WP1 → WP2 → WP3 (all other WPs can run in parallel after WP1)

---

## Non-Goals for Phase 0

**Explicitly NOT doing:**
- ❌ Ambiguity resolution UI (user clicks to select candidate) - optional polish, not blocking
- ❌ Fuzzy rename detection (e.g., "ST10" → "ST010" auto-matched) - Phase 1 enhancement
- ❌ Cross-plant carryover detection (e.g., "Tool from Plant A moved to Plant B") - Phase 2
- ❌ Audit trail for imports (who imported, when) - Phase 1 (audit for Registry actions)
- ❌ Excel export - Phase 2
- ❌ In-app entity creation - Phase 1 (Registry CRUD)
- ❌ Permissions/roles - Phase 2
- ❌ Historical diff comparison ("compare import from 2024-11-01 vs. 2024-12-01") - future
- ❌ Notifications/alerts - future
- ❌ Cloud sync - future

---

## Testing Strategy

### Unit Tests (George)
- `keyDerivation.test.ts`: All 3 strategies, error cases
- `uidResolver.test.ts`: Alias application, exact match, create new
- `diffEngine.test.ts`: All diff scenarios (create/update/delete/rename/ambiguous)
- `storeSnapshot.test.ts`: v2 → v3 migration

### Integration Tests (George + Edwin)
- Import flow: Upload Excel → parse → resolve UIDs → compute diff → persist → verify snapshot
- Re-import flow: Upload same Excel → diff shows noChange

### Playwright E2E (Edwin)
- `import-history.spec.ts`: Navigate to /import-history → see list → click item → see diff
- `unlinked-entities.spec.ts`: Navigate to /unlinked-entities → see report
- `import-and-persist.spec.ts`: Upload Excel → reload page → verify import still in history

### Manual Testing Checklist
- [ ] Upload real STLA-S Tool List → verify creates/updates
- [ ] Upload with unknown plant → verify PLANT_UNKNOWN warning
- [ ] Upload with missing station refs → verify unlinked report
- [ ] Re-upload same file → verify all noChange
- [ ] Create alias rule manually → re-upload → verify alias applied
- [ ] Dark mode toggle → verify all new UI renders correctly

---

## Rollout Plan

**Step 1: Foundation (WP1, WP4)**
- Merge UID types, key derivation, UID resolver, schema v3
- Verify typecheck, unit tests pass
- No UI changes yet (backend-only)

**Step 2: Diff Engine (WP2)**
- Merge diff computation logic
- Unit tests for all diff scenarios
- Still no UI changes

**Step 3: Import Review UI (WP3)**
- Merge Import History page
- Verify Playwright tests pass
- First user-visible feature

**Step 4: Multi-Plant + Unlinked Report (WP5, WP6)**
- Merge plant detection + unlinked report
- Full Phase 0 functionality visible

**Step 5: Polish & Stabilization**
- Fix bugs from user testing
- Add optional ambiguity resolution UI if time permits
- Update docs

---

## How to Verify Phase 0 is Complete

**Smoke Test Flow:**
1. Upload a real Tool List Excel file
2. Navigate to /import-history → see the import listed with status
3. Click the import → see diff detail (creates, updates, etc.)
4. Navigate to /unlinked-entities → see any tools without valid stations
5. Reload the page → verify import history still visible (persistence works)
6. Upload the same Excel again → diff should show mostly noChange
7. Manually add an alias rule in Registry (Phase 1)
8. Upload again → verify alias applied

**Pass Criteria:**
- All steps complete without errors
- Warnings are clear and actionable
- Persistence survives reload
- Alias rules work as expected

---

**Last Updated:** 2026-01-07
**Owner:** George (backend/linking) + Edwin (UI/E2E)
