// Robot List Parser
// Parses Excel robot list files into Robot entities

import * as XLSX from 'xlsx'
import { Robot, generateId, IngestionWarning } from '../domain/core'
import {
  sheetToMatrix,
  findHeaderRow,
  buildColumnMap,
  getCellString,
  isEmptyRow,
  isTotalRow
} from './excelUtils'
import { createRowSkippedWarning, createParserErrorWarning } from './warningUtils'

// ============================================================================
// TYPES
// ============================================================================

export interface RobotListResult {
  robots: Robot[]
  warnings: IngestionWarning[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const POSSIBLE_HEADERS = [
  ['ROBOT', 'AREA', 'STATION'],
  ['ROBOT ID', 'AREA', 'STATION'],
  ['ROBOT NAME', 'AREA', 'LINE'],
  ['ID', 'AREA', 'STATION']
]

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse a Robot List Excel file into Robot entities
 */
export async function parseRobotList(
  workbook: XLSX.WorkBook,
  fileName: string
): Promise<RobotListResult> {
  const warnings: IngestionWarning[] = []

  // Try to find header row in any sheet
  let headerRowIndex: number | null = null
  let sheetName: string | null = null
  let rows: any[][] = []

  for (const name of workbook.SheetNames) {
    const sheetRows = sheetToMatrix(workbook, name)
    if (sheetRows.length < 2) continue

    for (const headerSet of POSSIBLE_HEADERS) {
      const index = findHeaderRow(sheetRows, headerSet)
      if (index !== null) {
        headerRowIndex = index
        sheetName = name
        rows = sheetRows
        break
      }
    }

    if (headerRowIndex !== null) break
  }

  if (headerRowIndex === null || !sheetName) {
    throw new Error(`Could not find header row in any sheet of ${fileName}. Tried combinations: ${POSSIBLE_HEADERS.map(h => h.join(', ')).join(' | ')}`)
  }

  // Build column map
  const headerRow = rows[headerRowIndex]
  const columnMap = buildColumnMap(headerRow, [
    'ROBOT',
    'ROBOT ID',
    'ROBOT NAME',
    'ID',
    'NAME',
    'MODEL',
    'OEM MODEL',
    'TYPE',
    'AREA',
    'AREA NAME',
    'LINE',
    'LINE CODE',
    'ASSEMBLY LINE',
    'STATION',
    'STATION CODE',
    'CELL'
  ])

  // Parse data rows
  const dataStartIndex = headerRowIndex + 1
  const robots: Robot[] = []

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty or total rows
    if (isEmptyRow(row) || isTotalRow(row)) continue

    // Extract robot identifier (try multiple column names)
    const robotId = getCellString(row, columnMap, 'ROBOT ID')
      || getCellString(row, columnMap, 'ROBOT')
      || getCellString(row, columnMap, 'ID')
      || getCellString(row, columnMap, 'ROBOT NAME')
      || getCellString(row, columnMap, 'NAME')

    if (!robotId) {
      warnings.push(createRowSkippedWarning({
        fileName,
        sheetName,
        rowIndex: i + 1,
        reason: 'No robot ID found in any expected columns'
      }))
      continue
    }

    // Extract optional fields
    const oemModel = getCellString(row, columnMap, 'OEM MODEL')
      || getCellString(row, columnMap, 'MODEL')
      || getCellString(row, columnMap, 'TYPE')

    const areaName = getCellString(row, columnMap, 'AREA')
      || getCellString(row, columnMap, 'AREA NAME')

    const lineCode = getCellString(row, columnMap, 'LINE')
      || getCellString(row, columnMap, 'LINE CODE')
      || getCellString(row, columnMap, 'ASSEMBLY LINE')

    const stationCode = getCellString(row, columnMap, 'STATION')
      || getCellString(row, columnMap, 'STATION CODE')
      || getCellString(row, columnMap, 'CELL')

    // Build robot entity
    const robot: Robot = {
      id: generateId('robot', robotId),
      name: robotId,
      oemModel: oemModel || undefined,
      areaName: areaName || undefined,
      lineCode: lineCode || undefined,
      stationCode: stationCode || undefined,
      toolIds: [],
      sourceFile: fileName,
      sheetName,
      rowIndex: i
    }

    robots.push(robot)
  }

  if (robots.length === 0) {
    warnings.push(createParserErrorWarning({
      fileName,
      sheetName,
      error: 'No valid robot rows found after parsing'
    }))
  }

  return {
    robots,
    warnings
  }
}
