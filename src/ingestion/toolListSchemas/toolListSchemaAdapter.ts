/**
 * Tool List Schema Adapter Integration Layer
 *
 * Detects project type and routes to appropriate schema adapter.
 * Produces ToolEntity[] with canonicalKey for UID resolution.
 */

import * as XLSX from 'xlsx'
import { sheetToMatrix, buildColumnMap, getCellString, CellValue, isCellStruck } from '../excelUtils'
import {
  ProjectHint,
  ToolEntity,
  ValidationReport,
  ValidationAnomaly
} from './normalizeToolListRow'
import { getProjectIdentifierHeaders, isPossibleShapeRedaction } from '../excelCellStyles'
import { log } from '../../lib/log'
import {
  normalizeBMWRow,
  bmwRowToToolEntities,
  validateBMWEntities
} from './bmwToolListSchema'
import {
  normalizeV801Rows,
  v801RowToToolEntities,
  validateV801Entities
} from './v801ToolListSchema'
import {
  normalizeSTLARow,
  stlaRowToToolEntities,
  validateSTLAEntities
} from './stlaToolListSchema'

// ============================================================================
// TYPES
// ============================================================================

export interface ToolListSchemaResult {
  entities: ToolEntity[]
  validation: ValidationReport
  projectHint: ProjectHint
}

// ============================================================================
// PROJECT DETECTION
// ============================================================================

/**
 * Detect project type from filename and column signatures
 */
export function detectProjectHint(fileName: string, columns: string[]): ProjectHint {
  const fileNameLower = fileName.toLowerCase()
  const columnSet = new Set(columns.map(c => c.toLowerCase()))

  // STLA signature: "SUB Area Name" column
  if (columnSet.has('sub area name')) {
    return 'STLA_S_ZAR'
  }

  // Ford V801 signature: "V801" in filename or specific area naming pattern
  if (fileNameLower.includes('v801') || fileNameLower.includes('ford')) {
    return 'FORD_V801'
  }

  // BMW signature: "J10735" or "BMW" in filename
  if (fileNameLower.includes('j10735') || fileNameLower.includes('bmw') || fileNameLower.includes('ncar')) {
    return 'BMW_J10735'
  }

  // STLA fallback: has "Tooling Number RH (Opposite)"
  if (columnSet.has('tooling number rh (opposite)')) {
    return 'STLA_S_ZAR'
  }

  // V801 fallback: has "Area Name" and "Tooling Number RH" but no "SUB Area Name"
  if (columnSet.has('area name') && columnSet.has('tooling number rh')) {
    return 'FORD_V801'
  }

  return 'UNKNOWN'
}

// ============================================================================
// SCHEMA ADAPTER
// ============================================================================

/**
 * Parse tool list using appropriate schema adapter
 */
export async function parseToolListWithSchema(
  workbook: XLSX.WorkBook,
  fileName: string,
  sheetName: string,
  debug = false
): Promise<ToolListSchemaResult> {
  const rows = sheetToMatrix(workbook, sheetName)
  const sheet = workbook.Sheets[sheetName]

  if (rows.length < 2) {
    throw new Error(`Sheet "${sheetName}" has too few rows (${rows.length})`)
  }

  // Find header row (first row with multiple non-empty cells)
  let headerRowIndex = 0
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const nonEmptyCount = rows[i].filter(cell => cell !== null && String(cell).trim() !== '').length
    if (nonEmptyCount >= 3) {
      headerRowIndex = i
      break
    }
  }

  const headerRow = rows[headerRowIndex]
  const columns = headerRow.map((h, idx) => h ? String(h).trim() : `Column_${idx}`)

  // Detect project type
  const projectHint = detectProjectHint(fileName, columns)
  
  if (debug) {
    log.debug(`[ToolListSchemaAdapter] File: ${fileName}, Header row: ${headerRowIndex}, Columns: ${columns.slice(0, 10).join(', ')}, Project: ${projectHint}`)
  }

  if (projectHint === 'UNKNOWN') {
    throw new Error(`Could not detect project type for file: ${fileName}. Columns found: ${columns.slice(0, 10).join(', ')}`)
  }

  // Build column map
  const columnMap = buildColumnMap(headerRow, [
    'ID',
    'Area Name',
    'SUB Area Name',
    'Station',
    'Work Cell / Station Group',
    'Equipment Type',
    'Equipment No',
    'Equipment No Shown',
    'Equipment No Opposite',
    'Tool',
    'Tooling Number RH',
    'Tooling Number LH',
    'Tooling Number RH (Opposite)',
    'Tooling Number LH (Opposite)',
    'SHOP'
  ])

  const dataStartIndex = headerRowIndex + 1
  
  // Store header row for vacuum parsing (pass to parse functions)
  const headerRowForVacuum = headerRow as CellValue[]
  const anomalies: ValidationAnomaly[] = []
  let entities: ToolEntity[] = []

  // Route to appropriate schema adapter
  if (projectHint === 'BMW_J10735') {
    entities = parseBMWRows(rows, dataStartIndex, columnMap, fileName, sheetName, sheet, projectHint, anomalies, debug, headerRowForVacuum)
    const validation = validateBMWEntities(entities, rows.length - dataStartIndex, anomalies)
    return { entities, validation, projectHint }
  }

  if (projectHint === 'FORD_V801') {
    entities = parseV801Rows(rows, dataStartIndex, columnMap, fileName, sheetName, sheet, projectHint, anomalies, debug, headerRowForVacuum)
    const validation = validateV801Entities(entities, rows.length - dataStartIndex, anomalies)
    return { entities, validation, projectHint }
  }

  if (projectHint === 'STLA_S_ZAR') {
    entities = parseSTLARows(rows, dataStartIndex, columnMap, fileName, sheetName, sheet, projectHint, anomalies, debug, headerRowForVacuum)
    const validation = validateSTLAEntities(entities, rows.length - dataStartIndex, anomalies)
    return { entities, validation, projectHint }
  }

  throw new Error(`Unsupported project hint: ${projectHint}`)
}

// ============================================================================
// PER-PROJECT PARSERS
// ============================================================================

function parseBMWRows(
  rows: unknown[][],
  dataStartIndex: number,
  columnMap: Record<string, number | null>,
  fileName: string,
  sheetName: string,
  sheet: XLSX.WorkSheet,
  projectHint: string,
  anomalies: ValidationAnomaly[],
  debug: boolean,
  headerRow: CellValue[]
): ToolEntity[] {
  const entities: ToolEntity[] = []
  const idHeaders = getProjectIdentifierHeaders(projectHint)

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i] as CellValue[]

    // Skip empty rows
    if (row.every(cell => cell === null || String(cell).trim() === '')) {
      continue
    }

    const rawRow: Record<string, unknown> = {
      'ID': getCellString(row, columnMap, 'ID'),
      'Area Name': getCellString(row, columnMap, 'Area Name'),
      'Station': getCellString(row, columnMap, 'Station'),
      'Equipment Type': getCellString(row, columnMap, 'Equipment Type'),
      'Equipment No': getCellString(row, columnMap, 'Equipment No'),
      'Tool': getCellString(row, columnMap, 'Tool'),
      'Tooling Number RH': getCellString(row, columnMap, 'Tooling Number RH'),
      'Tooling Number LH': getCellString(row, columnMap, 'Tooling Number LH')
    }

    // Vacuum parser: Capture ALL columns from the row (including unmapped ones)
    // This ensures metadata like 'Sim. Leader', 'Sim. Employee', etc. are preserved
    for (let colIdx = 0; colIdx < Math.max(headerRow.length, row.length); colIdx++) {
      const header = headerRow[colIdx] ? String(headerRow[colIdx]).trim() : `Column_${colIdx}`
      const cellValue = row[colIdx]
      
      // Only add if not already in rawRow (avoid overwriting mapped columns)
      // and if the cell has a value
      if (header && !rawRow.hasOwnProperty(header) && cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
        rawRow[header] = cellValue
      }
    }

    // Skip if no station (BMW requires station)
    if (!rawRow['Station']) {
      continue
    }

    // Skip example/template rows (check ID column)
    const rowId = String(rawRow['ID'] || '').toLowerCase()
    if (rowId.includes('example') || rowId.includes('template') || rowId.includes('sample')) {
      continue
    }

    // Detect deletion: check if any identifier cells are struck through
    const isDeleted = idHeaders.some(header => {
      const colIndex = columnMap[header]
      if (colIndex === null || colIndex === undefined) {
        return false
      }
      return isCellStruck(sheet, i, colIndex)
    })

    // Check for possible shape redaction (not auto-skipped, just flagged)
    const hasShapeRedaction = [
      rawRow['Equipment No'],
      rawRow['Tooling Number RH'],
      rawRow['Tooling Number LH']
    ].some(val => val && isPossibleShapeRedaction(String(val || '')))

    if (hasShapeRedaction && !isDeleted) {
      anomalies.push({
        type: 'POSSIBLE_SHAPE_REDACTION',
        row: i + 1,
        message: `Row ${i + 1} has possible shape redaction (underscore/dash runs) but no strike-through`,
        data: rawRow
      })
    }

    const normalized = normalizeBMWRow(rawRow, fileName, i)
    normalized.isDeleted = isDeleted

    // Skip producing entities if deleted
    if (isDeleted) {
      if (debug) {
        anomalies.push({
          type: 'DELETED_ROW',
          row: i + 1,
          message: `Row ${i + 1} skipped: struck-through identifiers detected`,
          data: rawRow
        })
      }
      continue
    }

    const rowEntities = bmwRowToToolEntities(normalized, sheetName, debug)
    entities.push(...rowEntities)
  }

  return entities
}

function parseV801Rows(
  rows: unknown[][],
  dataStartIndex: number,
  columnMap: Record<string, number | null>,
  fileName: string,
  sheetName: string,
  sheet: XLSX.WorkSheet,
  projectHint: string,
  anomalies: ValidationAnomaly[],
  debug: boolean,
  headerRow: CellValue[]
): ToolEntity[] {
  const rawRows = []
  const idHeaders = getProjectIdentifierHeaders(projectHint)

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i] as CellValue[]

    // Skip empty rows
    if (row.every(cell => cell === null || String(cell).trim() === '')) {
      continue
    }

    const rawRow: Record<string, unknown> = {
      'Area Name': getCellString(row, columnMap, 'Area Name'),
      'Station': getCellString(row, columnMap, 'Station'),
      'Equipment No': getCellString(row, columnMap, 'Equipment No'),
      'Tooling Number RH': getCellString(row, columnMap, 'Tooling Number RH'),
      'Tooling Number LH': getCellString(row, columnMap, 'Tooling Number LH'),
      'Equipment Type': getCellString(row, columnMap, 'Equipment Type')
    }

    // Vacuum parser: Capture ALL columns from the row (including unmapped ones)
    // This ensures metadata like 'Sim. Leader', 'Sim. Employee', etc. are preserved
    for (let colIdx = 0; colIdx < Math.max(headerRow.length, row.length); colIdx++) {
      const header = headerRow[colIdx] ? String(headerRow[colIdx]).trim() : `Column_${colIdx}`
      const cellValue = row[colIdx]
      
      // Only add if not already in rawRow (avoid overwriting mapped columns)
      // and if the cell has a value
      if (header && !rawRow.hasOwnProperty(header) && cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
        rawRow[header] = cellValue
      }
    }

    // Detect deletion
    const isDeleted = idHeaders.some(header => {
      const colIndex = columnMap[header]
      if (colIndex === null || colIndex === undefined) {
        return false
      }
      return isCellStruck(sheet, i, colIndex)
    })

    // Check for shape redaction
    const hasShapeRedaction = [
      rawRow['Equipment No'],
      rawRow['Tooling Number RH'],
      rawRow['Tooling Number LH']
    ].some(val => val && isPossibleShapeRedaction(String(val || '')))

    if (hasShapeRedaction && !isDeleted) {
      anomalies.push({
        type: 'POSSIBLE_SHAPE_REDACTION',
        row: i + 1,
        message: `Row ${i + 1} has possible shape redaction but no strike-through`,
        data: rawRow
      })
    }

    if (isDeleted) {
      if (debug) {
        anomalies.push({
          type: 'DELETED_ROW',
          row: i + 1,
          message: `Row ${i + 1} skipped: struck-through identifiers detected`,
          data: rawRow
        })
      }
      continue
    }

    rawRows.push(rawRow)
  }

  const normalized = normalizeV801Rows(rawRows, fileName, dataStartIndex)
  const entities: ToolEntity[] = []

  for (const norm of normalized) {
    const rowEntities = v801RowToToolEntities(norm, sheetName, anomalies, debug)
    entities.push(...rowEntities)
  }

  return entities
}

function parseSTLARows(
  rows: unknown[][],
  dataStartIndex: number,
  columnMap: Record<string, number | null>,
  fileName: string,
  sheetName: string,
  sheet: XLSX.WorkSheet,
  projectHint: string,
  anomalies: ValidationAnomaly[],
  debug: boolean,
  headerRowForVacuum: CellValue[]
): ToolEntity[] {
  const entities: ToolEntity[] = []
  const idHeaders = getProjectIdentifierHeaders(projectHint)

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i] as CellValue[]

    // Skip empty rows
    if (row.every(cell => cell === null || String(cell).trim() === '')) {
      continue
    }

    // Build rawRow with mapped columns
    const rawRow: Record<string, unknown> = {
      'SUB Area Name': getCellString(row, columnMap, 'SUB Area Name'),
      'Station': getCellString(row, columnMap, 'Station') || getCellString(row, columnMap, 'Work Cell / Station Group'),
      'Equipment No Shown': getCellString(row, columnMap, 'Equipment No Shown'),
      'Equipment No Opposite': getCellString(row, columnMap, 'Equipment No Opposite'),
      'Tooling Number RH': getCellString(row, columnMap, 'Tooling Number RH'),
      'Tooling Number LH': getCellString(row, columnMap, 'Tooling Number LH'),
      'Tooling Number RH (Opposite)': getCellString(row, columnMap, 'Tooling Number RH (Opposite)'),
      'Tooling Number LH (Opposite)': getCellString(row, columnMap, 'Tooling Number LH (Opposite)'),
      'Equipment Type': getCellString(row, columnMap, 'Equipment Type'),
      'SHOP': getCellString(row, columnMap, 'SHOP')
    }
    
    // Vacuum parser: Capture ALL columns from the row (including unmapped ones)
    // This ensures metadata like 'Sim. Leader', 'Sim. Employee', etc. are preserved
    for (let colIdx = 0; colIdx < Math.max(headerRowForVacuum.length, row.length); colIdx++) {
      const header = headerRowForVacuum[colIdx] ? String(headerRowForVacuum[colIdx]).trim() : `Column_${colIdx}`
      const cellValue = row[colIdx]
      
      // Only add if not already in rawRow (avoid overwriting mapped columns)
      // and if the cell has a value
      if (header && !rawRow.hasOwnProperty(header) && cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
        rawRow[header] = cellValue
      }
    }

    // Skip if no station
    if (!rawRow['Station']) {
      continue
    }

    // Detect deletion
    const isDeleted = idHeaders.some(header => {
      const colIndex = columnMap[header]
      if (colIndex === null || colIndex === undefined) {
        return false
      }
      return isCellStruck(sheet, i, colIndex)
    })

    // Check for shape redaction
    const hasShapeRedaction = [
      rawRow['Equipment No Shown'],
      rawRow['Equipment No Opposite'],
      rawRow['Tooling Number RH'],
      rawRow['Tooling Number LH'],
      rawRow['Tooling Number RH (Opposite)'],
      rawRow['Tooling Number LH (Opposite)']
    ].some(val => val && isPossibleShapeRedaction(String(val || '')))

    if (hasShapeRedaction && !isDeleted) {
      anomalies.push({
        type: 'POSSIBLE_SHAPE_REDACTION',
        row: i + 1,
        message: `Row ${i + 1} has possible shape redaction but no strike-through`,
        data: rawRow
      })
    }

    const normalized = normalizeSTLARow(rawRow, fileName, i)
    normalized.isDeleted = isDeleted

    // Skip producing entities if deleted
    if (isDeleted) {
      if (debug) {
        anomalies.push({
          type: 'DELETED_ROW',
          row: i + 1,
          message: `Row ${i + 1} skipped: struck-through identifiers detected`,
          data: rawRow
        })
      }
      continue
    }

    const rowEntities = stlaRowToToolEntities(normalized, sheetName, anomalies, debug)
    entities.push(...rowEntities)
  }

  return entities
}
