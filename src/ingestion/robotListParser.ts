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
import { buildStationId, buildRobotId, inferAssembliesAreaName, normalizeStationCode } from './normalizers'

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
  ['ROBO NO. NEW', 'AREA', 'STATION'],            // Ford equipment list files
  ['ROBO NO. NEW', 'AREA', 'LINE'],              // Variant with line instead of station
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

  // Build column map from primary header row
  const headerRow = rows[headerRowIndex]

  // For Ford Robot Equipment List files with two-tier headers,
  // check if the next row looks like a secondary header row (has text but no station data)
  // and merge headers from it to capture fields like "Install status"
  const potentialSecondaryRow = rows[headerRowIndex + 1] || []
  const hasSecondaryHeaders = potentialSecondaryRow.length > 0 &&
    potentialSecondaryRow.some((cell, idx) => {
      // Check if there are header-like values in columns that are empty in the primary row
      const primaryEmpty = !headerRow[idx] || !String(headerRow[idx]).trim()
      const hasValue = cell && String(cell).trim()
      return primaryEmpty && hasValue
    })

  const secondaryHeaderRow = hasSecondaryHeaders ? potentialSecondaryRow : []

  // Merge headers - ensure we capture all columns from both rows
  const maxLength = Math.max(headerRow.length, secondaryHeaderRow.length)
  const mergedHeaderRow: CellValue[] = []
  for (let idx = 0; idx < maxLength; idx++) {
    const primaryVal = headerRow[idx]
    const secondaryVal = secondaryHeaderRow[idx]
    // Use primary header if present, otherwise fall back to secondary
    if (primaryVal && String(primaryVal).trim()) {
      mergedHeaderRow[idx] = primaryVal
    } else {
      mergedHeaderRow[idx] = secondaryVal
    }
  }

  const columnMap = buildColumnMap(mergedHeaderRow, [
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
    'STATION NO. NEW',
    'STATION NO. OLD',
    'STATION NO.',
    'ROBOTNUMBER',
    'ROBOTNUMBER (E-NUMBER)',
    'ROBOT CAPTION',
    'ROBOTS TOTAL',
    'ROBOT TYPE',
    'ROBOT TYPE CONFIRMED',
    // Ford equipment list variants
    'ROBO NO. NEW',
    'ROBO NO. OLD',
    // Install status for Ford Robot Equipment List
    'INSTALL STATUS'
  ])

  // Parse data rows
  // Start from the row after the primary header
  // Rows without valid station codes will be skipped automatically
  const dataStartIndex = headerRowIndex + 1
  const robots: Robot[] = []

  // Track area group for forward-fill (for Ford Robot Equipment List files where
  // column 0 contains area group names in merged cells, e.g., "DASH", "UNDERBODY")
  let currentAreaGroup = ''

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty or total rows
    if (isEmptyRow(row) || isTotalRow(row)) continue

    // Forward-fill area group from column 0 (for Robot Equipment List files)
    // Column 0 may contain area group names in merged cells that need to be carried forward
    const col0Value = row[0]
    if (col0Value !== null && col0Value !== undefined && String(col0Value).trim()) {
      const col0Str = String(col0Value).trim()
      // Only treat as area group if it looks like an area name (starts with letter, allows numbers/dashes)
      if (/^[A-Z][A-Za-z0-9\s\-_]+$/i.test(col0Str) && col0Str.length > 2) {
        currentAreaGroup = col0Str
      }
    }

    // Extract station code first - CRITICAL: Only count rows with station numbers
    // This ensures we get exactly 166 robots (rows with stations), not 172 (all rows)
    const stationCode = getCellString(row, columnMap, 'STATION NO. NEW')
      || getCellString(row, columnMap, 'STATION')
      || getCellString(row, columnMap, 'STATION CODE')
      || getCellString(row, columnMap, 'STATION NUMBER')
      || getCellString(row, columnMap, 'STATION NO.')
      || getCellString(row, columnMap, 'CELL')

    // Extract assembly line (e.g., "BN", "AL")
    const lineCode = getCellString(row, columnMap, 'LINE')
      || getCellString(row, columnMap, 'LINE CODE')
      || getCellString(row, columnMap, 'ASSEMBLY LINE')

    // For Ford Robot Equipment List files, the "Area" header column actually contains
    // "Person Responsible" data, not area names. The real area comes from column 0 (forward-filled).
    // Also, due to partial matching in buildColumnMap, "AREA" might map to "Robot count per area"
    // which contains numeric values like "1", "2", "3".
    // We check if the value from AREA column looks like:
    // - A number (from "Robot count per area" column)
    // - A person's name (mixed case with spaces like "Robyn Holtzhausen")
    const areaColumnValue = getCellString(row, columnMap, 'AREA')
      || getCellString(row, columnMap, 'AREA NAME')
      || getCellString(row, columnMap, 'INDEX') // Robotlist_ZA files use "Index" column for area names

    // Check if the area column value is invalid (numeric or a person's name)
    // - Numeric values come from "Robot count per area" column
    // - Person names typically have mixed case and spaces (e.g., "Robyn Holtzhausen")
    // - Area names are typically all caps or title case without spaces (e.g., "DASH", "UNDERBODY")
    const isNumeric = areaColumnValue && /^\d+$/.test(areaColumnValue)
    const looksLikePersonName = areaColumnValue &&
      /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(areaColumnValue)
    const isInvalidArea = isNumeric || looksLikePersonName

    let areaName: string | undefined

    // Prefer forward-filled area group if we have it and the AREA column value is invalid
    if (currentAreaGroup && (!areaColumnValue || isInvalidArea)) {
      areaName = currentAreaGroup
    } else {
      areaName = areaColumnValue
    }

    // Infer area from filename if not in row (similar to Assemblies Lists)
    if (!areaName) {
      areaName = inferAssembliesAreaName({ filename: fileName }) ?? undefined
    }

    // Skip rows without station - these are not actual robot entries
    if (!stationCode) {
      continue
    }

    // Extract primary robot number from "ROBO NO. NEW" if present, else fall back to caption fields
    const roboNoNew = getCellString(row, columnMap, 'ROBO NO. NEW')
    const robotCaption = getCellString(row, columnMap, 'ROBOT CAPTION')
      || getCellString(row, columnMap, 'ROBOTS TOTAL')
      || getCellString(row, columnMap, 'ROBOT')
      || getCellString(row, columnMap, 'ROBO NO. OLD')
      || getCellString(row, columnMap, 'ROBOT NAME')
      || getCellString(row, columnMap, 'NAME')
    const robotNumber = roboNoNew || robotCaption

    if (!robotNumber) {
      warnings.push(createRowSkippedWarning({
        fileName,
        sheetName,
        rowIndex: i + 1,
        reason: `No robot caption found (station="${stationCode}", line="${lineCode || 'unknown'}", area="${areaName || 'unknown'}")`
      }))
      continue
    }

    // Construct robot number/id using the human-readable robot number (prefer "ROBO NO. NEW")
    // Keep delimiters consistent (hyphens) so UI robot numbers align with IDs
    const normalizedStation = normalizeStationCode(stationCode) || (stationCode || '').replace(/\s+/g, '')
    const normalizedRobotNumber = robotNumber.replace(/\s+/g, '')
    const robotId = generateId('robot', normalizedStation, normalizedRobotNumber)

    // Extract E-Number (serial number) - this is METADATA, not the robot ID
    const eNumber = getCellString(row, columnMap, 'ROBOTNUMBER (E-NUMBER)')
      || getCellString(row, columnMap, 'ROBOTNUMBER')

    // Robot type
    const robotType =
      getCellString(row, columnMap, 'ROBOT TYPE') ||
      getCellString(row, columnMap, 'ROBOT TYPE CONFIRMED') ||
      undefined

    // Extract optional fields
    const oemModel = getCellString(row, columnMap, 'OEM MODEL')
      || getCellString(row, columnMap, 'MODEL')
      || getCellString(row, columnMap, 'TYPE')
      || getCellString(row, columnMap, 'ROBOT TYPE')
      || getCellString(row, columnMap, 'ROBOT TYPE CONFIRMED')

    // Vacuum Parser: Collect all other columns into metadata
    const metadata: Record<string, string | number | boolean | null> = {
      // Store E-Number as serialNumber metadata
      ...(eNumber ? { serialNumber: eNumber } : {}),
      robotNumber: robotNumber,
      ...(roboNoNew ? { 'Robo No. New': roboNoNew } : {})
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
    // Use mergedHeaderRow to capture headers from both primary and secondary header rows
    row.forEach((cell, index) => {
      if (index >= mergedHeaderRow.length) return // Skip if no header
      if (consumedIndices.has(index)) return // Skip consumed columns

      const header = String(mergedHeaderRow[index] || '').trim()
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
      id: canonicalRobotId || robotId,
      kind: 'ROBOT',
      name: robotNumber,
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
        ...(lineCode ? { lineCode } : {}),
        ...(robotType ? { robotType } : {}),
        // Store areaGroup in metadata for display in assets table
        ...(areaName ? { areaGroup: areaName } : {})
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
