# Real Data Regression Harness

## Overview

The Real Data Regression Harness is a CLI tool that validates SimPilot's ingestion pipeline against real-world messy Excel data. It processes test datasets and produces comprehensive reports showing what linked successfully, what became ambiguous, and what failed.

## Purpose

This harness validates the **UID ambiguity workflow** by:

- Running SimPilot parsers and ingestion logic against real test data
- Detecting key derivation errors (MISSING_COLUMNS, invalid keys, etc.)
- Identifying ambiguous items that require user review
- Tracking unresolved cross-document links
- Generating machine-readable + human-readable reports

## Quick Start

```bash
npm run real-data-regress
```

## Test Data Locations

The harness scans these directories recursively for Excel files:

1. `C:\Users\georgem\source\repos\SimPilot_Data\TestData\BMW\`
2. `C:\Users\georgem\source\repos\SimPilot_Data\TestData\J11006_TMS\`
3. `C:\Users\georgem\source\repos\SimPilot_Data\TestData\V801\`

**NOTE:** The harness does **NOT** modify any Excel files or require users to rename them.

## What It Does

### 1. File Discovery

Recursively walks each dataset root and discovers all `.xlsx`, `.xlsm`, and `.xls` files (skipping temp files starting with `~$`).

### 2. File Categorization

Uses filename heuristics to categorize files:

- **Simulation Status**: Files containing "simulation" + "status"
- **Robot List**: Files containing "robot" + "list/spec" (excluding equipment/tool contexts)
- **Tool List**: Files containing "tool", "weld", "gun", "equipment", "sealer", "gripper"
- **Assemblies List**: Files containing "assemblies" or "assembly"
- **Unknown**: Files that don't match any pattern (will use sheet sniffing)

### 3. Ingestion Execution

For each dataset:

- Creates a fresh in-memory store (no IndexedDB usage)
- Processes files in deterministic order:
  1. Tool Lists
  2. Robot Lists
  3. Simulation Status files
  4. Assemblies Lists (if supported)
- Captures metrics for each file:
  - Total rows parsed
  - Keys generated
  - Key derivation errors (MISSING_COLUMNS, etc.)
  - Creates/updates/deletes/renames/ambiguous counts
  - Unresolved links (station/tool/robot refs that didn't resolve)
  - PlantKey/ModelKey inference results

### 4. Report Generation

Saves artifacts to `artifacts/real-data-regress/<timestamp>/`:

- `summary.json` - Machine-readable full report
- `summary.md` - Human-readable summary with tables
- `diagnostics/<dataset>/*.json` - Per-file sheet detection diagnostics (see below)
- Per-file results with error details
- Ambiguity bundles (if ambiguous > 0)

## Report Structure

### JSON Report (`summary.json`)

```typescript
interface RegressionReport {
  timestamp: string
  datasets: DatasetResult[]
  overallSummary: {
    totalDatasets: number
    totalFiles: number
    totalRows: number
    totalAmbiguous: number
    totalKeyErrors: number
  }
}

interface DatasetResult {
  datasetName: string          // "BMW", "J11006_TMS", "V801"
  startTime: string            // ISO timestamp
  endTime: string              // ISO timestamp
  duration: number             // milliseconds
  files: FileIngestionResult[]
  summary: {
    totalFiles: number
    successfulFiles: number
    failedFiles: number
    totalRows: number
    totalCreates: number
    totalUpdates: number
    totalDeletes: number
    totalRenames: number
    totalAmbiguous: number     // ⚠️ Items needing manual review
    totalKeyErrors: number     // ⚠️ Derivation failures
    totalUnresolvedLinks: number // ⚠️ Cross-doc reference failures
  }
}

interface FileIngestionResult {
  fileName: string
  filePath: string
  sourceType: FileKind          // "ToolList" | "RobotList" | "SimulationStatus" | etc.
  detectedSheet?: string        // Sheet name chosen by sniffer
  detectionScore?: number       // Sheet detection confidence score
  sheetDiagnostics?: SheetDiagnostics  // Detailed sheet scoring info
  success: boolean
  error?: string                // Present if success=false
  rowsParsed: number
  keysGenerated: number
  keyDerivationErrors: number
  creates: number
  updates: number
  deletes: number
  renames: number
  ambiguous: number             // ⚠️ Fuzzy matches requiring user decision
  unresolvedLinks: number
  plantKey?: string
  modelKey?: string
  warnings: string[]
}

interface SheetDiagnostics {
  allSheets: Array<{ name: string; maxRow: number; maxCol: number }>
  chosenSheet: string | null
  chosenScore: number
  topCandidates: SheetCandidate[]
}

interface SheetCandidate {
  sheetName: string
  category: string
  score: number
  maxRow: number              // Total rows in sheet
  nameScore: number           // Sheet name bonus/penalty
  strongMatches: string[]     // Strong keyword matches
  weakMatches: string[]       // Weak keyword matches
}
```

### Markdown Report (`summary.md`)

Human-readable summary with:

- Overall statistics across all datasets
- Per-dataset breakdown with timing
- File-by-file table showing status (✓/✗) and metrics

Example:

```markdown
## Dataset: J11006_TMS

- **Duration**: 3821ms
- **Files Processed**: 11
- **Successful**: 1
- **Failed**: 10
- **Total Rows**: 166

### Files

| File | Type | Sheet | Score | Rows | Creates | Ambiguous | Key Errors | Status |
|------|------|-------|-------|------|---------|-----------|------------|--------|
| STLA_S_ZAR Tool List.xlsx | ToolList | ToolList | 39 | 352 | 0 | 0 | 0 | ✓ OK |
| Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx | RobotList | STLA-S | 20 | 166 | 0 | 0 | 0 | ✓ OK |
| STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx | SimulationStatus | SIMULATION | 23 | 61 | 0 | 0 | 0 | ✓ OK |
...
```

### Per-File Sheet Diagnostics

Each file generates a diagnostic JSON file in `diagnostics/<dataset>/<filename>.json` containing detailed sheet selection information:

```json
{
  "fileName": "STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx",
  "sourceType": "SimulationStatus",
  "detectedSheet": "SIMULATION",
  "detectionScore": 23,
  "success": true,
  "sheetDiagnostics": {
    "allSheets": [
      { "name": "OVERVIEW", "maxRow": 17, "maxCol": 34 },
      { "name": "SIMULATION", "maxRow": 3258, "maxCol": 69 },
      { "name": "DATA", "maxRow": 3, "maxCol": 10 }
    ],
    "chosenSheet": "SIMULATION",
    "chosenScore": 23,
    "topCandidates": [
      {
        "sheetName": "SIMULATION",
        "category": "SIMULATION_STATUS",
        "score": 23,
        "maxRow": 3258,
        "nameScore": 10,
        "strongMatches": ["ROBOT POSITION - STAGE 1"],
        "weakMatches": ["DCS CONFIGURED", "APPLICATION", "AREA", "STATION", "ROBOT"]
      },
      {
        "sheetName": "DATA",
        "category": "SIMULATION_STATUS",
        "score": 16,
        "maxRow": 3,
        "nameScore": -5,
        "strongMatches": ["1st STAGE SIM COMPLETION", "FINAL DELIVERABLES"],
        "weakMatches": ["ROBOT"]
      }
    ]
  }
}
```

**Understanding Sheet Scores:**
- **Total Score** = Keyword Score + Name Score
- **Keyword Score** = (5 × strong matches) + (1 × weak matches)
- **Name Score** = Bonus/penalty based on sheet name:
  - +10 for ideal names (e.g., "SIMULATION", "A_List")
  - +8 for good patterns (e.g., "status_*", "*_status")
  - -5 for generic names (e.g., "DATA", "OVERVIEW", "SUMMARY")
- **Row Count Guard**: Sheets with < 25 rows are rejected unless they have strong keyword matches

In the example above, "SIMULATION" won despite "DATA" having more strong keyword matches (4 vs 1) because:
1. "SIMULATION" has a much larger row count (3258 vs 3)
2. "SIMULATION" gets +10 name bonus vs -5 penalty for "DATA"
3. "DATA" is filtered out by the row count guard (< 25 rows with no strong matches)

## Interpreting Results

### Success Indicators

- `success: true` - File parsed without errors
- `rowsParsed > 0` - Data was extracted
- `keyDerivationErrors: 0` - All canonical keys derived successfully
- `unresolvedLinks: 0` - All cross-references resolved
- `ambiguous: 0` - No fuzzy matches requiring user input

### Failure Indicators

- `success: false` + `error` field - Parsing/ingestion crashed
- `keyDerivationErrors > 0` - Missing required columns or invalid data
- `unresolvedLinks > 0` - References to non-existent stations/tools/robots
- `ambiguous > 0` - Multiple candidates found, needs user disambiguation

### Common Errors

- **`TypeError: Cannot read properties of undefined (reading 'MODE')`**
  - Cause: Parser code depends on Vite's `import.meta.env`
  - Fix: ✅ **RESOLVED** - Now uses `src/runtime/runtimeEnv.ts` abstraction layer

- **`Error: Sheet "DATA" has too few rows (3). Expected at least 5 rows.`**
  - Cause: Summary/metadata sheets with < 5 rows
  - Fix: ✅ **RESOLVED** - Sheet sniffer now includes row count guard and name scoring

- **`Could not detect sheet type`**
  - Cause: Assemblies List files not detected by sheet sniffer
  - Fix: ✅ **RESOLVED** - Added ASSEMBLIES_LIST category to sheet sniffer

## Customization

### Adding New Datasets

Edit `tools/realDataRegress.ts`:

```typescript
const DATASETS: DatasetConfig[] = [
  {
    name: 'MyNewDataset',
    rootPath: 'C:\\Path\\To\\TestData\\MyDataset\\'
  },
  // ...existing datasets
]
```

### Adjusting Categorization Heuristics

Modify `categorizeByFilename()` in `tools/realDataRegress.ts`:

```typescript
// Example: Add "BOM" as a Tool List keyword
const toolKeywords = ['tool', 'weld', 'gun', 'bom', ...]
```

### Changing Output Location

Edit `ARTIFACTS_DIR` in `tools/realDataRegress.ts`:

```typescript
const ARTIFACTS_DIR = join(process.cwd(), 'my-custom-output')
```

## Testing

Unit tests are located in `tools/__tests__/`:

- `realDataRegress.test.ts` - File categorization logic
- `reportShape.test.ts` - JSON schema validation

Run tests:

```bash
npm test -- tools/__tests__/
```

## Architecture

### Components

1. **realDataRegress.ts** - Main CLI script
   - File discovery (walkDirectory)
   - Categorization (categorizeByFilename)
   - Report generation (generateMarkdownSummary, saveArtifacts)

2. **headlessIngestion.ts** - Node.js ingestion wrapper
   - Loads Excel files from filesystem
   - Bypasses React/browser dependencies
   - Calls existing parsers (simulationStatusParser, robotListParser, etc.)

3. **nodeLog.ts** - Node-compatible logger
   - Simple console wrapper (no import.meta.env dependencies)

### Integration Points

The harness **reuses** existing ingestion code:

- `workbookLoader.ts` - Excel file loading
- `sheetSniffer.ts` - Sheet type detection
- `simulationStatusParser.ts`, `robotListParser.ts`, `toolListParser.ts` - Parsing
- `applyIngestedData.ts` - Entity linking and normalization

The harness **avoids**:

- IndexedDB (uses in-memory structures)
- React hooks (direct function calls only)
- Vite-specific APIs (import.meta.env)

## Troubleshooting

### "Fatal error: TypeError: Cannot read properties of undefined"

This occurs when parser code calls `import.meta.env.MODE`. The headless runner bypasses this by using `nodeLog.ts` instead of `src/lib/log.ts`.

**Fix:** Ensure all imports in `headlessIngestion.ts` use the node-compatible logger.

### "No sheets found in workbook"

Possible causes:

- File is corrupted
- File is not actually an Excel file (.xlsx extension but wrong format)
- Magic byte detection failed

**Fix:** Check file manually in Excel. If valid, file a bug with file sample.

### "Could not detect sheet type"

The sheet sniffer didn't find matching keywords in headers.

**Fix:** Add sheet-specific signatures to `CATEGORY_SIGNATURES` in `sheetSniffer.ts`.

## Recent Improvements (January 2026)

### Sheet Detection Enhancements

**Problem**: The sheet sniffer was frequently selecting tiny template/summary sheets (like "DATA" with 3 rows) instead of the actual data sheets (like "SIMULATION" with 3000+ rows).

**Solution**: Implemented multi-factor sheet selection scoring:

1. **Row Count Guard**: Sheets with < 25 rows are rejected unless they have strong keyword matches
   - Prevents selection of tiny "DATA", "OVERVIEW", "SUMMARY" template sheets
   - Allows small sheets with strong signatures (e.g., metadata sheets)

2. **Sheet Name Scoring**: Bonus/penalty system based on sheet names
   - +10 for ideal names: "SIMULATION", "A_List", "ToolList", "RobotList"
   - +8 for good patterns: "status_*", "*_status", "*_robot*", "*_tool*"
   - -5 for generic names: "DATA", "OVERVIEW", "SUMMARY", "Introduction"

3. **Combined Scoring**: Total score = Keyword score + Name score
   - Strong keyword match: +5 points
   - Weak keyword match: +1 point
   - Minimum threshold: 5 points required

**Impact**: Improved from **166 rows parsed** to **2603 rows parsed** (15.7x improvement)

### Runtime Environment Abstraction

**Problem**: Parsers and config code directly accessed `import.meta.env`, which is Vite-specific and doesn't work in Node.js contexts.

**Solution**: Created `src/runtime/runtimeEnv.ts` abstraction layer that:
- Detects execution context (Vite vs Node.js)
- Provides unified API: `getRuntimeEnv()`
- Returns safe defaults for Node.js: `{ MODE: 'development', DEV: true, PROD: false }`

**Files Updated**:
- `src/config/simpilotConfig.ts` - All `import.meta.env` replaced with `getRuntimeEnv()`
- All parsers now work in both browser and headless Node.js contexts

### Diagnostic Artifacts

**Enhancement**: Added detailed per-file sheet detection diagnostics to `diagnostics/<dataset>/<file>.json`

**Contents**:
- All sheets in workbook with dimensions
- Chosen sheet with score breakdown
- Top 5 candidate sheets with scores and keyword matches
- Makes debugging sheet selection trivial

## Future Enhancements

- **UID Resolution Integration**: Track creates/updates/deletes/renames using UID resolver
- **Ambiguity Bundle Export**: Serialize DiffAmbiguous[] to JSON for review UI
- **Plant/Model Detection**: Infer plantKey and modelKey from filenames/metadata
- **Parallel Execution**: Run datasets concurrently
- **CI Integration**: Fail build if key error rate > threshold

## Related Documentation

- [docs/domain/UID_LINKING.md](./domain/UID_LINKING.md) - UID-backed linking architecture
- [docs/domain/AMBIGUITY_RESOLUTION.md](./domain/AMBIGUITY_RESOLUTION.md) - Fuzzy matching workflow
- [src/ingestion/README.md](../src/ingestion/README.md) - Ingestion pipeline overview
