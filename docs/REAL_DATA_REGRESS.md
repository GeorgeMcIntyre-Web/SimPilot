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

| File | Type | Rows | Creates | Ambiguous | Key Errors | Status |
|------|------|------|---------|-----------|------------|--------|
| STLA_S_ZAR Tool List.xlsx | ToolList | 0 | 0 | 0 | 0 | ✗ TypeError: ... |
| Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx | RobotList | 166 | 0 | 0 | 0 | ✓ OK |
...
```

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
  - Fix: Use Node-compatible config (already fixed in headless runner)

- **`Error: Sheet "DATA" has too few rows (3). Expected at least 5 rows.`**
  - Cause: Summary/metadata sheets with < 5 rows
  - Fix: Use full data sheet (e.g., "SIMULATION" instead of "DATA")

- **`Could not detect sheet type`**
  - Cause: Assemblies List files not detected by sheet sniffer
  - Fix: Add ASSEMBLIES_LIST signatures to sheetSniffer.ts

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
