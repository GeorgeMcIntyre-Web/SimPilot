# Large File Refactoring Plan

## Overview
This plan outlines how to split large files (1000+ lines) into smaller, focused modules following SOLID principles.

---

## File 1: ingestionCoordinator.ts (1,411 lines)

### Current Structure Analysis
The file contains these logical sections:
1. **Public API Types** (lines 47-84) - Interfaces for input/output
2. **File Classification** (lines 85-183) - Sheet Sniffer integration
3. **Model Context Detection** (lines 189-229) - Filename inference
4. **DiffResult Adapter** (lines 231-354) - Version comparison to DiffResult conversion
5. **Last-Seen Tracking** (lines 356-472) - Entity tracking across imports
6. **CrossRef Transformation** (lines 474-795) - Building CrossRef input
7. **Main Ingestion API** (lines 797-1284) - Core ingestion logic
8. **Advanced Ingestion API** (lines 1286-1411) - Multi-sheet processing

### Proposed Split

| New File | Responsibility | Lines (approx) |
|----------|---------------|----------------|
| `ingestionTypes.ts` | Public API types and interfaces | ~50 |
| `fileClassifier.ts` | File type detection using Sheet Sniffer | ~100 |
| `modelContextDetector.ts` | Model/Plant key inference from filenames | ~50 |
| `diffResultAdapter.ts` | Convert version comparison to DiffResult | ~130 |
| `lastSeenTracker.ts` | Track entity last-seen import runs | ~120 |
| `crossRefTransformer.ts` | Build CrossRef input from ApplyResult | ~330 |
| `ingestionCoordinator.ts` | Main orchestration (reduced) | ~400 |
| `workbookProcessor.ts` | Multi-sheet workbook processing | ~130 |

### Refactoring Steps
1. Create `ingestionTypes.ts` with exported interfaces
2. Extract `fileClassifier.ts` with `detectFileTypeAndSheet`, `detectFileTypeFromFilename`, `getAllDetectedSheets`
3. Extract `modelContextDetector.ts` with `inferModelKeyFromFilename`
4. Extract `diffResultAdapter.ts` with `buildDiffResultFromVersionComparison`, `resolveCellKey`
5. Extract `lastSeenTracker.ts` with `updateLastSeenForEntities`
6. Extract `crossRefTransformer.ts` with `buildCrossRefInputFromApplyResult`
7. Extract `workbookProcessor.ts` with `processWorkbook`
8. Update imports in remaining `ingestionCoordinator.ts`

---

## File 2: sheetSniffer.ts (1,395 lines)

### Current Structure Analysis
The file handles Excel sheet type detection via header analysis.

### Proposed Split

| New File | Responsibility | Lines (approx) |
|----------|---------------|----------------|
| `sheetSnifferTypes.ts` | Types, interfaces, enums | ~100 |
| `sheetSnifferPatterns.ts` | Header patterns and matchers | ~400 |
| `sheetSnifferScoring.ts` | Confidence scoring algorithms | ~300 |
| `sheetSnifferCore.ts` | Main detection logic | ~400 |
| `sheetSniffer.ts` | Public API re-exports | ~50 |

---

## File 3: simulationStatusParser.ts (1,391 lines)

### Proposed Split

| New File | Responsibility | Lines (approx) |
|----------|---------------|----------------|
| `simulationStatusTypes.ts` | Parser types and interfaces | ~100 |
| `simulationStatusDetector.ts` | Header detection and column mapping | ~300 |
| `simulationStatusRowParser.ts` | Individual row parsing logic | ~400 |
| `simulationStatusAggregator.ts` | Aggregation and metrics calculation | ~300 |
| `simulationStatusParser.ts` | Main parser orchestration | ~300 |

---

## File 4: columnRoleDetector.ts (1,039 lines)

### Proposed Split

| New File | Responsibility | Lines (approx) |
|----------|---------------|----------------|
| `columnRoleTypes.ts` | Types for column roles | ~50 |
| `columnRolePatterns.ts` | Pattern definitions for each role | ~300 |
| `columnRoleMatchers.ts` | Matching algorithms | ~300 |
| `columnRoleDetector.ts` | Main detection orchestration | ~300 |

---

## Execution Priority

| Priority | File | Reason |
|----------|------|--------|
| 1 | `ingestionCoordinator.ts` | Most complex, highest impact |
| 2 | `sheetSniffer.ts` | Core infrastructure |
| 3 | `simulationStatusParser.ts` | Complex parsing logic |
| 4 | `columnRoleDetector.ts` | Pattern-heavy, easier split |

---

## Guidelines for Splitting

1. **One responsibility per file** - Each file should have a single, clear purpose
2. **Minimize circular dependencies** - Types should be in separate files
3. **Maintain backward compatibility** - Re-export from original file if needed
4. **Co-locate tests** - Move/create tests alongside new files
5. **Update imports incrementally** - Fix imports as you extract

---

## Next Steps

1. Start with `ingestionCoordinator.ts` - highest impact
2. Extract one module at a time
3. Run tests after each extraction
4. Commit after each successful extraction
