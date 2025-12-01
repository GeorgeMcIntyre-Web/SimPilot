// Workbook Loader
// Low-level loader that converts raw Excel files to normalized in-memory structures.
// Handles .xlsx/.xls detection, parsing, and cell normalization.

import * as XLSX from 'xlsx'

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single sheet with normalized cell values.
 * All values are string | number | null for predictable downstream processing.
 */
export interface NormalizedSheet {
  sheetName: string
  rows: (string | number | null)[][]
}

/**
 * A loaded workbook containing one or more normalized sheets.
 */
export interface NormalizedWorkbook {
  fileName: string
  sheets: NormalizedSheet[]
}

/**
 * An analyzed sheet with detected header row and split data.
 * Downstream parsers consume this instead of raw NormalizedSheet.
 */
export interface AnalyzedSheet {
  sheetName: string
  headerRowIndex: number
  headerValues: string[]
  dataRows: (string | number | null)[][]
}

/**
 * Options for loading a workbook.
 */
export interface LoadOptions {
  /**
   * Maximum rows to scan for header detection (default: 10)
   */
  maxHeaderScanRows?: number
}

// ============================================================================
// MAGIC BYTES FOR FILE TYPE DETECTION
// ============================================================================

const XLSX_MAGIC = [0x50, 0x4B, 0x03, 0x04] // PK.. (ZIP file)
const XLS_MAGIC = [0xD0, 0xCF, 0x11, 0xE0]  // OLE Compound Document

function detectFileTypeFromBytes(buffer: ArrayBuffer): 'xlsx' | 'xls' | 'unknown' {
  const view = new Uint8Array(buffer, 0, 4)

  // Check for XLSX (ZIP/PK header)
  if (
    view[0] === XLSX_MAGIC[0] &&
    view[1] === XLSX_MAGIC[1] &&
    view[2] === XLSX_MAGIC[2] &&
    view[3] === XLSX_MAGIC[3]
  ) {
    return 'xlsx'
  }

  // Check for XLS (OLE header)
  if (
    view[0] === XLS_MAGIC[0] &&
    view[1] === XLS_MAGIC[1] &&
    view[2] === XLS_MAGIC[2] &&
    view[3] === XLS_MAGIC[3]
  ) {
    return 'xls'
  }

  return 'unknown'
}

function detectFileTypeFromExtension(fileName: string): 'xlsx' | 'xls' | 'unknown' {
  const lower = fileName.toLowerCase()

  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) {
    return 'xlsx'
  }

  if (lower.endsWith('.xls')) {
    return 'xls'
  }

  return 'unknown'
}

// ============================================================================
// CELL VALUE NORMALIZATION
// ============================================================================

/**
 * Normalize a raw cell value to string | number | null.
 * - Numbers are kept as-is.
 * - Booleans are converted to number (0/1).
 * - Strings that look like numbers are converted to numbers.
 * - Other strings are trimmed but preserve internal line breaks.
 * - Everything else becomes null.
 */
function normalizeCellValue(value: unknown): string | number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return isNaN(value) ? null : value
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0
  }

  if (typeof value === 'string') {
    // Trim leading/trailing whitespace but preserve internal line breaks
    const trimmed = value.trim()

    if (trimmed === '') {
      return null
    }

    // Handle boolean strings (xlsx with raw: false returns 'TRUE'/'FALSE')
    const upperTrimmed = trimmed.toUpperCase()

    if (upperTrimmed === 'TRUE') {
      return 1
    }

    if (upperTrimmed === 'FALSE') {
      return 0
    }

    // Check if it's a pure number string (xlsx often returns numbers as strings)
    // Match: optional negative, digits, optional decimal, optional more digits
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed)

      if (!isNaN(num)) {
        return num
      }
    }

    return trimmed
  }

  // For Date objects or other types, convert to string
  return String(value).trim() || null
}

/**
 * Normalize a row of raw cell values.
 */
function normalizeRow(row: unknown[]): (string | number | null)[] {
  return row.map(normalizeCellValue)
}

// ============================================================================
// WORKBOOK LOADING
// ============================================================================

/**
 * Load a workbook from an ArrayBuffer (file content).
 * 
 * @param buffer - Raw file content as ArrayBuffer
 * @param fileName - Name of the file (for error messages and extension detection)
 * @returns NormalizedWorkbook or throws an error
 */
export function loadWorkbookFromBuffer(
  buffer: ArrayBuffer,
  fileName: string
): NormalizedWorkbook {
  // Validate input
  if (!buffer || buffer.byteLength === 0) {
    console.error(`[WorkbookLoader] Empty buffer for ${fileName}`)
    return { fileName, sheets: [] }
  }

  // Detect file type
  const byteType = detectFileTypeFromBytes(buffer)
  const extType = detectFileTypeFromExtension(fileName)

  // Prefer magic bytes, fall back to extension
  const fileType = byteType !== 'unknown' ? byteType : extType

  if (fileType === 'unknown') {
    console.error(`[WorkbookLoader] Unknown file type for ${fileName}`)
    return { fileName, sheets: [] }
  }

  // Parse workbook
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: false, // Keep dates as numbers
      cellNF: false,    // Skip number formats
      cellText: false   // Skip rich text
    })
  } catch (error) {
    console.error(`[WorkbookLoader] Failed to parse ${fileName}:`, error)
    return { fileName, sheets: [] }
  }

  // Validate workbook has sheets
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    console.error(`[WorkbookLoader] No sheets found in ${fileName}`)
    return { fileName, sheets: [] }
  }

  // Normalize each sheet
  const sheets: NormalizedSheet[] = []

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]

    if (!sheet) {
      continue
    }

    // Convert sheet to array of arrays
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: false  // Get formatted string values for reliable normalization
    })

    // Normalize each row
    const normalizedRows = rawRows.map(row => normalizeRow(row as unknown[]))

    // Remove completely empty trailing rows
    while (
      normalizedRows.length > 0 &&
      normalizedRows[normalizedRows.length - 1].every(cell => cell === null)
    ) {
      normalizedRows.pop()
    }

    sheets.push({
      sheetName,
      rows: normalizedRows
    })
  }

  return { fileName, sheets }
}

/**
 * Load a workbook from a File or Blob.
 * 
 * @param input - File or Blob containing Excel data
 * @param fileName - Optional filename override (uses File.name if available)
 * @returns Promise<NormalizedWorkbook>
 */
export async function loadWorkbook(
  input: File | Blob,
  fileName?: string
): Promise<NormalizedWorkbook> {
  const name = fileName ?? (input instanceof File ? input.name : 'unknown.xlsx')

  try {
    const buffer = await input.arrayBuffer()
    return loadWorkbookFromBuffer(buffer, name)
  } catch (error) {
    console.error(`[WorkbookLoader] Failed to read ${name}:`, error)
    return { fileName: name, sheets: [] }
  }
}

// ============================================================================
// HEADER ROW DETECTION
// ============================================================================

/**
 * Detect the header row in a normalized sheet.
 * 
 * A row is a candidate if:
 * - It has at least 3 non-empty cells
 * - All non-empty cells are strings
 * 
 * Returns the row with the highest count of non-empty string cells.
 * Scans the first `maxRows` rows (default: 10).
 * 
 * @param sheet - The normalized sheet to analyze
 * @param maxRows - Maximum rows to scan (default: 10)
 * @returns Row index (0-based) or null if no valid header found
 */
export function detectHeaderRow(
  sheet: NormalizedSheet,
  maxRows: number = 10
): number | null {
  if (!sheet.rows || sheet.rows.length === 0) {
    return null
  }

  const scanLimit = Math.min(maxRows, sheet.rows.length)
  let bestRowIndex: number | null = null
  let bestScore = 0

  for (let i = 0; i < scanLimit; i++) {
    const row = sheet.rows[i]

    if (!row || row.length === 0) {
      continue
    }

    // Count non-empty cells and check if all are strings
    let nonEmptyCount = 0
    let allStrings = true

    for (const cell of row) {
      if (cell === null) {
        continue
      }

      nonEmptyCount++

      if (typeof cell !== 'string') {
        allStrings = false
      }
    }

    // Must have at least 3 non-empty cells, all strings
    if (nonEmptyCount < 3) {
      continue
    }

    if (!allStrings) {
      continue
    }

    // Track best candidate
    if (nonEmptyCount > bestScore) {
      bestScore = nonEmptyCount
      bestRowIndex = i
    }
  }

  return bestRowIndex
}

/**
 * Convert a NormalizedSheet to an AnalyzedSheet.
 * 
 * Uses detectHeaderRow to find the header, then splits
 * the sheet into headerValues and dataRows.
 * 
 * @param sheet - The normalized sheet to analyze
 * @param maxHeaderScanRows - Maximum rows to scan for header (default: 10)
 * @returns AnalyzedSheet or null if no valid header found
 */
export function toAnalyzedSheet(
  sheet: NormalizedSheet,
  maxHeaderScanRows: number = 10
): AnalyzedSheet | null {
  const headerRowIndex = detectHeaderRow(sheet, maxHeaderScanRows)

  if (headerRowIndex === null) {
    return null
  }

  const headerRow = sheet.rows[headerRowIndex]

  // Convert header values to strings (trim but preserve typos exactly)
  const headerValues = headerRow.map(cell => {
    if (cell === null) {
      return ''
    }

    if (typeof cell === 'string') {
      return cell.trim()
    }

    return String(cell).trim()
  })

  // Data rows start after header row
  const dataRows = sheet.rows.slice(headerRowIndex + 1)

  // Drop trailing empty rows
  while (
    dataRows.length > 0 &&
    dataRows[dataRows.length - 1].every(cell => cell === null)
  ) {
    dataRows.pop()
  }

  return {
    sheetName: sheet.sheetName,
    headerRowIndex,
    headerValues,
    dataRows
  }
}

/**
 * Analyze all sheets in a workbook.
 * 
 * @param workbook - The normalized workbook
 * @param maxHeaderScanRows - Maximum rows to scan for headers
 * @returns Array of AnalyzedSheet (only successfully analyzed sheets)
 */
export function analyzeWorkbook(
  workbook: NormalizedWorkbook,
  maxHeaderScanRows: number = 10
): AnalyzedSheet[] {
  const analyzed: AnalyzedSheet[] = []

  for (const sheet of workbook.sheets) {
    const result = toAnalyzedSheet(sheet, maxHeaderScanRows)

    if (result === null) {
      continue
    }

    analyzed.push(result)
  }

  return analyzed
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { XLSX }
