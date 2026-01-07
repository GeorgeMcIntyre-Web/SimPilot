# Ambiguity Resolution Workflow

## Overview

This document describes the complete workflow for detecting, exporting, and resolving ambiguous entity matches using the Real Data Regression Harness and the Web UI.

## What is Ambiguity?

**Ambiguity** occurs when SimPilot's fuzzy matching engine finds multiple candidate entities that could match a new key, but cannot automatically determine the correct match. This requires human review to decide whether:

1. The new key should link to an existing entity (create an alias rule)
2. The new key represents a genuinely new entity (create a new record)

Common causes of ambiguity:
- **Identifier drift**: "AL_010-010" vs "AL_10-10" (leading zeros removed)
- **Prefix changes**: "ST010" vs "010" (station prefix added/removed)
- **Spacing variations**: "GUN01" vs "GUN 01" (tool code formatting)
- **Multiple similar entities**: Two stations with similar labels in the same bay

## Features

### 1. --mutate-names Flag (CLI)

**Purpose**: Simulate real-world identifier drift for testing.

**Location**: `tools/realDataRegress.ts`

**Usage**:
```bash
# Run regression with identifier mutations
npm run real-data-regress -- --uid --mutate-names

# Or with strict mode (fails if ambiguous > 0)
npm run real-data-regress -- --uid --mutate-names --strict
```

**What it does**:
- Mutates ~1-2% of entity identifiers in-memory (does NOT modify Excel files)
- Applies realistic mutation strategies:
  - Remove leading zeros: "010" → "10"
  - Add/remove prefixes: "ST010"/"OP010"
  - Change spacing: "GUN01" → "GUN 01"
  - Change separators: "_" ↔ "-"
- Causes ambiguity when mutated keys match multiple existing entities
- Generates ambiguity bundle JSON files in `artifacts/`

**Mutation Configuration**:
```typescript
// Default: 1.5% mutation rate, seeded RNG for reproducibility
{
  mutationRate: 0.015,
  seed: 42
}
```

**Requirements**:
- Must be used with `--uid` flag (UID-aware ingestion)
- Recommended to use with `--strict` for CI/CD validation

### 2. Ambiguity Bundle Import (Web UI)

**Purpose**: Load and resolve ambiguous matches from regression harness output.

**Location**: `src/app/routes/AmbiguityBundleImportPage.tsx`

**Access**:
- Navigate to **Import History** page
- Click **"Import Ambiguity Bundle"** button
- Or visit `/ambiguity-bundle-import` directly

**Workflow**:

#### Step 1: Run Regression Harness
```bash
# Run with mutations to generate ambiguities
npm run real-data-regress -- --uid --mutate-names
```

#### Step 2: Locate Ambiguity Bundle
```
artifacts/real-data-regress/[timestamp]/ambiguity/[dataset]/
  ├── file1_ambiguity.json
  ├── file2_ambiguity.json
  └── file3_ambiguity.json
```

Example bundle JSON:
```json
{
  "fileName": "STLA_S_Tool_List.xlsx",
  "filePath": "C:\\...\\STLA_S_Tool_List.xlsx",
  "ambiguousItems": [
    {
      "newKey": "AL_10-10",
      "plantKey": "PLANT_TEST",
      "entityType": "station",
      "newAttributes": {...},
      "candidates": [
        {
          "uid": "st_abc123",
          "key": "AL_010-010",
          "plantKey": "PLANT_TEST",
          "matchScore": 85,
          "reasons": ["Same line", "Same bay", "Similar station number"]
        },
        {
          "uid": "st_xyz789",
          "key": "AL_010-011",
          "plantKey": "PLANT_TEST",
          "matchScore": 82,
          "reasons": ["Same line", "Same bay"]
        }
      ],
      "action": "resolve"
    }
  ],
  "totalAmbiguous": 1
}
```

#### Step 3: Import Bundle
1. Click **"Select Ambiguity Bundle"**
2. Choose `*_ambiguity.json` file
3. UI loads all ambiguous items

#### Step 4: Resolve Ambiguities
For each ambiguous item:

**Option A: Link to Existing Entity**
- Review candidate matches with scores and reasons
- Click **"Link to this"** for the correct match
- Creates an alias rule: `newKey → existingUid`
- Alias rule persisted in registry for future imports

**Option B: Create New Entity**
- Click **"Create as new entity"**
- Tells system this is genuinely new, not a rename
- No alias rule created

#### Step 5: Verify Alias Rules
- Navigate to **Registry** page
- View all created alias rules
- Verify `fromKey → toUid` mappings
- Delete incorrect rules if needed

#### Step 6: Re-import Data
- Re-run ingestion on the same files
- Alias rules now automatically resolve previously ambiguous keys
- No ambiguity prompts for resolved items

## Bundle JSON Schema

```typescript
interface AmbiguityBundle {
  fileName: string               // Original Excel filename
  filePath: string               // Full path to Excel file
  ambiguousItems: DiffAmbiguous[] // Array of ambiguous matches
  totalAmbiguous: number         // Count of ambiguous items
}

interface DiffAmbiguous {
  newKey: string                 // New canonical key trying to import
  plantKey: PlantKey            // Plant context for scoping
  entityType: 'station' | 'tool' | 'robot'
  newAttributes: Record<string, any>  // Raw attributes from Excel
  candidates: Array<{
    uid: EntityUid              // UID of candidate match
    key: string                 // Current key of candidate
    plantKey: PlantKey
    matchScore: number          // Similarity score (0-100)
    reasons: string[]           // Why this is a candidate
  }>
  action: 'resolve'             // User must choose action
}
```

## Command Reference

### Basic Regression
```bash
# Legacy ingestion (no UID tracking)
npm run real-data-regress
```

### UID-Aware Regression
```bash
# Enable UID resolver + diff tracking
npm run real-data-regress -- --uid
```

### With Identifier Mutations
```bash
# Mutate ~1-2% of identifiers to simulate drift
npm run real-data-regress -- --uid --mutate-names
```

### Strict Mode (CI/CD)
```bash
# Fail if ambiguous > 0 OR key errors > 0 OR unresolved links > 0
npm run real-data-regress -- --uid --mutate-names --strict
```

### Custom Mutation Rate
```typescript
// Edit tools/identifierMutator.ts
const DEFAULT_CONFIG: MutationConfig = {
  mutationRate: 0.02, // 2% instead of 1.5%
  seed: 42
}
```

## Best Practices

### 1. Testing Ambiguity Detection
- Always run with `--uid --mutate-names` when testing ambiguity workflow
- Use `--strict` to fail builds if ambiguities are not resolved
- Review mutation logs to understand what changed

### 2. Resolving Ambiguities
- **Check match scores**: Higher scores are more likely correct
- **Review reasons**: Look for shared line/bay/station attributes
- **Verify with source data**: Check Excel files when unsure
- **Be conservative**: If truly unsure, create new entity rather than incorrect link

### 3. Alias Rule Management
- **Document reasoning**: Add clear descriptions when creating rules
- **Audit regularly**: Review registry for incorrect mappings
- **Test after creation**: Re-import to verify rules work correctly
- **Delete bad rules**: Remove incorrect mappings immediately

### 4. CI/CD Integration
```yaml
# Example GitHub Actions workflow
- name: Run Regression with Strict Mode
  run: npm run real-data-regress -- --uid --strict

- name: Upload Ambiguity Bundles on Failure
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: ambiguity-bundles
    path: artifacts/real-data-regress/**/ambiguity/*.json
```

## Troubleshooting

### "Invalid bundle format: missing ambiguousItems array"
**Cause**: Loaded wrong JSON file or corrupted bundle.
**Fix**: Ensure you're loading `*_ambiguity.json` from `artifacts/real-data-regress/[timestamp]/ambiguity/`

### No ambiguities generated with --mutate-names
**Cause**: Mutations may not have created ambiguities (random selection).
**Fix**:
- Increase mutation rate in `identifierMutator.ts`
- Run multiple times (different random seeds)
- Check mutation logs to verify mutations were applied

### Alias rules not working after import
**Cause**: Alias rule may have incorrect fromKey or toUid.
**Fix**:
- Check registry for exact key string (case-sensitive)
- Verify UID exists in station/tool/robot records
- Check plant key scope matches

### Too many false ambiguities
**Cause**: Fuzzy matching thresholds too aggressive.
**Fix**:
- Review `uidResolver.ts` match score thresholds
- Consider adjusting similarity scoring in fuzzy matcher
- File issue with examples for threshold tuning

## Related Documentation

- [Real Data Regression Harness](./REAL_DATA_REGRESS.md)
- [UID Linking Architecture](./domain/UID_LINKING.md)
- [Ambiguity Resolution Domain](./domain/AMBIGUITY_RESOLUTION.md)
- [Ingestion Pipeline](../src/ingestion/README.md)

## Examples

### Example 1: Station Renumbering
```
Old Key: AL_010-010
New Key: AL_10-10
Match Score: 95
Reasons: ["Same line", "Same bay", "Similar station number"]
Action: Link to existing (station was renumbered without leading zeros)
```

### Example 2: Tool Code Reformatting
```
Old Key: GUN01
New Key: GUN 01
Match Score: 92
Reasons: ["Same tool code", "Same station"]
Action: Link to existing (tool code gained space character)
```

### Example 3: Genuinely New Station
```
Old Key: AL_010-010
New Key: AL_010-012
Match Score: 78
Reasons: ["Same line", "Same bay"]
Action: Create new (station 012 is distinct from 010)
```

## API Reference

### identifierMutator.ts
```typescript
// Apply mutations to all entity types
applyMutations(
  stationRecords: StationRecord[],
  toolRecords: ToolRecord[],
  robotRecords: RobotRecord[],
  config?: MutationConfig
): {
  stations: StationRecord[]
  tools: ToolRecord[]
  robots: RobotRecord[]
  totalMutations: number
}

// Mutation strategies
mutateStationKey(key: string): string
mutateToolKey(key: string): string
mutateRobotKey(key: string): string
```

### AmbiguityBundleImportPage.tsx
```typescript
// Component state
interface AmbiguityBundle {
  fileName: string
  filePath: string
  ambiguousItems: DiffAmbiguous[]
  totalAmbiguous: number
}

// Actions
handleFileSelect(file: File): Promise<void>
handleLinkToCandidate(key: string, uid: string, entityType: string): void
handleCreateNew(key: string): void
```
