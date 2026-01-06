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
  isTotalRow,
  CellValue
} from './excelUtils'
import { createRowSkippedWarning, createParserErrorWarning } from './warningUtils'
import { buildStationId, buildRobotId, inferAssembliesAreaName } from './normalizers'

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
  ['ID', 'AREA', 'STATION'],
  ['ROBOTNUMBER', 'ASSEMBLY LINE', 'STATION NUMBER'],  // From Robotlist_ZA files
  ['ROBOTNUMBER (E-NUMBER)', 'ASSEMBLY LINE', 'STATION NUMBER'],
  ['ROBOTS TOTAL', 'ASSEMBLY LINE', 'STATION NUMBER'],
  ['ROBOT', 'ASSEMBLY LINE', 'STATION'],
  // Additional patterns for Robotlist_ZA__STLA-S_UB files
  ['ROBOTNUMBER', 'ASSEMBLY LINE', 'STATION NUMBER'],  // Case variations
  ['ROBOT CAPTION', 'ASSEMBLY LINE', 'STATION NUMBER'],
  ['ROBOTS TOTAL', 'ASSEMBLY LINE', 'STATION NUMBER']  // "Robots Total" contains robot caption
]

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse a Robot List Excel file into Robot entities
 * 
 * @param workbook - The Excel workbook to parse
 * @param fileName - Name of the file (for warnings and metadata)
 * @param targetSheetName - Optional: specific sheet to parse (bypasses auto-detection)
 */
export async function parseRobotList(
  workbook: XLSX.WorkBook,
  fileName: string,
  targetSheetName?: string
): Promise<RobotListResult> {
  const warnings: IngestionWarning[] = []

  // Try to find header row in specified sheet or any sheet
  let headerRowIndex: number | null = null
  let sheetName: string | null = null
  let rows: CellValue[][] = []

  // If target sheet is specified, only search that sheet
  const sheetsToSearch = targetSheetName 
    ? [targetSheetName] 
    : workbook.SheetNames

  // Validate target sheet exists
  if (targetSheetName && workbook.SheetNames.includes(targetSheetName) === false) {
    throw new Error(`Sheet "${targetSheetName}" not found in ${fileName}. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }

  for (const name of sheetsToSearch) {
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

  if (headerRowIndex === null || sheetName === null) {
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
    'INDEX', // Robotlist_ZA files use "Index" column for area names
    'LINE',
    'LINE CODE',
    'ASSEMBLY LINE',
    'STATION',
    'STATION CODE',
    'STATION NUMBER',
    'CELL',
    // Additional patterns for Robotlist_ZA files
    'ROBOTNUMBER',
    'ROBOTNUMBER (E-NUMBER)',
    'ROBOT CAPTION',
    'ROBOTS TOTAL',
    'ROBOT TYPE',
    'ROBOT TYPE CONFIRMED'
  ])

  // Parse data rows
  const dataStartIndex = headerRowIndex + 1
  const robots: Robot[] = []

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty or total rows
    if (isEmptyRow(row) || isTotalRow(row)) continue

    // Extract station code first - CRITICAL: Only count rows with station numbers
    // This ensures we get exactly 166 robots (rows with stations), not 172 (all rows)
    const stationCode = getCellString(row, columnMap, 'STATION')
      || getCellString(row, columnMap, 'STATION CODE')
      || getCellString(row, columnMap, 'STATION NUMBER')
      || getCellString(row, columnMap, 'CELL')

    // Skip rows without station - these are not actual robot entries
    if (!stationCode) {
      continue
    }

    // Extract robot caption (e.g., "R01", "R02")
    const robotCaption = getCellString(row, columnMap, 'ROBOT CAPTION')
      || getCellString(row, columnMap, 'ROBOTS TOTAL')
      || getCellString(row, columnMap, 'ROBOT')
      || getCellString(row, columnMap, 'ROBOT NAME')
      || getCellString(row, columnMap, 'NAME')

    if (!robotCaption) {
      warnings.push(createRowSkippedWarning({
        fileName,
        sheetName,
        rowIndex: i + 1,
        reason: 'No robot caption found (station exists but no robot name)'
      }))
      continue
    }

    // Extract assembly line (e.g., "BN", "AL")
    const lineCode = getCellString(row, columnMap, 'LINE')
      || getCellString(row, columnMap, 'LINE CODE')
      || getCellString(row, columnMap, 'ASSEMBLY LINE')

    // Construct robot ID: AssemblyLine_Station_RobotCaption
    // Example: "BN_010_R01" or "AL_B09_010_R01"
    const robotId = lineCode
      ? `${lineCode}_${stationCode}_${robotCaption}`.replace(/\s+/g, '')
      : `${stationCode}_${robotCaption}`.replace(/\s+/g, '')

    // Extract E-Number (serial number) - this is METADATA, not the robot ID
    const eNumber = getCellString(row, columnMap, 'ROBOTNUMBER (E-NUMBER)')
      || getCellString(row, columnMap, 'ROBOTNUMBER')

    // Extract optional fields
    const oemModel = getCellString(row, columnMap, 'OEM MODEL')
      || getCellString(row, columnMap, 'MODEL')
      || getCellString(row, columnMap, 'TYPE')
      || getCellString(row, columnMap, 'ROBOT TYPE')
      || getCellString(row, columnMap, 'ROBOT TYPE CONFIRMED')

    let areaName: string | undefined = getCellString(row, columnMap, 'AREA')
      || getCellString(row, columnMap, 'AREA NAME')
      || getCellString(row, columnMap, 'INDEX') // Robotlist_ZA files use "Index" column for area names

    // Infer area from filename if not in row (similar to Assemblies Lists)
    if (!areaName) {
      areaName = inferAssembliesAreaName({ filename: fileName }) ?? undefined
    }

    // Vacuum Parser: Collect all other columns into metadata
    const metadata: Record<string, string | number | boolean | null> = {
      // Store E-Number as serialNumber metadata
      ...(eNumber ? { serialNumber: eNumber } : {})
    }
    const consumedHeaders = [
      'ROBOT', 'ROBOT ID', 'ROBOT NAME', 'ID', 'NAME',
      'MODEL', 'OEM MODEL', 'TYPE',
      'AREA', 'AREA NAME', 'INDEX',
      'LINE', 'LINE CODE', 'ASSEMBLY LINE',
      'STATION', 'STATION CODE', 'STATION NUMBER', 'CELL',
      'ROBOTNUMBER', 'ROBOTNUMBER (E-NUMBER)', 'ROBOT CAPTION', 'ROBOTS TOTAL',
      'ROBOT TYPE', 'ROBOT TYPE CONFIRMED'
    ]

    // Create a set of consumed indices based on the column map and consumed headers
    const consumedIndices = new Set<number>()
    consumedHeaders.forEach(h => {
      const idx = columnMap[h]
      if (idx !== null && idx !== undefined) consumedIndices.add(idx)
    })

    // Iterate over the row to find unconsumed data
    row.forEach((cell, index) => {
      if (index >= headerRow.length) return // Skip if no header
      if (consumedIndices.has(index)) return // Skip consumed columns

      const header = String(headerRow[index] || '').trim()
      if (!header) return // Skip empty headers

      // Add to metadata
      metadata[header] = cell
    })

    // Build canonical IDs
    const canonicalStationId = buildStationId(areaName, stationCode)
    const canonicalRobotId = buildRobotId(canonicalStationId, robotId)

    // Build robot entity
    // Map stationCode to stationNumber for UnifiedAsset compatibility
    const robot: Robot = {
      id: generateId('robot', robotId),
      kind: 'ROBOT',
      name: robotId,
      oemModel: oemModel || undefined,
      areaName: areaName || undefined,
      lineCode: lineCode || undefined,
      stationCode: stationCode || undefined,
      stationNumber: stationCode || undefined, // Map to UnifiedAsset field
      stationId: canonicalStationId,
      robotId: canonicalRobotId,
      toolIds: [],
      sourcing: 'UNKNOWN', // Default for now
      metadata: {
        ...metadata,
        // Store lineCode in metadata for UnifiedAsset access
        ...(lineCode ? { lineCode } : {})
      },
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
