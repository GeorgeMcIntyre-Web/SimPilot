/**
 * Regression Harness Types
 *
 * Comprehensive type definitions for real-data regression testing
 * with per-category row tracking and detailed metrics.
 */

import type { FileKind } from '../src/ingestion/sheetSniffer'
import type { DiffResult } from '../src/domain/uidTypes'

// ============================================================================
// PER-FILE METRICS (Category Breakdown)
// ============================================================================

export interface FileCategoryMetrics {
  simulationStatusRowsParsed: number
  toolListRowsParsed: number
  robotListRowsParsed: number
  assembliesRowsParsed: number
  totalRowsParsed: number
  mutationsApplied: number
}

export interface FileDetailedStats {
  dataset: string
  fileName: string
  filePath: string
  fileCategory: FileKind
  chosenSheetName: string | null
  detectionScore: number
  metrics: FileCategoryMetrics
  diffCounts: {
    creates: number
    updates: number
    deletes: number
    renames: number
    ambiguous: number
  }
  success: boolean
  error?: string
  warnings: string[]
}

// ============================================================================
// DATASET & REPORT TYPES
// ============================================================================

export interface DatasetConfig {
  name: string
  rootPath: string
}

export interface CategorizedFile {
  filePath: string
  fileName: string
  sourceType: FileKind
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface SheetCandidate {
  sheetName: string
  category: string
  score: number
  maxRow: number
  nameScore: number
  strongMatches: string[]
  weakMatches: string[]
}

export interface SheetDiagnostics {
  allSheets: Array<{ name: string; maxRow: number; maxCol: number }>
  chosenSheet: string | null
  chosenScore: number
  topCandidates: SheetCandidate[]
}

export interface FileIngestionResult {
  fileName: string
  filePath: string
  sourceType: FileKind
  detectedSheet?: string | null
  detectionScore?: number
  sheetDiagnostics?: SheetDiagnostics
  success: boolean
  error?: string
  rowsParsed: number
  keysGenerated: number
  keyDerivationErrors: number
  creates: number
  updates: number
  deletes: number
  renames: number
  ambiguous: number
  unresolvedLinks: number
  plantKey?: string
  modelKey?: string
  warnings: string[]
  diff?: DiffResult
  categoryMetrics?: FileCategoryMetrics
}

export interface DatasetSummary {
  totalFiles: number
  successfulFiles: number
  failedFiles: number
  totalRows: number
  simulationStatusRows: number
  toolListRows: number
  robotListRows: number
  assembliesRows: number
  totalCreates: number
  totalUpdates: number
  totalDeletes: number
  totalRenames: number
  totalAmbiguous: number
  totalKeyErrors: number
  totalUnresolvedLinks: number
}

export interface DatasetResult {
  datasetName: string
  startTime: string
  endTime: string
  duration: number
  files: FileIngestionResult[]
  summary: DatasetSummary
}

export interface OverallSummary {
  totalDatasets: number
  totalFiles: number
  totalRows: number
  totalAmbiguous: number
  totalKeyErrors: number
}

export interface RegressionReport {
  timestamp: string
  datasets: DatasetResult[]
  overallSummary: OverallSummary
}

// ============================================================================
// AMBIGUITY BUNDLE TYPES
// ============================================================================

export interface AmbiguityBundleIndex {
  totalAmbiguous: number
  datasetName: string
  timestamp: string
  files: Array<{
    fileName: string
    filePath: string
    ambiguousCount: number
  }>
  explanation?: string // Present when totalAmbiguous === 0
}
