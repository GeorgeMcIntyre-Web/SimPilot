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

    if (!arrayBuffer) {
      throw new Error('Failed to read file data')
    }

    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: false,
      cellNF: false,
      cellText: false
    })

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Workbook is empty or invalid')
    }

    return workbook
  } catch (error) {
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
export function sheetToMatrix(workbook: XLSX.WorkBook, sheetName: string): CellValue[][] {
  if (!workbook.Sheets[sheetName]) {
    throw new Error(`Sheet "${sheetName}" not found in workbook. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }

  const sheet = workbook.Sheets[sheetName]

  // Convert to JSON format that gives us row arrays
  // Use header: 1 to get array of arrays instead of objects
  // defval: null ensures empty cells are represented as null
  const rows = XLSX.utils.sheet_to_json<CellValue[]>(sheet, {
    header: 1,
    defval: null,
    raw: false  // Get formatted text values, not raw numbers
  })

  if (rows.length === 0) {
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
      const cellText = String(cell || '').toLowerCase().trim()
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
 * Check if a row appears to be a "TOTAL" summary row
 */
export function isTotalRow(row: CellValue[]): boolean {
  if (!row || row.length === 0) return false
  const firstCell = String(row[0] || '').toLowerCase().trim()
  return firstCell === 'total' || firstCell === 'totals' || firstCell === 'sum'
}

