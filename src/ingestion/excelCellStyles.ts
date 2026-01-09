/**
 * Excel Cell Style Metadata
 *
 * SheetJS (xlsx) library extracts cell styles when cellStyles: true is enabled.
 * This module provides types and helpers for reading strike-through and hidden row metadata.
 */

import * as XLSX from 'xlsx'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Cell metadata extracted from Excel
 */
export interface CellMeta {
  value: string
  isStruck: boolean     // Font strike-through applied
  isHidden: boolean     // Row is hidden
}

/**
 * Parsed row with cell metadata
 */
export type ParsedRowWithMeta = Record<string, CellMeta>

// ============================================================================
// STYLE EXTRACTION
// ============================================================================

/**
 * Extract cell style metadata from a SheetJS cell object
 *
 * SheetJS cell format:
 * {
 *   v: value,
 *   s: {
 *     font: { strike: boolean },
 *     ...
 *   }
 * }
 */
export function extractCellMeta(
  cell: XLSX.CellObject | undefined | null,
  isRowHidden: boolean
): CellMeta {
  if (!cell) {
    return {
      value: '',
      isStruck: false,
      isHidden: isRowHidden
    }
  }

  // Get raw value
  const rawValue = cell.v ?? ''
  const value = String(rawValue).trim()

  // Check if cell has strike-through
  // SheetJS exposes styles via cell.s when cellStyles: true
  const isStruck = !!(cell.s as any)?.font?.strike

  return {
    value,
    isStruck,
    isHidden: isRowHidden
  }
}

/**
 * Extract row with metadata from a SheetJS sheet
 *
 * @param sheet - SheetJS worksheet
 * @param rowIndex - Zero-indexed row number
 * @param headers - Column headers (for building the keyed object)
 * @param hiddenRows - Set of hidden row indices (if available)
 * @returns ParsedRowWithMeta object
 */
export function extractRowWithMeta(
  sheet: XLSX.WorkSheet,
  rowIndex: number,
  headers: string[],
  hiddenRows: Set<number> = new Set()
): ParsedRowWithMeta {
  const row: ParsedRowWithMeta = {}
  const isRowHidden = hiddenRows.has(rowIndex)

  headers.forEach((header, colIndex) => {
    // SheetJS cell address: e.g., "A1", "B2", etc.
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
    const cell = sheet[cellAddress]

    row[header] = extractCellMeta(cell, isRowHidden)
  })

  return row
}

/**
 * Read hidden rows from SheetJS worksheet
 *
 * NOTE: SheetJS does NOT expose hidden rows in the free version.
 * This is a placeholder for future enhancement or Pro version usage.
 *
 * @param sheet - SheetJS worksheet
 * @returns Set of hidden row indices
 */
export function readHiddenRows(sheet: XLSX.WorkSheet): Set<number> {
  // SheetJS does not expose row hidden state in free version
  // If using Pro: check sheet['!rows'][rowIndex]?.hidden
  const hiddenRows = new Set<number>()

  if ((sheet as any)['!rows']) {
    const rowsInfo = (sheet as any)['!rows'] as Array<{ hidden?: boolean } | undefined>
    rowsInfo.forEach((rowInfo, index) => {
      if (rowInfo?.hidden) {
        hiddenRows.add(index)
      }
    })
  }

  return hiddenRows
}

// ============================================================================
// DELETION DETECTION
// ============================================================================

/**
 * Patterns indicating deleted/obsolete rows
 */
const DELETE_MARKER_PATTERNS = [
  'DELETED',
  'REMOVE',
  'REMOVED',
  'OBSOLETE',
  'CANCELLED',
  'VOID',
  'N/A',
  'NOT USED'
]

/**
 * Detect if a row is deleted based on style metadata and markers
 *
 * Rules (guard-clause style):
 * - If any primary identifier cell is struck-through: return true
 * - If the Excel row is hidden: return true
 * - If identifier is empty AND a delete marker string exists: return true
 * - If no style info and no markers: return false (don't guess aggressively)
 *
 * @param row - Parsed row with metadata
 * @param idHeaders - Primary identifier column names (e.g., "Equipment No", "Tooling Number RH")
 * @returns true if row should be skipped as deleted
 */
export function isDeletedRow(
  row: ParsedRowWithMeta,
  idHeaders: string[]
): boolean {
  // Rule 1: If any identifier cell is struck-through, consider deleted
  for (const header of idHeaders) {
    const cell = row[header]
    if (!cell) {
      continue
    }

    if (cell.isStruck && cell.value) {
      return true
    }
  }

  // Rule 2: If the Excel row is hidden, consider deleted
  const anyCell = Object.values(row)[0]
  if (anyCell?.isHidden) {
    return true
  }

  // Rule 3: Check for delete marker strings in any cell
  const hasDeleteMarker = Object.values(row).some(cell => {
    if (!cell?.value) {
      return false
    }

    const upperValue = cell.value.toUpperCase()
    return DELETE_MARKER_PATTERNS.some(pattern => upperValue.includes(pattern))
  })

  // Only consider delete marker if identifier cells are empty
  if (hasDeleteMarker) {
    const allIdentifiersEmpty = idHeaders.every(header => {
      const cell = row[header]
      return !cell?.value
    })

    if (allIdentifiersEmpty) {
      return true
    }
  }

  // Rule 4: If no evidence of deletion, keep the row
  return false
}

/**
 * Project-specific identifier headers for deletion detection
 */
export function getProjectIdentifierHeaders(projectHint: string): string[] {
  if (projectHint === 'BMW_J10735') {
    return ['Equipment No', 'Tooling Number RH', 'Tooling Number LH', 'Station']
  }

  if (projectHint === 'FORD_V801') {
    return ['Equipment No', 'Tooling Number RH', 'Tooling Number LH']
  }

  if (projectHint === 'STLA_S_ZAR') {
    return [
      'Equipment No Shown',
      'Equipment No Opposite',
      'Tooling Number RH',
      'Tooling Number LH',
      'Tooling Number RH (Opposite)',
      'Tooling Number LH (Opposite)'
    ]
  }

  // Generic fallback
  return ['Equipment No', 'Tooling Number RH', 'Tooling Number LH']
}

/**
 * Detect possible deletion via drawn shapes (heuristic)
 *
 * If a user drew a LINE SHAPE over the cell (not font strike), most parsers won't expose it.
 * This heuristic checks for underscore runs or redaction patterns.
 *
 * NOTE: This is NOT auto-skipped, just flagged as anomaly for inspection.
 *
 * @param value - Cell value
 * @returns true if value looks like it might be redacted via drawn shape
 */
export function isPossibleShapeRedaction(value: string): boolean {
  if (!value) {
    return false
  }

  // Check for long underscore runs (e.g., "_____" covering text)
  const underscoreRuns = value.match(/_+/g)
  if (underscoreRuns?.some(run => run.length >= 5)) {
    return true
  }

  // Check for other redaction patterns (dashes, equals, etc.)
  const redactionPatterns = [
    /-----+/,    // Long dash runs
    /=====+/,    // Equals runs
    /\*\*\*\*\*+/ // Asterisk runs
  ]

  return redactionPatterns.some(pattern => pattern.test(value))
}
