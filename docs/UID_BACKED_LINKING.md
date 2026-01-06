# UID-Backed Excel Linking System

## Problem Statement

Manufacturing stations and tools are referenced inconsistently across documents, time, and plants:

- **Identity is split across columns**: Line + Bay + StationNo (e.g., "AL", "010") vs shortened labels (e.g., "AL010")
- **Labels change over time**: Station renumbering during planning-to-as-built transitions
- **Multiple source documents**: Tool List, Robot List, Simulation Status must link reliably
- **No stable identifier**: Excel files lack a canonical "Station_ID" or "Tool_ID" column
- **Multi-plant projects**: Same physical tooling carried over between plants, renamed per plant
- **Cross-plant ambiguity**: "Tool GJR10 at Plant A" vs "Gun 10 at Plant B" - same physical tool?

Current canonical IDs (`buildStationId("AREA", "STATION")` → `"AREA|STATION"`) are **labels, not identities**. When station numbers change or tooling moves between plants, these IDs break, causing tools and robots to become orphaned.

## Solution: Stable UIDs + Derived Keys + Alias Rules

### Core Concepts

**1. UID (Unique Identifier)** - Immutable, opaque identifier assigned on first import
- Format: `st_<uuid>` (stations), `tl_<uuid>` (tools), `rb_<uuid>` (robots)
- Generated using `crypto.randomUUID()` with entity-type prefix
- Never changes, even when entity is renamed/moved/renumbered **or used at different plants**
- ToolUid represents the **physical equipment**, not the plant-specific label

**2. PlantKey** - First-class dimension for multi-plant projects
- Format: `"PLANT_A"`, `"PLANT_B"`, or `"PLANT_UNKNOWN"` (sentinel)
- Derived from:
  - Workbook filename conventions (e.g., "STLA_S_PLANT_TORINO_...")
  - Sheet header metadata
  - User selection at import time (fallback)
- Keys are **plant-scoped** to avoid collisions
- Same tool at different plants has different keys but same UID

**3. Canonical Key** - Deterministic string derived from Excel columns (plant-aware)
- Built from available columns using deterministic rules
- **Plant-scoped** to prevent collisions:
  - Station: `"${plantKey}::${line}_${bay}-${station3}"` or `"${plantKey}::${area}|${station}"`
  - Tool: `"${stationKey}::${toolIdentifier}"`
- Examples: `"PLANT_A::AL_010-010"`, `"PLANT_B::REAR UNIT|010"`
- Used for matching during import
- **Can and will change over time** (this is expected and handled)

**4. Alias Rules** - User-confirmed mappings from old keys to UIDs (plant-scoped)
- When a key changes but entity is the same, user confirms: `{fromKey: "PLANT_A::CA_008-010", toUid: "st_abc123", plantKey: "PLANT_A"}`
- **Plant scope**: Alias applies only within that plant (unless explicitly marked global)
- Enables human-in-the-loop resolution of ambiguous renames
- Persisted in database so future imports don't re-ask

**5. Cross-Plant Tool Identity** - Same physical tool, multiple plant labels
- ToolRecord stores:
  - `uid`: Stable across plants
  - `currentKey`: Plant-specific key
  - `labelsByPlant`: Different labels per plant
  - `stationUidByPlant`: Station mapping per plant (tools can move!)
- User decides: "Is this the same physical tool carried over?"

### What Exists Today (Before This Feature)

**Ingestion Pipeline:**
- [normalizers.ts](src/ingestion/normalizers.ts) provides `buildStationId()`, `buildRobotId()`, `buildToolId()`
- These create canonical label-based IDs: `"AREA|STATION"`, `"STATION_ID|R:CAPTION"`, `"STATION_ID|T:TOOLCODE"`
- [applyIngestedData.ts](src/ingestion/applyIngestedData.ts) links robots/tools to cells via `stationId` matching
- [relationshipLinker.ts](src/ingestion/relationshipLinker.ts) performs O(1) linking using stationId index

**Persistence:**
- [storeSnapshot.ts](src/domain/storeSnapshot.ts) defines schema v2
- Current schema: `projects[]`, `areas[]`, `cells[]`, `assets[]` (UnifiedAsset[])
- [UnifiedModel.ts](src/domain/UnifiedModel.ts) defines asset structure with `stationId`, `robotId`, `toolId` fields
- IndexedDB persistence via [indexedDbService.ts](src/persistence/indexedDbService.ts)

**Problem with Current Approach:**
- When station "010" becomes "010A" during as-built phase, `stationId` changes from `"REAR UNIT|010"` → `"REAR UNIT|10A"`
- All tools/robots with old `stationId` fail to link to cells
- User must manually re-import and hope for fuzzy matches (unreliable)

### What This Feature Adds

**New Domain Types:**
- `StationRecord` with `uid`, `key`, `labels`, `status`, timestamps
- `ToolRecord` with `uid`, `key`, `stationUid` (foreign key)
- `RobotRecord` with `uid`, `key`, `stationUid` (foreign key)
- `AliasRule` for user-confirmed key→uid mappings
- `ImportRun` for tracking import operations with CRUD counts

**New Canonical Key Derivation:**
- `buildStationKey(rawRow)` → deterministic key from split columns
- `buildToolKey(rawRow, stationKey)` → tool key scoped to station
- Normalizes whitespace, case, station number formatting (3-digit padding)
- Returns structured error if required columns missing

**UID Resolution Pipeline:**
- On import, resolve key → uid via:
  1. Explicit `AliasRule` (fromKey → toUid)
  2. Exact match in `StationRecord` (key → uid)
  3. Strong composite match (high confidence, unique candidate)
  4. Otherwise: **ambiguous** → user must decide
- Never auto-link when ambiguous (multiple candidates or low confidence)

**Diff Engine:**
- `diffToolListImport(prev, next)` → `DiffResult`
- Detects: creates, updates, deletes (soft), rename/move suspects, ambiguous cases
- Rename/move detection: one key disappears, one appears, attributes match strongly
- Only suggests rename if confidence high AND unique candidate
- Otherwise: reports as ambiguous requiring user decision

**UI for Resolution:**
- Import review screen shows diff summary (counts + expandable lists)
- Ambiguous items displayed with candidate matches
- User chooses: "Same entity" (creates AliasRule) OR "Create new"
- After resolution, re-run import to confirm no more ambiguities

**Schema Migration v2 → v3:**
- Add `stationRecords`, `toolRecords`, `robotRecords`, `aliasRules`, `importRuns` collections
- Preserve existing `assets[]`, `cells[]`, etc. for backward compatibility
- Initialize new collections as empty arrays
- Safe migration: old snapshots continue to load without errors

### Entity Structures

**StationRecord:**
```typescript
{
  uid: "st_01234567-89ab-cdef-0123-456789abcdef",
  key: "AL_010-010",  // Current derived key
  labels: {
    line: "AL",
    bay: "010",
    stationNo: "010",
    area: "REAR UNIT",
    fullLabel: "AL010"
  },
  attributes: {...},  // Metadata from Excel
  status: "active",   // or "inactive" (soft delete)
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-20T14:22:00.000Z"
}
```

**ToolRecord:**
```typescript
{
  uid: "tl_fedcba98-7654-3210-fedc-ba9876543210",
  key: "AL_010-010::GJR 10",
  stationUid: "st_01234567-89ab-cdef-0123-456789abcdef",
  labels: {
    toolCode: "GJR 10",
    toolName: "Spot Weld Gun 10",
    gunNumber: "GUN 10"
  },
  attributes: {...},
  status: "active",
  createdAt: "2024-01-15T10:30:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z"
}
```

**AliasRule:**
```typescript
{
  fromKey: "CA_008-010",      // Old key
  toUid: "st_abc...",          // Target entity UID
  entityType: "station",
  reason: "User confirmed station renumbered from 010 to 010A",
  createdAt: "2024-01-20T15:00:00.000Z",
  createdBy: "user@example.com"  // Optional
}
```

**ImportRun:**
```typescript
{
  id: "run_xyz...",
  sourceFileName: "EquipmentList_2024-01-20.xlsx",
  sourceType: "toolList",
  importedAt: "2024-01-20T14:00:00.000Z",
  fileHash: "sha256-abc123...",
  counts: {
    created: 5,
    updated: 12,
    deleted: 2,
    renamed: 3,
    ambiguous: 1
  }
}
```

### Key Derivation Rules

**Station Key Strategies (in priority order):**

1. **Line + Bay + Station** (most specific):
   ```
   line="AL", bay="010", station="10"
   → key = "AL_010-010"
   ```

2. **Area + Station**:
   ```
   area="REAR UNIT", station="008"
   → key = "REAR UNIT|008"
   ```

3. **Full Label** (fallback):
   ```
   stationLabel="CA008"
   → key = "CA008"
   ```

**Normalization:**
- Station numbers: 3-digit padding ("10" → "010")
- Strip prefixes: "OP010" → "010", "ST010" → "010"
- Uppercase, collapse whitespace
- Remove special characters (except dash, underscore, pipe)

**Tool Key:**
```
toolKey = "${stationKey}::${toolCode}"
Example: "AL_010-010::GJR 10"
```

### Import Flow

```
1. Parse Excel → normalize rows
2. For each row:
   a. Derive stationKey using buildStationKey()
   b. Resolve stationUid:
      - Check aliasRules: fromKey → toUid
      - Check stationRecords: key → uid (exact match)
      - Check strong composite match (if unique + high confidence)
      - Else: mark ambiguous
   c. Derive toolKey
   d. Resolve toolUid (same logic)
3. Compute diff:
   - Compare prev entities vs new rows
   - Classify: create, update, delete, rename, ambiguous
4. Show diff to user
5. User resolves ambiguous items
6. Persist:
   - Upsert stationRecords, toolRecords
   - Save aliasRules
   - Record importRun
```

### Ambiguity Handling

**Never auto-link when:**
- Multiple existing entities match strongly (can't choose)
- New key has no clear predecessor (could be genuinely new)
- Confidence score below threshold (< 80%)

**Always ask user when:**
- One old entity disappears AND one new appears AND attributes match ≥80%
- User sees candidates with match scores and reasons
- User chooses: "Same entity" → create AliasRule, OR "Create new" → new UID

**Ambiguous Item Display:**
```
New station "AL_010-010A" could be:
  1. Station "st_abc123" (key: "AL_010-010")
     Match score: 85%
     Reasons: Same line/bay, same tool count, station number similar
  2. Create new station

User selects option 1 → AliasRule created: "AL_010-010A" → "st_abc123"
```

### Diff Report Structure

```typescript
DiffResult {
  creates: [
    { key: "BN_012-020", attributes: {...}, suggestedName: "BN012 New Station" }
  ],
  updates: [
    { uid: "st_xyz", key: "AL_010-010", changedFields: ["oemModel", "toolCount"] }
  ],
  deletes: [
    { uid: "st_old", key: "CA_008-005", lastSeen: "2024-01-15T..." }
  ],
  renamesOrMoves: [
    {
      oldKey: "CA_008-010",
      newKey: "CA_008-010A",
      uid: "st_abc",
      confidence: 92,
      matchReasons: ["Same tools", "Same robot", "Station number similar"],
      requiresUserDecision: false  // High confidence, auto-applied
    }
  ],
  ambiguous: [
    {
      newKey: "AL_010-015",
      candidates: [
        { uid: "st_123", key: "AL_010-014", matchScore: 75, reasons: [...] },
        { uid: "st_456", key: "AL_011-015", matchScore: 70, reasons: [...] }
      ],
      action: "resolve"  // User must decide
    }
  ]
}
```

### Linking to Other Documents

**Robot List and Simulation Status:**
- Use same `buildStationKey()` logic for consistency
- Resolve stationKey → stationUid via aliasRules and stationRecords
- Report unlinked references clearly as warnings:
  ```
  "Unlinked station reference: 'AL_010-020' in RobotList.xlsx (no matching StationRecord or AliasRule)"
  ```

### Known Limitations

1. **Canonical name column missing in Excel**
   - This is the real long-term fix
   - Once OEM adds stable "Station_ID" column, import that directly as key
   - UIDs become simpler (1:1 key→uid mapping)
   - This feature is a workaround until Excel improves

2. **Human decisions required**
   - Ambiguous merges/splits need user input
   - No automatic resolution when confidence is low or multiple candidates exist
   - User must understand domain (which station is which)

3. **Alias rule accumulation**
   - Over time, aliasRules table grows with historical mappings
   - Once Excel adds stable IDs, sunset this system
   - Provide migration tool to convert aliasRules → simple key mappings

4. **Split/merge not implemented**
   - One station becoming two (or vice versa) not automatically detected
   - User must manually handle these cases as "create new" + "mark old inactive"

5. **Performance at scale**
   - Current implementation: in-memory diff computation
   - For 10,000+ stations, may need indexing or incremental diff
   - Not a concern for typical projects (100-500 stations)

## Future: Canonical Name in Excel

**When OEM adds "Station_ID" column:**
- Import as canonical key directly (no derivation needed)
- UID system simplifies to 1:1 key→uid mapping
- Alias rules only for historical data (pre-stable-ID)
- Key derivation logic becomes fallback for legacy files

**Migration Path:**
- Detect "Station_ID" column in Excel
- Use as primary key, fallback to derivation if missing
- Gradually phase out derived keys as files standardize
- Keep UID layer for identity stability (still valuable)

## Implementation Notes

**Files Modified:**
- `src/domain/uidTypes.ts` (new) - UID types, records, diff structures
- `src/ingestion/keyDerivation.ts` (new) - Canonical key derivation
- `src/ingestion/uidResolver.ts` (new) - UID resolution logic
- `src/ingestion/diffEngine.ts` (new) - CRUD + rename/move detection
- `src/domain/storeSnapshot.ts` - Schema v2 → v3 migration
- `src/persistence/indexedDbService.ts` - Extended for new collections
- `src/app/components/ImportReview.tsx` (new) - UI for diff review

**Testing:**
- Unit tests: key derivation, diff engine, alias resolution
- E2E test: import → diff → resolve ambiguity → re-import → verify

**Backward Compatibility:**
- Old snapshots (v2) continue to load
- New collections initialized as empty arrays
- Existing `assets[]` and linking logic unchanged (runs in parallel)
