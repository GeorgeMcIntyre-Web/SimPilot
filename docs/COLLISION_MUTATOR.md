# Collision-Zone Ambiguity Mutator

## Overview

The collision-zone mutator deterministically creates ambiguous UID matches by mutating incoming entities to share discriminators with existing records, forcing the fuzzy matcher to return multiple candidates.

## Strategy

Unlike `--mutate-names` (which creates rename drift), `--mutate-ambiguity` creates **guaranteed collisions**:

1. **Build Collision Zone Index**: Group existing `prevRecords` by shared discriminators
   - **Stations**: `(line, bay)` - stations in the same line+bay
   - **Tools**: `toolCode` - tools sharing the same code
   - **Robots**: `robotCaption` prefix - robots with similar captions

2. **Select Victims**: Deterministically choose entities to mutate using seeded RNG

3. **Mutate to Collide**: Change entity keys/labels to land in collision zones
   - Same discriminators as existing records
   - Different enough to avoid exact match
   - Forces fuzzy matcher to return 2+ candidates with similar scores

## Usage

```bash
# Basic usage
npm run real-data-regress -- --uid --mutate-ambiguity

# With seed for reproducibility
npm run real-data-regress -- --uid --mutate-ambiguity --seed=123

# Adjust target ambiguous count
npm run real-data-regress -- --uid --mutate-ambiguity --seed=123 --mutate-ambiguity-target=10
```

## CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--mutate-ambiguity` | false | Enable collision-zone mutations (requires `--uid`) |
| `--seed=N` | 1 | Random seed for deterministic mutations |
| `--mutate-ambiguity-target=N` | 5 | Target number of ambiguous items per dataset |

## Collision Strategies

### Stations (Cells)
- **Discriminators**: `line` + `bay`
- **Collision Zone**: Stations sharing the same line and bay
- **Mutation**: Keep target's line+bay, generate unique stationNo variant
- **Example**:
  - Existing: `BA_B05_010`, `BA_B05_020` (zone: `BA_B05`)
  - Mutated: `BA_B05_010-COL3` (shares `BA_B05`, different station number)

### Tools
- **Discriminators**: `toolCode`
- **Collision Zone**: Tools sharing the same tool code
- **Mutation**: Keep target's toolCode, append collision suffix
- **Example**:
  - Existing: `tool-AA020-EGR-01`, `tool-AA020-EGR-02` (zone: `AA020`)
  - Mutated: `tool-AA020-COLLISION847` (shares toolCode, different suffix)

### Robots
- **Discriminators**: `robotCaption` prefix (first 5 chars)
- **Collision Zone**: Robots sharing caption prefix
- **Mutation**: Keep target's prefix, append collision suffix
- **Example**:
  - Existing: `robot-BA_B0-R01`, `robot-BA_B0-R02` (zone: `BA_B0`)
  - Mutated: `robot-BA_B0-COLLISION234` (shares prefix, different suffix)

## How It Works

### 1. Pre-Resolution Mutation
Mutations happen **before** UID resolution:
```
Parse Excel → Mutate IDs → UID Resolution → Fuzzy Match → Ambiguity Detection
```

### 2. Collision Zone Detection
```typescript
// Example: Finding tool collision zones
const zoneIndex = new Map<string, ToolRecord[]>()
for (const record of prevRecords) {
  const toolCode = record.labels.toolCode
  if (!zoneIndex.has(toolCode)) {
    zoneIndex.set(toolCode, [])
  }
  zoneIndex.get(toolCode).push(record)
}

// Filter to zones with 2+ tools
const collisionZones = Array.from(zoneIndex.entries())
  .filter(([_, records]) => records.length >= 2)
```

### 3. Deterministic Mutation
```typescript
const rng = new SeededRandom(config.seed)
const indices = rng.shuffle([...Array(tools.length).keys()])

// Mutate first N tools to collide with zones
for (let i = 0; i < targetAmbiguous; i++) {
  const tool = tools[indices[i]]
  const [toolCode, zoneRecords] = collisionZones[i % collisionZones.length]

  // Mutate to share toolCode but different suffix
  mutated[i] = {
    ...tool,
    id: `tool-${toolCode}-COLLISION${rng.nextInt(1000)}`,
    name: `${toolCode} COLLISION${rng.nextInt(1000)}`
  }
}
```

### 4. Fuzzy Match Triggers Ambiguity
When UID resolution encounters the mutated entity:
```typescript
const candidates = findToolCandidates(key, labels, plantKey, prevRecords)
// Returns: [
//   { uid: "uid-1", key: "tool-AA020-EGR-01", matchScore: 70, reasons: ["Same tool code: AA020"] },
//   { uid: "uid-2", key: "tool-AA020-EGR-02", matchScore: 70, reasons: ["Same tool code: AA020"] }
// ]

if (candidates.length > 0) {
  return { uid: null, matchedVia: 'ambiguous', candidates }
}
```

## Expected Output

### Console Logs
```
[INFO] [Mutate Ambiguity] Enabled - targeting 5 ambiguous items per dataset (seed: 123)
[INFO] [CollisionMutator] Created 5 collision tool mutations
[DEBUG]   - Tool: "tool-XYZ" -> "tool-AA020-COLLISION847" (collision zone: AA020)
```

### Artifacts
```
artifacts/real-data-regress/YYYY-MM-DDTHH-MM-SS/
├── summary.json                    # totalAmbiguous >= 1
├── summary.md                      # Human-readable report
├── per-file/<dataset>/<file>.json  # mutationsApplied > 0, diffCounts.ambiguous > 0
└── ambiguity/<dataset>/
    ├── index.json                  # totalAmbiguous >= 1
    └── <file>_ambiguity.json       # candidates.length >= 2, matchScore, reasons
```

### Ambiguity Bundle Example
```json
{
  "newKey": "tool-AA020-COLLISION847",
  "plantKey": "PLANT_TEST",
  "entityType": "tool",
  "newAttributes": { "name": "AA020 COLLISION847", "toolNo": "AA020" },
  "candidates": [
    {
      "uid": "uid-tool-1",
      "key": "tool-AA020-EGR-01",
      "matchScore": 70,
      "reasons": ["Same tool code: AA020", "Partial key match"]
    },
    {
      "uid": "uid-tool-2",
      "key": "tool-AA020-EGR-02",
      "matchScore": 70,
      "reasons": ["Same tool code: AA020", "Partial key match"]
    }
  ]
}
```

## Determinism Guarantee

Same seed + same dataset = same mutations:
```bash
# Run 1
npm run real-data-regress -- --uid --mutate-ambiguity --seed=42

# Run 2 (identical output)
npm run real-data-regress -- --uid --mutate-ambiguity --seed=42
```

## Troubleshooting

### No Collision Zones Found
**Symptoms**:
```
[DEBUG] [CollisionMutator] No collision zones found for tools (need zones with 2+ tools sharing toolCode)
```

**Causes**:
1. **Empty prevRecords**: First file in a dataset has no previous entities to collide with
2. **Unique Discriminators**: All existing tools have different toolCodes (no shared zones)
3. **Cross-Dataset Isolation**: Each dataset starts with empty prevRecords

**Solutions**:
- Process multiple files in the same dataset (prevRecords accumulate within dataset)
- Increase dataset size or use datasets with redundant entities
- Modify collision strategy to create synthetic zones (future enhancement)

### No Ambiguous Matches Created
**Symptoms**: Mutations logged, but `totalAmbiguous: 0` in summary

**Causes**:
1. Fuzzy matcher score too low (candidates filtered out)
2. Mutation didn't share enough discriminators
3. Exact key match happened before fuzzy matching

**Debug**:
- Check fuzzy matcher thresholds in `fuzzyMatcher.ts`
- Verify mutated entities share discriminators with collision zone
- Review mutation logs to confirm collisions were attempted

## Implementation Files

- **Collision Mutator**: [`tools/identifierMutator.ts:368-640`](../tools/identifierMutator.ts#L368-L640)
- **CLI Integration**: [`tools/realDataRegress.ts:19-21,779-823`](../tools/realDataRegress.ts#L19-L21)
- **Pipeline Wiring**: [`tools/uidAwareIngestion.ts:154-175,229-247,309-330`](../tools/uidAwareIngestion.ts)

## Comparison: Collision vs Rename Mutations

| Aspect | `--mutate-names` | `--mutate-ambiguity` |
|--------|------------------|----------------------|
| **Goal** | Simulate data drift | Guarantee ambiguous matches |
| **Strategy** | Random formatting changes | Targeted collision zone placement |
| **Mutation Rate** | 1-2% of all entities | Exactly N entities (target) |
| **Determinism** | Seeded RNG | Seeded RNG |
| **Fuzzy Matching** | May or may not trigger | **Guaranteed** to trigger (if zones exist) |
| **Use Case** | Rename detection testing | Ambiguity workflow validation |
| **Mutually Exclusive** | Yes - cannot use both at once | Yes - cannot use both at once |

## Future Enhancements

1. **Synthetic Collision Zones**: If no natural zones exist, create them by duplicating discriminators
2. **Cross-Dataset prevRecords**: Accumulate prevRecords across datasets instead of resetting
3. **Adaptive Collision Strength**: Adjust mutation similarity based on fuzzy matcher scoring
4. **Collision Heatmap**: Visualize collision zones and mutation coverage in artifacts
