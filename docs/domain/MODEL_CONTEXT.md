# Model as Context Metadata

## Core Concept

**Model (vehicle program) is context metadata, NOT part of the physical hierarchy.**

### Physical Hierarchy (Correct)
```
Project → Plant → Area → Station → Equipment (Tools/Robots)
```

**Model is orthogonal to this hierarchy** - it represents what is being built, not where it's being built.

## Key Principles

1. **Stations are Physical Infrastructure**
   - A station (e.g., "Station 010") exists at a specific Plant and Area
   - It can be reconfigured to build different Models over time
   - The station's UID and identity do NOT change when the Model changes

2. **Areas Can Run Multiple Models**
   - An Area (manufacturing line) may build Model A this month, Model B next
   - Nesting "Model → Area" implies exclusivity, which is physically incorrect
   - Areas are spatial containers; Models are temporal/product assignments

3. **Model Does NOT Affect Identity**
   - Station keys: derived from `Plant + Area + StationNo` (no Model)
   - Tool/Robot keys: derived from location + identifier (no Model)
   - UIDs: stable across Model changes
   - **Changing a Model should never fragment entity identity**

4. **Model is Import Context**
   - Each ImportRun optionally captures `modelKey` (e.g., "STLA-S", "GLC_X254")
   - This provides traceability: "Which import was for which Model?"
   - Model context appears in warnings, audit logs, and import history

## Examples

### Correct: Model as Context
```typescript
// Import 1: STLA-S import
ImportRun {
  id: "run_001",
  modelKey: "STLA-S",
  plantKey: "PLANT_KOKOMO",
  sourceFileName: "STLA-S_ToolList_2026-01.xlsx"
}

// Station 010 is referenced → lastSeenImportRunId = "run_001"
StationRecord {
  uid: "st_abc123",
  key: "KOKOMO_AL_010",
  plantKey: "PLANT_KOKOMO",
  lastSeenImportRunId: "run_001"  // Links to STLA-S import
}

// Import 2: GLC X254 import (same Area, different Model)
ImportRun {
  id: "run_002",
  modelKey: "GLC_X254",
  plantKey: "PLANT_KOKOMO",
  sourceFileName: "GLC_X254_ToolList_2026-02.xlsx"
}

// Same Station 010, now running GLC X254
StationRecord {
  uid: "st_abc123",                // SAME UID (physical station unchanged)
  key: "KOKOMO_AL_010",            // SAME KEY
  plantKey: "PLANT_KOKOMO",        // SAME PLANT
  lastSeenImportRunId: "run_002"  // Updated to GLC X254 import
}
```

**Result**: Station identity stable. Model context tracked via ImportRun linkage.

### Incorrect: Model in Hierarchy (Anti-pattern)
```typescript
// ❌ WRONG: Nesting Model → Area → Station
Project {
  model: "STLA-S",
  areas: [
    { name: "AL Line", stations: [...] }  // ❌ Implies stations "belong" to Model
  ]
}

// When Model changes, what happens to stations?
// - Create new stations? (identity fragmentation)
// - Move stations? (breaks hierarchy)
// - Duplicate stations? (data inconsistency)
```

**Problem**: Physical entities cannot be nested under transient product assignments.

## Future: Model Assignments (Phase 2+)

For advanced use cases, we may introduce **Model Assignment Records**:

```typescript
// Future-ready type (not implemented yet)
interface StationModelAssignment {
  stationUid: StationUid
  modelKey: ModelKey
  plantKey: PlantKey
  areaKey: string
  status: 'active' | 'inactive'
  effectiveFrom?: string  // ISO timestamp
  effectiveTo?: string    // ISO timestamp
}
```

**Use case**: "Station 010 ran STLA-S from Jan-Mar 2026, then switched to GLC X254 in Apr 2026."

**Important**: Even with assignments, the station's UID and key remain unchanged. Assignments are historical metadata, not identity.

## Implementation Guidelines

### ✅ Do This
- Store `modelKey?: string` on ImportRun
- Display Model context in import history and warnings
- Use Model for filtering/grouping in analytics (e.g., "Show imports for STLA-S")
- Infer Model from filename/sheet/metadata or user selection

### ❌ Don't Do This
- **NEVER** use Model in key derivation (`deriveStationKey()` ignores Model)
- **NEVER** nest Areas under Models in domain types
- **NEVER** use Model to uniquely identify stations/tools/robots
- **NEVER** require Excel to specify Model (it's optional metadata)

## Ingestion Behavior

1. **Model Detection** (optional, best-effort):
   - Scan filename: `STLA-S_ToolList.xlsx` → modelKey = "STLA-S"
   - Scan sheet names: "GLC X254 Tools" → modelKey = "GLC_X254"
   - User selection: UI dropdown for Model (if ambiguous)
   - Default: `modelKey = undefined` (no Model context)

2. **Model Storage**:
   - Stored on ImportRun record
   - NOT stored on StationRecord/ToolRecord/RobotRecord directly
   - Linkage via `lastSeenImportRunId` → ImportRun → modelKey

3. **Model in Warnings**:
   ```
   Warning: Station 010 referenced in STLA-S import but marked inactive
   Warning: Tool GUN10 missing in GLC X254 import (last seen in STLA-S import 30+ days ago)
   ```

## Migration Path

### Backward Compatibility
- Existing ImportRuns without `modelKey` remain valid (treated as `modelKey = undefined`)
- No breaking changes to persistence or identity
- Model context is additive enhancement, not required field

### Forward Compatibility
- Future Phase 2+ may add `StationModelAssignment` records
- These will reference existing StationUIDs without changing them
- Model assignments will be temporal metadata on top of stable physical entities

## Summary

| Aspect | Approach |
|--------|----------|
| **Hierarchy** | Project → Plant → Area → Station (no Model) |
| **Identity** | UID-backed, Model-independent |
| **Context** | ImportRun.modelKey (optional) |
| **Traceability** | lastSeenImportRunId → ImportRun → modelKey |
| **Future** | Model assignments as temporal metadata (Phase 2+) |
| **Excel** | No changes required; Model inferred or user-selected |

**Key Insight**: Areas are WHERE things happen. Models are WHAT is being built. These are orthogonal concepts and must not be conflated in the hierarchy.

---

**Last Updated**: 2026-01-07
**See Also**: [DECISION_LOG.md](../roadmap/DECISION_LOG.md#dec-011-model-is-context-metadata-not-hierarchy), [UID_BACKED_LINKING.md](../UID_BACKED_LINKING.md)
