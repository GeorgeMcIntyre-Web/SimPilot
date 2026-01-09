// Excel Utility Functions
// Low-level helpers for reading and parsing Excel files using SheetJS

import * as XLSX from 'xlsx'

export type CellValue = string | number | boolean | null

/**
 * Internal type for Excel input - can be File or Blob.
 * This allows the ingestion layer to work with Files created from any source,
 * including blobs downloaded from cloud storage (SharePoint, OneDrive, S3, etc.).
 */
type ExcelInput = File | Blob

/**
 * Internal helper to read Excel content from File or Blob.
 *
 * This function is storage-agnostic and can handle Excel data from any source:
 * - Native File objects from <input type="file">
 * - Files created from Blobs (e.g., downloaded from HTTP APIs)
 * - Blobs from cloud storage providers
 *
 * The function uses ArrayBuffer for reliable cross-source compatibility.
 */
async function readWorkbookFromExcelInput(
  input: ExcelInput,
  fileName?: string
): Promise<XLSX.WorkBook> {
  if (!input) {
    throw new Error('Excel input is required')
  }

  // Get file name for validation (from File object or parameter)
  const name = input instanceof File ? input.name : (fileName || 'unknown.xlsx')

  if (!name.endsWith('.xlsx') && !name.endsWith('.xlsm') && !name.endsWith('.xls')) {
    throw new Error(`Invalid file type: ${name}. Expected Excel file (.xlsx, .xlsm, or .xls)`)
  }

  try {
    // Use ArrayBuffer for reliable reading from any source
    const arrayBuffer = await input.arrayBuffer()

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('File is empty or could not be read')
    }

    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: false,
      cellNF: false,
      cellText: false,
      cellStyles: true  // Enable style parsing for strike-through detection
    })

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Workbook is empty or invalid')
    }

    return workbook
  } catch (error) {
    // Re-throw our own errors as-is
    if (error instanceof Error && (
      error.message.includes('empty') ||
      error.message.includes('invalid') ||
      error.message.includes('File is empty')
    )) {
      throw error
    }
    // Wrap other errors
    throw new Error(`Failed to parse Excel file: ${error}`)
  }
}

/**
 * Read an Excel file from a File object and return a workbook.
 *
 * This function accepts File objects from any source:
 * - Local disk uploads via <input type="file">
 * - Files created from downloaded blobs (fetch, axios, etc.)
 * - Files from cloud storage APIs (SharePoint, OneDrive, etc.)
 *
 * The function is intentionally storage- and auth-agnostic.
 *
 * @param file - File object containing Excel data
 * @returns Parsed Excel workbook
 * @throws {Error} If file is invalid or cannot be parsed
 */
export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  return readWorkbookFromExcelInput(file)
}

/**
 * Convert a worksheet to a 2D array (matrix) of cell values
 * Returns rows with columns, normalizing to null for empty cells
 */
/**
 * Convert a worksheet to a 2D array (matrix) of cell values
 * Returns rows with columns, normalizing to null for empty cells
 */
export function sheetToMatrix(
  workbook: XLSX.WorkBook,
  sheetName: string,
  maxRows?: number
): CellValue[][] {
  if (!workbook.Sheets[sheetName]) {
    throw new Error(`Sheet "${sheetName}" not found in workbook. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }

  const sheet = workbook.Sheets[sheetName]

  // Convert to JSON format that gives us row arrays
  // Use header: 1 to get array of arrays instead of objects
  // defval: null ensures empty cells are represented as null
  const opts: XLSX.Sheet2JSONOpts = {
    header: 1,
    defval: null,
    raw: false  // Get formatted text values, not raw numbers
  }

  // Apply row limit if specified
  if (maxRows !== undefined) {
    // If sheet has !ref, we can parse it to limit the range
    if (sheet['!ref']) {
      const range = XLSX.utils.decode_range(sheet['!ref'])
      range.e.r = Math.min(range.e.r, range.s.r + maxRows - 1)
      opts.range = XLSX.utils.encode_range(range)
    }
  }

  const rows = XLSX.utils.sheet_to_json<CellValue[]>(sheet, opts)

  if (rows.length === 0) {
    // Don't throw if we just wanted to sniff and it's empty, but usually empty sheet is bad
    // For sniffing, an empty sheet is just empty data
    if (maxRows) return []
    throw new Error(`Sheet "${sheetName}" is empty`)
  }

  return rows
}

/**
 * Find the first row index that contains all required tokens (case-insensitive)
 * Returns null if no row contains all tokens
 */
export function findHeaderRow(
  rows: CellValue[][],
  requiredTokens: string[]
): number | null {
  if (requiredTokens.length === 0) return null

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    const rowText = row.map(cell => String(cell || '').toLowerCase().trim())
    const hasAllTokens = requiredTokens.every(token =>
      rowText.some(cellText => cellText.includes(token.toLowerCase().trim()))
    )

    if (hasAllTokens) return i
  }

  return null
}

/**
 * Find the best header row using confidence-based keyword scoring.
 * 
 * This function is more resilient than strict matching - it scores each row
 * based on presence of domain-specific keywords, returning the row with the highest score.
 * 
 * **Scoring Algorithm**:
 * - Strong keyword match: +2 points (e.g., "gun", "device", "tool", "riser")
 * - Weak keyword match: +1 point (e.g., "id", "type", "area", "station")
 * - Scans first 10 rows by default
 * - Returns row with highest score, or null if no row meets minimum threshold
 * 
 * **Why This Works**:
 * - Handles varied real-world headers ("Device Name", "Gun ID", "Riser Type")
 * - Doesn't require exact 3-header combinations
 * - Tolerates typos and extra columns
 * 
 * @param rows - All rows from the Excel sheet
 * @param strongKeywords - High-value domain keywords (e.g., ["gun", "tool", "device"])
 * @param weakKeywords - Common generic keywords (e.g., ["id", "type", "area"])
 * @param minScore - Minimum score threshold (default: 2, equivalent to 1 strong OR 2 weak keywords)
 * @param maxRowsToScan - Maximum rows to check (default: 10)
 * @returns Index of the most likely header row, or null if no row meets threshold
 * 
 * @example
 * ```typescript
 * // Real-world example: GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx
 * // Row 5: ['Zone', 'Station', 'Device Name', 'Type', 'Comments']
 * // Score: device(2) + type(1) + station(1) = 4 ✅
 * 
 * const strongKW = ['gun', 'tool', 'device', 'riser']
 * const weakKW = ['id', 'type', 'area', 'station', 'zone']
 * const headerIdx = findBestHeaderRow(rows, strongKW, weakKW, 2)
 * // Returns: 5
 * ```
 */
export function findBestHeaderRow(
  rows: CellValue[][],
  strongKeywords: string[],
  weakKeywords: string[],
  minScore: number = 2,
  maxRowsToScan: number = 10
): number | null {
  if (!rows || rows.length === 0) return null

  let bestRowIndex: number | null = null
  let bestScore = 0

  // Normalize keywords once (case-insensitive)
  const strongKWLower = strongKeywords.map(kw => kw.toLowerCase().trim())
  const weakKWLower = weakKeywords.map(kw => kw.toLowerCase().trim())

  // Scan first N rows
  const scanLimit = Math.min(maxRowsToScan, rows.length)

  for (let i = 0; i < scanLimit; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    // Flatten row to searchable text
    const rowText = row
      .map(cell => String(cell || '').toLowerCase().trim())
      .filter(text => text.length > 0)

    if (rowText.length === 0) continue

    // Calculate score
    let score = 0

    // Check strong keywords (+2 each)
    for (const keyword of strongKWLower) {
      const hasMatch = rowText.some(cellText => cellText.includes(keyword))
      if (hasMatch) score += 2
    }

    // Check weak keywords (+1 each)
    for (const keyword of weakKWLower) {
      const hasMatch = rowText.some(cellText => cellText.includes(keyword))
      if (hasMatch) score += 1
    }

    // Track best row
    if (score > bestScore) {
      bestScore = score
      bestRowIndex = i
    }
  }

  // Return best row if it meets threshold
  if (bestScore >= minScore) {
    return bestRowIndex
  }

  return null
}


/**
 * Build a column map from a header row
 * Returns an object mapping expected column names to their indices
 * Returns null for columns not found
 */
export function buildColumnMap(
  headerRow: CellValue[],
  expectedColumns: string[]
): Record<string, number | null> {
  const map: Record<string, number | null> = {}

  for (const expected of expectedColumns) {
    const expectedLower = expected.toLowerCase().trim()
    const index = headerRow.findIndex(cell => {
      // Normalize: lowercase, trim, and replace newlines/multiple spaces with single space
      const cellText = String(cell || '')
        .toLowerCase()
        .replace(/[\r\n]+/g, ' ')  // Replace newlines with spaces
        .replace(/\s+/g, ' ')       // Collapse multiple spaces
        .trim()
      return cellText === expectedLower || cellText.includes(expectedLower)
    })

    map[expected] = index >= 0 ? index : null
  }

  return map
}

/**
 * Extract a typed value from a cell using a column map
 */
export function getCell(
  row: CellValue[],
  columnMap: Record<string, number | null>,
  columnName: string
): CellValue {
  const index = columnMap[columnName]
  if (index === null || index === undefined) return null
  if (index >= row.length) return null
  return row[index]
}

/**
 * Get a cell value as a string, with fallback
 */
export function getCellString(
  row: CellValue[],
  columnMap: Record<string, number | null>,
  columnName: string
): string {
  const value = getCell(row, columnMap, columnName)
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/**
 * Get a cell value as a number, with fallback
 */
export function getCellNumber(
  row: CellValue[],
  columnMap: Record<string, number | null>,
  columnName: string
): number | null {
  const value = getCell(row, columnMap, columnName)
  if (value === null || value === undefined) return null

  const str = String(value).trim().toLowerCase()
  if (str === '' || str === 'na' || str === 'n/a') return null

  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

/**
 * Check if a row is empty (all cells are null/empty)
 */
export function isEmptyRow(row: CellValue[]): boolean {
  if (!row || row.length === 0) return true
  return row.every(cell => {
    // Handle null/undefined
    if (cell === null || cell === undefined) return true
    // Handle empty strings (including whitespace)
    if (typeof cell === 'string' && cell.trim() === '') return true
    // Everything else (numbers, booleans, non-empty strings) is data
    return false
  })
}

/**
 * Check if a row is effectively empty (has very few non-empty cells, likely not real data)
 * This helps reduce noise from warnings about rows that are mostly empty
 */
export function isEffectivelyEmptyRow(row: CellValue[], minCells: number = 2): boolean {
  if (!row || row.length === 0) return true
  const nonEmptyCount = row.filter(cell => {
    if (cell === null || cell === undefined) return false
    if (typeof cell === 'string' && cell.trim() === '') return false
    return true
  }).length
  return nonEmptyCount < minCells
}

/**
 * Check if a row appears to be a "TOTAL" summary row
 */
export function isTotalRow(row: CellValue[]): boolean {
  if (!row || row.length === 0) return false
  const firstCell = String(row[0] || '').toLowerCase().trim()
  return firstCell === 'total' || firstCell === 'totals' || firstCell === 'sum'
}

/**
 * Find the index of a column matching any of the possible names (case-insensitive)
 */
export function findColumnIndex(
  headerRow: CellValue[],
  possibleNames: string[]
): number | null {
  if (!headerRow || headerRow.length === 0) return null

  for (let i = 0; i < headerRow.length; i++) {
    const cellText = String(headerRow[i] || '').toLowerCase().trim()

    for (const name of possibleNames) {
      const nameLower = name.toLowerCase().trim()
      if (cellText === nameLower || cellText.includes(nameLower)) {
        return i
      }
    }
  }

  return null
}

/**
 * Check if a cell has strike-through formatting
 *
 * SheetJS exposes cell styles via cell.s when cellStyles: true is enabled
 * @param sheet - SheetJS worksheet
 * @param row - Row index (zero-based)
 * @param col - Column index (zero-based)
 * @returns true if cell has strike-through formatting
 */
export function isCellStruck(
  sheet: XLSX.WorkSheet,
  row: number,
  col: number
): boolean {
  const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
  const cell = sheet[cellAddress]

  if (!cell) {
    return false
  }

  // Check for strike-through in cell style
  // SheetJS format: cell.s.font.strike
  return !!(cell.s as any)?.font?.strike
}

/**
 * Check if any cells in a row have strike-through formatting
 * @param sheet - SheetJS worksheet
 * @param row - Row index (zero-based)
 * @param columns - Column indices to check (if not provided, checks all columns)
 * @returns true if any checked cell has strike-through
 */
export function isRowStruck(
  sheet: XLSX.WorkSheet,
  row: number,
  columns?: number[]
): boolean {
  if (!sheet['!ref']) {
    return false
  }

  const range = XLSX.utils.decode_range(sheet['!ref'])
  const colsToCheck = columns ?? Array.from(
    { length: range.e.c - range.s.c + 1 },
    (_, i) => i
  )

  return colsToCheck.some(col => isCellStruck(sheet, row, col))
}

