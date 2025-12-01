// Ingestion Telemetry
// Rich structured types for ingestion diagnostics and UX
// Enables Dale to see exactly how each file was interpreted

import { SheetCategory, SheetDetection, scanWorkbook, categoryToFileKind, FileKind } from './sheetSniffer'
import { CellValue, sheetToMatrix } from './excelUtils'
import * as XLSX from 'xlsx'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Stage of the ingestion pipeline
 */
export type IngestionStage =
  | 'SCAN_ONLY'       // Just scan files, don't parse
  | 'SCAN_AND_PARSE'  // Scan and parse, but don't apply to store
  | 'APPLY_TO_STORE'  // Full ingestion with store update

/**
 * Overall status of a file's ingestion
 */
export type IngestionStatus =
  | 'OK'                // File was processed successfully
  | 'UNKNOWN_FILE_TYPE' // Could not determine file type
  | 'PARTIAL'           // File processed with warnings
  | 'FAILED'            // File failed to process

/**
 * Severity levels for warnings
 */
export type WarningSeverity = 'info' | 'warning' | 'error'

/**
 * Warning codes for structured error handling
 */
export type WarningCode =
  | 'UNKNOWN_FILE_TYPE'
  | 'NO_HEADER_FOUND'
  | 'MISSING_REQUIRED_COLUMN'
  | 'ROW_SKIPPED'
  | 'EMPTY_SHEET'
  | 'PARSER_ERROR'
  | 'LINKING_AMBIGUOUS'
  | 'LINKING_MISSING_TARGET'
  | 'LOW_CONFIDENCE_MATCH'

/**
 * Summary of sheet scanning for a file
 */
export interface FileScanSummary {
  fileName: string
  source: 'Local' | 'MS365'
  category: SheetCategory
  fileKind: FileKind
  sheetName: string
  score: number
  matchedKeywords: string[]
  allSheetNames: string[]
  allDetections: SheetDetection[]
}

/**
 * Structured warning with rich context
 */
export interface FileIngestionWarning {
  id: string
  fileName: string
  sheetName?: string
  rowIndex?: number
  code: WarningCode
  message: string
  severity: WarningSeverity
  details?: Record<string, string | number | boolean>
}

/**
 * Sample rows from a sheet for inspection
 */
export interface SheetSampleData {
  sheetName: string
  headerRow: string[]
  sampleRows: string[][]
  totalRowCount: number
}

/**
 * Result of processing a single file
 */
export interface FileIngestionResult {
  fileName: string
  fileSize: number
  stage: IngestionStage
  status: IngestionStatus
  scanSummary: FileScanSummary | null
  sampleData: SheetSampleData | null
  entityCounts: {
    projects: number
    areas: number
    cells: number
    robots: number
    tools: number
  }
  warnings: FileIngestionWarning[]
  errorMessage?: string
  processingTimeMs: number
}

/**
 * Aggregated result of a full ingestion run
 */
export interface IngestionRunResult {
  runId: string
  stage: IngestionStage
  startedAt: string
  completedAt: string
  totalProcessingTimeMs: number
  fileResults: FileIngestionResult[]
  aggregateCounts: {
    projects: number
    areas: number
    cells: number
    robots: number
    tools: number
  }
  aggregateWarnings: FileIngestionWarning[]
  successCount: number
  failureCount: number
  partialCount: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

let warningIdCounter = 0

/**
 * Generate unique warning ID
 */
export function generateWarningId(): string {
  warningIdCounter += 1
  return `warn-${Date.now()}-${warningIdCounter}`
}

/**
 * Reset warning counter (useful for tests)
 */
export function resetWarningIdCounter(): void {
  warningIdCounter = 0
}

/**
 * Generate unique run ID
 */
export function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Create a structured warning
 */
export function createTelemetryWarning(params: {
  fileName: string
  sheetName?: string
  rowIndex?: number
  code: WarningCode
  message: string
  severity?: WarningSeverity
  details?: Record<string, string | number | boolean>
}): FileIngestionWarning {
  return {
    id: generateWarningId(),
    fileName: params.fileName,
    sheetName: params.sheetName,
    rowIndex: params.rowIndex,
    code: params.code,
    message: params.message,
    severity: params.severity ?? 'warning',
    details: params.details
  }
}

/**
 * Derive ingestion status from warnings and error
 */
export function deriveIngestionStatus(
  warnings: FileIngestionWarning[],
  errorMessage?: string
): IngestionStatus {
  if (errorMessage) {
    return 'FAILED'
  }

  const hasErrors = warnings.some(w => w.severity === 'error')
  if (hasErrors) {
    return 'FAILED'
  }

  const hasUnknownFileType = warnings.some(w => w.code === 'UNKNOWN_FILE_TYPE')
  if (hasUnknownFileType) {
    return 'UNKNOWN_FILE_TYPE'
  }

  const hasWarnings = warnings.some(w => w.severity === 'warning')
  if (hasWarnings) {
    return 'PARTIAL'
  }

  return 'OK'
}

// ============================================================================
// SCANNING FUNCTIONS
// ============================================================================

/**
 * Scan a workbook and produce a FileScanSummary
 */
export function scanFileForTelemetry(
  workbook: XLSX.WorkBook,
  fileName: string,
  source: 'Local' | 'MS365' = 'Local'
): FileScanSummary {
  const scanResult = scanWorkbook(workbook)

  const bestDetection = scanResult.bestOverall
  const category: SheetCategory = bestDetection?.category ?? 'UNKNOWN'
  const sheetName = bestDetection?.sheetName ?? workbook.SheetNames[0] ?? ''
  const score = bestDetection?.score ?? 0
  const matchedKeywords = bestDetection?.matchedKeywords ?? []

  return {
    fileName,
    source,
    category,
    fileKind: categoryToFileKind(category),
    sheetName,
    score,
    matchedKeywords,
    allSheetNames: workbook.SheetNames,
    allDetections: scanResult.allDetections
  }
}

/**
 * Extract sample data from a sheet for inspection
 */
export function extractSampleData(
  workbook: XLSX.WorkBook,
  sheetName: string,
  maxSampleRows: number = 5
): SheetSampleData | null {
  if (workbook.SheetNames.includes(sheetName) === false) {
    return null
  }

  try {
    const rows = sheetToMatrix(workbook, sheetName, maxSampleRows + 10)

    if (rows.length === 0) {
      return {
        sheetName,
        headerRow: [],
        sampleRows: [],
        totalRowCount: 0
      }
    }

    // Find first non-empty row as header
    let headerRowIndex = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (row === null || row === undefined) {
        continue
      }

      const hasContent = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      if (hasContent) {
        headerRowIndex = i
        break
      }
    }

    const headerRow = rows[headerRowIndex] ?? []
    const headerStrings = headerRow.map(cell => formatCellValue(cell))

    // Get sample data rows after header
    const sampleRows: string[][] = []
    for (let i = headerRowIndex + 1; i < rows.length && sampleRows.length < maxSampleRows; i++) {
      const row = rows[i]
      if (row === null || row === undefined) {
        continue
      }

      const rowStrings = row.map(cell => formatCellValue(cell))
      const hasContent = rowStrings.some(s => s !== '')

      if (hasContent) {
        sampleRows.push(rowStrings)
      }
    }

    // Estimate total row count
    const sheet = workbook.Sheets[sheetName]
    let totalRowCount = rows.length
    if (sheet && sheet['!ref']) {
      try {
        const range = XLSX.utils.decode_range(sheet['!ref'])
        totalRowCount = range.e.r - range.s.r + 1
      } catch {
        // Use rows.length as fallback
      }
    }

    return {
      sheetName,
      headerRow: headerStrings,
      sampleRows,
      totalRowCount
    }
  } catch {
    return null
  }
}

/**
 * Format a cell value for display
 */
function formatCellValue(cell: CellValue): string {
  if (cell === null || cell === undefined) {
    return ''
  }

  if (typeof cell === 'boolean') {
    return cell ? 'Yes' : 'No'
  }

  return String(cell).trim()
}

// ============================================================================
// STATUS DISPLAY HELPERS
// ============================================================================

/**
 * Get display label for ingestion status
 */
export function getStatusLabel(status: IngestionStatus): string {
  switch (status) {
    case 'OK':
      return 'Success'
    case 'UNKNOWN_FILE_TYPE':
      return 'Unknown Type'
    case 'PARTIAL':
      return 'Partial'
    case 'FAILED':
      return 'Failed'
  }
}

/**
 * Get display color class for ingestion status
 */
export function getStatusColorClass(status: IngestionStatus): string {
  switch (status) {
    case 'OK':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'UNKNOWN_FILE_TYPE':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    case 'PARTIAL':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'FAILED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }
}

/**
 * Get display label for sheet category
 */
export function getCategoryLabel(category: SheetCategory): string {
  switch (category) {
    case 'SIMULATION_STATUS':
      return 'Simulation Status'
    case 'IN_HOUSE_TOOLING':
      return 'In-House Tooling'
    case 'ROBOT_SPECS':
      return 'Robot Specs'
    case 'REUSE_WELD_GUNS':
      return 'Reuse Weld Guns'
    case 'GUN_FORCE':
      return 'Gun Force'
    case 'REUSE_RISERS':
      return 'Reuse Risers'
    case 'METADATA':
      return 'Metadata'
    case 'UNKNOWN':
      return 'Unknown'
  }
}

/**
 * Get display color class for sheet category
 */
export function getCategoryColorClass(category: SheetCategory): string {
  switch (category) {
    case 'SIMULATION_STATUS':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'IN_HOUSE_TOOLING':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'ROBOT_SPECS':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    case 'REUSE_WELD_GUNS':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
    case 'GUN_FORCE':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
    case 'REUSE_RISERS':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
    case 'METADATA':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    case 'UNKNOWN':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  }
}

/**
 * Get icon name for sheet category (for use with lucide-react)
 */
export function getCategoryIcon(category: SheetCategory): string {
  switch (category) {
    case 'SIMULATION_STATUS':
      return 'Activity'
    case 'IN_HOUSE_TOOLING':
      return 'Wrench'
    case 'ROBOT_SPECS':
      return 'Bot'
    case 'REUSE_WELD_GUNS':
      return 'Flame'
    case 'GUN_FORCE':
      return 'Zap'
    case 'REUSE_RISERS':
      return 'ArrowUpFromLine'
    case 'METADATA':
      return 'Database'
    case 'UNKNOWN':
      return 'HelpCircle'
  }
}

/**
 * Get severity icon (for use with lucide-react)
 */
export function getSeverityIcon(severity: WarningSeverity): string {
  switch (severity) {
    case 'info':
      return 'Info'
    case 'warning':
      return 'AlertTriangle'
    case 'error':
      return 'XCircle'
  }
}

/**
 * Get severity color class
 */
export function getSeverityColorClass(severity: WarningSeverity): string {
  switch (severity) {
    case 'info':
      return 'text-blue-500 dark:text-blue-400'
    case 'warning':
      return 'text-orange-500 dark:text-orange-400'
    case 'error':
      return 'text-red-500 dark:text-red-400'
  }
}
