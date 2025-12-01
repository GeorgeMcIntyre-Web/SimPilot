// Schema Explorer
// Provides UI-friendly schema analysis and row interpretation
// Enables Dale to see how each sheet was interpreted

import * as XLSX from 'xlsx'
import { sheetToMatrix, CellValue } from './excelUtils'
import {
  analyzeHeaderRow,
  interpretRow,
  SheetSchemaAnalysis,
  RowInterpretation,
  ColumnRole,
  getRoleDisplayName,
  getRoleColorClass,
  getConfidenceColorClass,
  MatchConfidence
} from './columnRoleDetector'
import { scanWorkbook, SheetCategory, SheetDetection } from './sheetSniffer'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Complete exploration result for a sheet
 */
export interface SheetExploration {
  sheetName: string
  category: SheetCategory
  score: number
  matchedKeywords: string[]
  schema: SheetSchemaAnalysis
  sampleRows: RowInterpretation[]
  rowCount: number
  isRecommended: boolean
}

/**
 * Complete exploration result for a workbook
 */
export interface WorkbookExploration {
  fileName: string
  sheetCount: number
  sheets: SheetExploration[]
  recommendedSheet: SheetExploration | null
  summary: WorkbookSummary
}

/**
 * Summary statistics for a workbook
 */
export interface WorkbookSummary {
  totalSheets: number
  analyzedSheets: number
  skippedSheets: string[]
  totalColumns: number
  knownColumns: number
  unknownColumns: number
  coveragePercentage: number
  detectedCategories: SheetCategory[]
}

/**
 * Column display info for UI
 */
export interface ColumnDisplay {
  index: number
  header: string
  role: ColumnRole
  roleDisplayName: string
  confidence: MatchConfidence
  explanation: string
  colorClass: string
  confidenceColorClass: string
  isUnknown: boolean
}

/**
 * Row display info for UI
 */
export interface RowDisplay {
  rowIndex: number
  cells: {
    value: string
    role: ColumnRole
    roleDisplayName: string
    isIdentity: boolean
    isLocation: boolean
    isStatus: boolean
  }[]
  summary: string
}

// ============================================================================
// MAIN EXPLORATION FUNCTIONS
// ============================================================================

/**
 * Explore a single sheet and produce analysis
 */
export function exploreSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  detection: SheetDetection | null,
  maxSampleRows: number = 5
): SheetExploration | null {
  // Validate sheet exists
  if (workbook.SheetNames.includes(sheetName) === false) {
    return null
  }

  // Read sheet data
  let rows: CellValue[][]
  try {
    rows = sheetToMatrix(workbook, sheetName, maxSampleRows + 15)
  } catch {
    return null
  }

  if (rows.length === 0) {
    return null
  }

  // Find header row (first non-empty row with multiple values)
  const headerRowIndex = findHeaderRowIndex(rows)
  if (headerRowIndex === null) {
    return null
  }

  const headerRow = rows[headerRowIndex]

  // Analyze schema
  const schema = analyzeHeaderRow(headerRow, sheetName, headerRowIndex)

  // Get sample rows
  const sampleRows: RowInterpretation[] = []
  const dataStartIndex = headerRowIndex + 1

  for (let i = dataStartIndex; i < rows.length && sampleRows.length < maxSampleRows; i++) {
    const row = rows[i]

    // Skip empty rows
    if (isEmptyRow(row)) {
      continue
    }

    const interpretation = interpretRow(row, i, schema)
    sampleRows.push(interpretation)
  }

  // Get total row count from sheet
  const sheet = workbook.Sheets[sheetName]
  let rowCount = rows.length
  if (sheet && sheet['!ref']) {
    try {
      const range = XLSX.utils.decode_range(sheet['!ref'])
      rowCount = range.e.r - range.s.r + 1
    } catch {
      // Use rows.length as fallback
    }
  }

  return {
    sheetName,
    category: detection?.category ?? 'UNKNOWN',
    score: detection?.score ?? 0,
    matchedKeywords: detection?.matchedKeywords ?? [],
    schema,
    sampleRows,
    rowCount,
    isRecommended: false
  }
}

/**
 * Explore an entire workbook
 */
export function exploreWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string,
  maxSampleRows: number = 5
): WorkbookExploration {
  // Scan workbook for category detection
  const scanResult = scanWorkbook(workbook)

  const sheets: SheetExploration[] = []
  const skippedSheets: string[] = []
  const detectedCategories: SheetCategory[] = []

  let totalColumns = 0
  let knownColumns = 0
  let unknownColumns = 0

  // Explore each sheet
  for (const sheetName of workbook.SheetNames) {
    // Find detection for this sheet
    const detection = scanResult.allDetections.find(d => d.sheetName === sheetName) ?? null

    const exploration = exploreSheet(workbook, sheetName, detection, maxSampleRows)

    if (exploration === null) {
      skippedSheets.push(sheetName)
      continue
    }

    // Mark recommended sheet
    if (scanResult.bestOverall && scanResult.bestOverall.sheetName === sheetName) {
      exploration.isRecommended = true
    }

    sheets.push(exploration)

    // Track stats
    totalColumns += exploration.schema.coverage.total
    knownColumns += exploration.schema.coverage.known
    unknownColumns += exploration.schema.coverage.unknown

    if (exploration.category !== 'UNKNOWN' && detectedCategories.includes(exploration.category) === false) {
      detectedCategories.push(exploration.category)
    }
  }

  // Find recommended sheet
  const recommendedSheet = sheets.find(s => s.isRecommended) ?? null

  // Build summary
  const summary: WorkbookSummary = {
    totalSheets: workbook.SheetNames.length,
    analyzedSheets: sheets.length,
    skippedSheets,
    totalColumns,
    knownColumns,
    unknownColumns,
    coveragePercentage: totalColumns > 0 ? Math.round((knownColumns / totalColumns) * 100) : 0,
    detectedCategories
  }

  return {
    fileName,
    sheetCount: workbook.SheetNames.length,
    sheets,
    recommendedSheet,
    summary
  }
}

// ============================================================================
// UI DISPLAY HELPERS
// ============================================================================

/**
 * Convert schema columns to UI display format
 */
export function columnsToDisplay(schema: SheetSchemaAnalysis): ColumnDisplay[] {
  return schema.columns.map(col => ({
    index: col.columnIndex,
    header: col.headerText,
    role: col.role,
    roleDisplayName: getRoleDisplayName(col.role),
    confidence: col.confidence,
    explanation: col.explanation,
    colorClass: getRoleColorClass(col.role),
    confidenceColorClass: getConfidenceColorClass(col.confidence),
    isUnknown: col.role === 'UNKNOWN'
  }))
}

/**
 * Convert row interpretation to UI display format
 */
export function rowToDisplay(
  interpretation: RowInterpretation,
  schema: SheetSchemaAnalysis
): RowDisplay {
  const identityRoles: ColumnRole[] = ['TOOL_ID', 'ROBOT_ID', 'GUN_NUMBER', 'DEVICE_NAME', 'SERIAL_NUMBER']
  const locationRoles: ColumnRole[] = ['AREA', 'STATION', 'LINE_CODE', 'ZONE', 'CELL']
  const statusRoles: ColumnRole[] = ['REUSE_STATUS', 'SOURCING', 'PROJECT']

  const cells = schema.columns.map((col, index) => {
    const rawValue = interpretation.rawValues[index]
    const value = formatValueForDisplay(rawValue)

    return {
      value,
      role: col.role,
      roleDisplayName: getRoleDisplayName(col.role),
      isIdentity: identityRoles.includes(col.role),
      isLocation: locationRoles.includes(col.role),
      isStatus: statusRoles.includes(col.role)
    }
  })

  return {
    rowIndex: interpretation.rowIndex,
    cells,
    summary: interpretation.summary
  }
}

/**
 * Get role category for grouping
 */
export function getRoleCategory(role: ColumnRole): string {
  if (['TOOL_ID', 'ROBOT_ID', 'GUN_NUMBER', 'DEVICE_NAME', 'SERIAL_NUMBER'].includes(role)) {
    return 'Identity'
  }
  if (['AREA', 'STATION', 'LINE_CODE', 'ZONE', 'CELL'].includes(role)) {
    return 'Location'
  }
  if (['REUSE_STATUS', 'SOURCING', 'PROJECT'].includes(role)) {
    return 'Status'
  }
  if (['GUN_FORCE', 'OEM_MODEL', 'ROBOT_TYPE', 'PAYLOAD', 'REACH', 'HEIGHT', 'BRAND'].includes(role)) {
    return 'Technical'
  }
  if (['ENGINEER', 'SIM_LEADER', 'TEAM_LEADER'].includes(role)) {
    return 'Personnel'
  }
  if (['DUE_DATE', 'START_DATE', 'END_DATE'].includes(role)) {
    return 'Dates'
  }
  if (['COMMENTS'].includes(role)) {
    return 'Notes'
  }
  if (['QUANTITY', 'RESERVE'].includes(role)) {
    return 'Metrics'
  }
  return 'Unknown'
}

/**
 * Group columns by category for display
 */
export function groupColumnsByCategory(columns: ColumnDisplay[]): Map<string, ColumnDisplay[]> {
  const groups = new Map<string, ColumnDisplay[]>()

  for (const column of columns) {
    const category = getRoleCategory(column.role)
    const existing = groups.get(category) ?? []
    existing.push(column)
    groups.set(category, existing)
  }

  return groups
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find the header row index in a sheet
 */
function findHeaderRowIndex(rows: CellValue[][]): number | null {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i]

    if (row === null || row === undefined) {
      continue
    }

    // Count non-empty cells
    const nonEmptyCells = row.filter(cell => {
      if (cell === null || cell === undefined) return false
      return String(cell).trim() !== ''
    }).length

    // Consider it a header if it has at least 3 non-empty cells
    if (nonEmptyCells >= 3) {
      return i
    }
  }

  return null
}

/**
 * Check if a row is empty
 */
function isEmptyRow(row: CellValue[]): boolean {
  if (row === null || row === undefined || row.length === 0) {
    return true
  }

  return row.every(cell => {
    if (cell === null || cell === undefined) return true
    return String(cell).trim() === ''
  })
}

/**
 * Format a value for display
 */
function formatValueForDisplay(value: CellValue): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return String(value)
    }
    return value.toFixed(2)
  }

  const str = String(value).trim()

  // Truncate long values
  if (str.length > 50) {
    return str.substring(0, 47) + '...'
  }

  return str
}

// ============================================================================
// SCHEMA COMPARISON
// ============================================================================

/**
 * Compare two schemas to find differences
 */
export interface SchemaDiff {
  addedColumns: string[]
  removedColumns: string[]
  changedRoles: {
    header: string
    oldRole: ColumnRole
    newRole: ColumnRole
  }[]
}

/**
 * Compare two sheet schemas
 */
export function compareSchemas(
  oldSchema: SheetSchemaAnalysis,
  newSchema: SheetSchemaAnalysis
): SchemaDiff {
  const addedColumns: string[] = []
  const removedColumns: string[] = []
  const changedRoles: SchemaDiff['changedRoles'] = []

  const oldHeaders = new Set(oldSchema.headers.filter(h => h !== ''))
  const newHeaders = new Set(newSchema.headers.filter(h => h !== ''))

  // Find added columns
  for (const header of newHeaders) {
    if (oldHeaders.has(header) === false) {
      addedColumns.push(header)
    }
  }

  // Find removed columns
  for (const header of oldHeaders) {
    if (newHeaders.has(header) === false) {
      removedColumns.push(header)
    }
  }

  // Find changed roles
  for (const newCol of newSchema.columns) {
    if (newCol.headerText === '') continue

    const oldCol = oldSchema.columns.find(c => c.headerText === newCol.headerText)
    if (oldCol === undefined) continue

    if (oldCol.role !== newCol.role) {
      changedRoles.push({
        header: newCol.headerText,
        oldRole: oldCol.role,
        newRole: newCol.role
      })
    }
  }

  return {
    addedColumns,
    removedColumns,
    changedRoles
  }
}
