// Sheet Profiler
// Provides comprehensive profiling for entire sheets.
// Aggregates column profiles and computes sheet-level quality metrics.

import { ColumnProfile, profileColumn, RawColumnContext, getColumnFillRate } from './columnProfiler'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw sheet data for profiling.
 * Contains all rows as a 2D array.
 */
export interface RawSheet {
  sheetName: string
  rows: unknown[][]
  headerRowIndex?: number
}

/**
 * Quality metrics for a sheet.
 */
export interface SheetQualityMetrics {
  /** Overall quality score (0-100) */
  overallScore: number
  /** Ratio of non-empty rows */
  rowFillRate: number
  /** Average column fill rate */
  avgColumnFillRate: number
  /** Number of columns with "strong" profiles */
  strongColumnCount: number
  /** Number of columns that appear to be mostly empty */
  emptyColumnCount: number
  /** Estimated data density */
  dataDensity: number
}

/**
 * Complete profile for an entire sheet.
 */
export interface SheetProfile {
  workbookId: string
  sheetName: string
  sheetIndex: number
  rowCount: number
  columnCount: number
  headerRowIndex: number
  headers: string[]
  columnProfiles: ColumnProfile[]
  qualityMetrics: SheetQualityMetrics
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect the most likely header row index.
 * Uses heuristics based on row content patterns.
 */
export function detectHeaderRowIndex(rows: unknown[][], maxScan: number = 20): number {
  if (rows.length === 0) {
    return 0
  }

  const scanLimit = Math.min(maxScan, rows.length)
  let bestRowIndex = 0
  let bestScore = -1

  for (let rowIndex = 0; rowIndex < scanLimit; rowIndex++) {
    const row = rows[rowIndex]

    if (row === null || row === undefined) {
      continue
    }

    const score = scoreHeaderRow(row, rows, rowIndex)

    if (score > bestScore) {
      bestScore = score
      bestRowIndex = rowIndex
    }
  }

  return bestRowIndex
}

/**
 * Score a row based on how likely it is to be a header row.
 */
function scoreHeaderRow(row: unknown[], allRows: unknown[][], rowIndex: number): number {
  let score = 0

  // Count non-empty cells
  const nonEmptyCells = row.filter(cell => isNonEmpty(cell))
  const fillRate = nonEmptyCells.length / Math.max(row.length, 1)

  // Headers typically have good fill rate
  if (fillRate > 0.3) {
    score += 10
  }

  if (fillRate > 0.6) {
    score += 10
  }

  // Count string cells (headers are usually strings)
  const stringCells = nonEmptyCells.filter(cell => typeof cell === 'string')
  const stringRate = stringCells.length / Math.max(nonEmptyCells.length, 1)

  if (stringRate > 0.7) {
    score += 20
  }

  // Check for common header keywords
  const headerKeywords = [
    'id', 'name', 'code', 'number', 'station', 'area', 'line', 'robot',
    'gun', 'tool', 'date', 'status', 'type', 'model', 'project',
    'application', 'description', 'comments', 'force', 'payload'
  ]

  for (const cell of nonEmptyCells) {
    if (typeof cell !== 'string') {
      continue
    }

    const cellLower = cell.toLowerCase()

    for (const keyword of headerKeywords) {
      if (cellLower.includes(keyword)) {
        score += 5
        break
      }
    }
  }

  // Penalize rows that look like data (have numeric patterns in most cells)
  const numericCells = nonEmptyCells.filter(cell => {
    if (typeof cell === 'number') {
      return true
    }

    if (typeof cell === 'string') {
      const trimmed = cell.trim()
      return /^\d+$/.test(trimmed) || /^\d+\.\d+$/.test(trimmed)
    }

    return false
  })

  const numericRate = numericCells.length / Math.max(nonEmptyCells.length, 1)

  if (numericRate > 0.5) {
    score -= 15
  }

  // Penalize if row has same values as next row (likely data, not headers)
  if (rowIndex + 1 < allRows.length) {
    const nextRow = allRows[rowIndex + 1]

    if (nextRow !== null && nextRow !== undefined) {
      const duplicates = countSimilarCells(row, nextRow)

      if (duplicates > 0.5 * row.length) {
        score -= 10
      }
    }
  }

  // Slight preference for rows near the top
  if (rowIndex < 5) {
    score += 5 - rowIndex
  }

  return score
}

/**
 * Check if a value is non-empty.
 */
function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false
  }

  if (typeof value === 'string' && value.trim() === '') {
    return false
  }

  return true
}

/**
 * Count cells that are similar between two rows.
 */
function countSimilarCells(row1: unknown[], row2: unknown[]): number {
  const minLength = Math.min(row1.length, row2.length)
  let count = 0

  for (let i = 0; i < minLength; i++) {
    const val1 = row1[i]
    const val2 = row2[i]

    if (val1 === val2) {
      count++
      continue
    }

    if (typeof val1 === 'string' && typeof val2 === 'string') {
      if (val1.toLowerCase() === val2.toLowerCase()) {
        count++
      }
    }
  }

  return count
}

/**
 * Extract header values from a row.
 */
function extractHeaders(row: unknown[]): string[] {
  return row.map(cell => {
    if (cell === null || cell === undefined) {
      return ''
    }

    return String(cell).trim()
  })
}

/**
 * Calculate the number of non-empty rows.
 */
function countNonEmptyRows(rows: unknown[][], startIndex: number): number {
  let count = 0

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i]

    if (row === null || row === undefined) {
      continue
    }

    const hasNonEmpty = row.some(cell => isNonEmpty(cell))

    if (hasNonEmpty) {
      count++
    }
  }

  return count
}

/**
 * Compute sheet quality metrics from column profiles.
 */
function computeQualityMetrics(
  columnProfiles: ColumnProfile[],
  rowCount: number,
  dataRowCount: number
): SheetQualityMetrics {
  if (columnProfiles.length === 0) {
    return {
      overallScore: 0,
      rowFillRate: 0,
      avgColumnFillRate: 0,
      strongColumnCount: 0,
      emptyColumnCount: 0,
      dataDensity: 0
    }
  }

  // Calculate row fill rate
  const rowFillRate = dataRowCount > 0 ? dataRowCount / rowCount : 0

  // Calculate average column fill rate
  let totalFillRate = 0
  let strongCount = 0
  let emptyCount = 0

  for (const profile of columnProfiles) {
    const fillRate = getColumnFillRate(profile)
    totalFillRate += fillRate

    // Strong column: good fill rate and non-empty header
    if (fillRate > 0.5 && profile.headerRaw.trim().length > 0) {
      strongCount++
    }

    // Empty column: mostly empty data
    if (fillRate < 0.1) {
      emptyCount++
    }
  }

  const avgColumnFillRate = totalFillRate / columnProfiles.length

  // Calculate data density (non-empty cells / total cells)
  let totalCells = 0
  let nonEmptyCells = 0

  for (const profile of columnProfiles) {
    totalCells += profile.totalCount
    nonEmptyCells += profile.nonEmptyCount
  }

  const dataDensity = totalCells > 0 ? nonEmptyCells / totalCells : 0

  // Calculate overall quality score (0-100)
  let overallScore = 0

  // Row fill rate contributes up to 25 points
  overallScore += Math.min(25, rowFillRate * 25)

  // Column fill rate contributes up to 25 points
  overallScore += Math.min(25, avgColumnFillRate * 25)

  // Strong column ratio contributes up to 25 points
  const strongRatio = strongCount / columnProfiles.length
  overallScore += Math.min(25, strongRatio * 25)

  // Data density contributes up to 25 points
  overallScore += Math.min(25, dataDensity * 25)

  return {
    overallScore: Math.round(overallScore),
    rowFillRate,
    avgColumnFillRate,
    strongColumnCount: strongCount,
    emptyColumnCount: emptyCount,
    dataDensity
  }
}

// ============================================================================
// MAIN PROFILING FUNCTION
// ============================================================================

/**
 * Profile an entire sheet.
 * Detects headers, profiles all columns, and computes quality metrics.
 *
 * @param rawSheet - The raw sheet data to profile
 * @param workbookId - Identifier for the source workbook
 * @param sheetIndex - Index of the sheet within the workbook
 * @param maxSamples - Maximum sample values per column (default: 5)
 * @returns Complete sheet profile
 */
export function profileSheet(
  rawSheet: RawSheet,
  workbookId: string,
  sheetIndex: number = 0,
  maxSamples: number = 5
): SheetProfile {
  const { sheetName, rows } = rawSheet

  // Handle empty sheets
  if (rows.length === 0) {
    return {
      workbookId,
      sheetName,
      sheetIndex,
      rowCount: 0,
      columnCount: 0,
      headerRowIndex: 0,
      headers: [],
      columnProfiles: [],
      qualityMetrics: {
        overallScore: 0,
        rowFillRate: 0,
        avgColumnFillRate: 0,
        strongColumnCount: 0,
        emptyColumnCount: 0,
        dataDensity: 0
      }
    }
  }

  // Detect header row
  const headerRowIndex = rawSheet.headerRowIndex ?? detectHeaderRowIndex(rows)

  // Extract headers
  const headerRow = rows[headerRowIndex] ?? []
  const headers = extractHeaders(headerRow)

  // Determine column count (max width of any row)
  let columnCount = 0
  for (const row of rows) {
    if (row !== null && row !== undefined && row.length > columnCount) {
      columnCount = row.length
    }
  }

  // Extract data rows (after header)
  const dataStartIndex = headerRowIndex + 1
  const dataRows = rows.slice(dataStartIndex)

  // Profile each column
  const columnProfiles: ColumnProfile[] = []

  for (let colIndex = 0; colIndex < columnCount; colIndex++) {
    // Extract cell values for this column
    const cellValues: unknown[] = []

    for (const row of dataRows) {
      if (row === null || row === undefined) {
        cellValues.push(null)
        continue
      }

      cellValues.push(row[colIndex] ?? null)
    }

    // Build raw column context
    const rawColumn: RawColumnContext = {
      workbookId,
      sheetName,
      columnIndex: colIndex,
      headerRaw: headers[colIndex] ?? '',
      cellValues
    }

    // Profile the column
    const profile = profileColumn(rawColumn, maxSamples)
    columnProfiles.push(profile)
  }

  // Count non-empty data rows
  const dataRowCount = countNonEmptyRows(rows, dataStartIndex)

  // Compute quality metrics
  const qualityMetrics = computeQualityMetrics(columnProfiles, rows.length, dataRowCount)

  return {
    workbookId,
    sheetName,
    sheetIndex,
    rowCount: rows.length,
    columnCount,
    headerRowIndex,
    headers,
    columnProfiles,
    qualityMetrics
  }
}

/**
 * Profile multiple sheets from a workbook.
 *
 * @param sheets - Array of raw sheets
 * @param workbookId - Identifier for the source workbook
 * @param maxSamples - Maximum sample values per column
 * @returns Array of sheet profiles
 */
export function profileSheets(
  sheets: RawSheet[],
  workbookId: string,
  maxSamples: number = 5
): SheetProfile[] {
  return sheets.map((sheet, index) => profileSheet(sheet, workbookId, index, maxSamples))
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get columns that have headers matching a pattern.
 */
export function findColumnsByHeaderPattern(
  profile: SheetProfile,
  pattern: RegExp
): ColumnProfile[] {
  return profile.columnProfiles.filter(col => pattern.test(col.headerRaw))
}

/**
 * Get the column profile for a specific index.
 */
export function getColumnByIndex(
  profile: SheetProfile,
  index: number
): ColumnProfile | undefined {
  return profile.columnProfiles[index]
}

/**
 * Get the column profile for a specific header (exact match).
 */
export function getColumnByHeader(
  profile: SheetProfile,
  header: string
): ColumnProfile | undefined {
  const normalizedHeader = header.toLowerCase().trim()

  return profile.columnProfiles.find(col =>
    col.headerNormalized === normalizedHeader ||
    col.headerRaw.toLowerCase().trim() === normalizedHeader
  )
}

/**
 * Get all columns that appear to contain identifiers.
 */
export function getIdentifierColumns(profile: SheetProfile): ColumnProfile[] {
  return profile.columnProfiles.filter(col => {
    // Good fill rate
    const fillRate = getColumnFillRate(col)
    if (fillRate < 0.5) {
      return false
    }

    // Has a header
    if (col.headerRaw.trim().length === 0) {
      return false
    }

    // High cardinality (many distinct values)
    if (col.nonEmptyCount === 0) {
      return false
    }

    const cardinality = col.distinctCountEstimate / col.nonEmptyCount
    return cardinality > 0.5
  })
}

/**
 * Get all columns that appear to contain category/status values.
 */
export function getCategoryColumns(profile: SheetProfile): ColumnProfile[] {
  return profile.columnProfiles.filter(col => {
    // Decent fill rate
    const fillRate = getColumnFillRate(col)
    if (fillRate < 0.2) {
      return false
    }

    // Has a header
    if (col.headerRaw.trim().length === 0) {
      return false
    }

    // Low cardinality (few distinct values)
    if (col.nonEmptyCount === 0) {
      return false
    }

    const cardinality = col.distinctCountEstimate / col.nonEmptyCount

    // Few distinct values but more than 1
    return cardinality < 0.2 && col.distinctCountEstimate > 1 && col.distinctCountEstimate < 20
  })
}

/**
 * Check if a sheet appears to have valid data.
 */
export function isValidDataSheet(profile: SheetProfile, minScore: number = 20): boolean {
  return profile.qualityMetrics.overallScore >= minScore
}

/**
 * Get a summary description of a sheet profile.
 */
export function getSheetProfileSummary(profile: SheetProfile): string {
  const { sheetName, rowCount, columnCount, qualityMetrics } = profile

  return [
    `Sheet: ${sheetName}`,
    `Dimensions: ${rowCount} rows × ${columnCount} columns`,
    `Quality: ${qualityMetrics.overallScore}/100`,
    `Fill Rate: ${(qualityMetrics.avgColumnFillRate * 100).toFixed(0)}%`,
    `Strong Columns: ${qualityMetrics.strongColumnCount}/${columnCount}`
  ].join(' | ')
}
