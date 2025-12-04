// Assemblies List Parser
// Parses Excel Assemblies List files (design progress tracking)
// Uses vacuum parsing to capture all progress metrics without hardcoded columns

import * as XLSX from 'xlsx'
import {
  Tool,
  ToolType,
  ToolMountType,
  generateId,
  IngestionWarning
} from '../domain/core'
import {
  sheetToMatrix,
  findBestHeaderRow,
  isEmptyRow,
  isTotalRow,
  isEffectivelyEmptyRow,
  CellValue
} from './excelUtils'
import { createRowSkippedWarning, createParserErrorWarning } from './warningUtils'

// ============================================================================
// TYPES
// ============================================================================

export interface AssembliesMetric {
  /** Exact header text (e.g., "1st Stage", "2nd Stage", "Detailing") */
  label: string
  /** Percentage 0-100, or null */
  percent: number | null
  /** Original value before normalization */
  rawValue: CellValue
}

export interface AssembliesListResult {
  tools: Tool[]
  warnings: IngestionWarning[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STRONG_KEYWORDS = [
  'station',
  'tool',
  'equipment',
  'description',
  'status',
  'progress',
  'stage',
  'detailing',
  'checking',
  'issued'
]

const WEAK_KEYWORDS = [
  'id',
  'name',
  'type',
  'area',
  'job',
  'customer',
  'number',
  'code'
]

// Core field aliases
const COLUMN_ALIASES: Record<string, string[]> = {
  'STATION': ['STATION', 'STATION NUMBER', 'STATION CODE', 'STN', 'STAND'],
  'TOOL_NUMBER': [
    'TOOL NUMBER',
    'TOOL',
    'EQUIPMENT',
    'DEVICE',
    'ID',
    'ITEM',
    'PART',
    'ASSEMBLY',
    'COMPONENT',
    'TOOL ID',
    'EQUIPMENT ID',
    'DEVICE ID',
    'PART NUMBER',
    'ITEM NUMBER'
  ],
  'DESCRIPTION': ['DESCRIPTION', 'DESC', 'NAME', 'TOOL NAME', 'ITEM DESC', 'PART NAME'],
  'AREA': ['AREA', 'AREA NAME', 'UNIT', 'LOCATION']
}

// Progress stage columns (flexible matching)
const PROGRESS_STAGES = [
  'NOT STARTED',
  '1ST STAGE',
  '2ND STAGE',
  'DETAILING',
  'CHECKING',
  'ISSUED',
  'COMPLETE'
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse percentage from various formats
 */
function parsePercent(value: CellValue): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    // Value 0-100
    if (value >= 0 && value <= 100) {
      return Math.round(value)
    }
    // Decimal 0-1
    if (value >= 0 && value <= 1) {
      return Math.round(value * 100)
    }
    return null
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null

    // "95%" or "95"
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*%?$/)
    if (match) {
      const num = parseFloat(match[1])
      if (!isNaN(num) && num >= 0 && num <= 100) {
        return Math.round(num)
      }
    }

    // "0.95"
    const decMatch = trimmed.match(/^0\.(\d+)$/)
    if (decMatch) {
      const num = parseFloat(trimmed)
      return Math.round(num * 100)
    }
  }

  return null
}

/**
 * Detect tool type from tool number (e.g., "BN010 GJR 10" -> GRIPPER)
 */
function detectToolType(toolNumber: string): ToolType {
  const upper = toolNumber.toUpperCase()

  if (upper.includes('GJR') || upper.includes('GRIPPER')) {
    return 'GRIPPER'
  }

  if (upper.includes('EGR') || upper.includes('GUN') || upper.includes('WELD')) {
    return 'SPOT_WELD'
  }

  if (upper.includes('SEALER') || upper.includes('SEAL')) {
    return 'SEALER'
  }

  if (upper.includes('STUD')) {
    return 'STUD_WELD'
  }

  return 'OTHER'
}

/**
 * Extract station code from tool number (e.g., "BN010 GJR 10" -> "BN010")
 */
function extractStationCode(toolNumber: string): string | undefined {
  const match = toolNumber.match(/^([A-Z]{2}\d{3})/)
  return match ? match[1] : undefined
}

/**
 * Extract area name from file name (e.g., "REAR_UNIT" -> "Rear Unit")
 */
function extractAreaFromFilename(fileName: string): string | undefined {
  const upper = fileName.toUpperCase()

  if (upper.includes('REAR_UNIT') || upper.includes('REAR UNIT')) {
    return 'Rear Unit'
  }

  if (upper.includes('FRONT_UNIT') || upper.includes('FRONT UNIT')) {
    return 'Front Unit'
  }

  if (upper.includes('UNDERBODY')) {
    return 'Underbody'
  }

  if (upper.includes('BOTTOM_TRAY') || upper.includes('BOTTOM TRAY')) {
    return 'Bottom Tray'
  }

  return undefined
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse an Assemblies List Excel file into Tool entities with design progress metrics
 */
export async function parseAssembliesList(
  workbook: XLSX.WorkBook,
  fileName: string,
  targetSheetName?: string
): Promise<AssembliesListResult> {
  const warnings: IngestionWarning[] = []

  // Use provided sheet name or default to "A_List"
  const sheetName = targetSheetName ?? (workbook.SheetNames.includes('A_List') ? 'A_List' : workbook.SheetNames[0])

  if (!sheetName) {
    throw new Error(`No sheets found in ${fileName}`)
  }

  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" not found in ${fileName}. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }

  // Convert to matrix
  const rows = sheetToMatrix(workbook, sheetName)

  if (rows.length < 10) {
    throw new Error(`Sheet "${sheetName}" has too few rows (${rows.length}). Expected at least 10 rows.`)
  }

  // Find header row (usually around row 8-10 in Assemblies Lists)
  const headerRowIndex = findBestHeaderRow(
    rows,
    STRONG_KEYWORDS,
    WEAK_KEYWORDS,
    3  // Minimum score
  )

  if (headerRowIndex === null) {
    throw new Error(
      `Could not find header row in ${fileName}. ` +
      `Expected keywords like: ${STRONG_KEYWORDS.slice(0, 5).join(', ')}, etc.`
    )
  }

  const headerRow = rows[headerRowIndex]

  // DEBUG: Log header row to understand structure
  console.log(`[Assemblies Parser] ${fileName} - Header row (index ${headerRowIndex}):`,
    headerRow.slice(0, 15).map((h, i) => `[${i}]${h}`))

  // Build core field indices
  const coreIndices: Record<string, number> = {}

  for (const [coreField, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < headerRow.length; i++) {
      const headerText = String(headerRow[i] || '').toUpperCase().trim()

      for (const alias of aliases) {
        if (headerText === alias.toUpperCase() || headerText.includes(alias.toUpperCase())) {
          coreIndices[coreField] = i
          break
        }
      }

      if (coreIndices[coreField] !== undefined) {
        break
      }
    }
  }

  // DEBUG: Log detected core fields
  console.log(`[Assemblies Parser] Core fields found:`, coreIndices)

  // Find metric columns (progress stages)
  const metricIndices: number[] = []
  const metricLabels: string[] = []
  const coreIndexSet = new Set(Object.values(coreIndices))

  for (let i = 0; i < headerRow.length; i++) {
    if (coreIndexSet.has(i)) {
      continue
    }

    const headerText = String(headerRow[i] || '').trim()

    // Skip empty headers
    if (headerText === '') {
      continue
    }

    // Check if this looks like a progress stage column
    const isProgressColumn = PROGRESS_STAGES.some(stage =>
      headerText.toUpperCase().includes(stage)
    )

    // Also include percentage columns or date columns
    const isPercentColumn = headerText.includes('%') || headerText.toUpperCase().includes('COMPLETE')
    const isDateColumn = headerText.toUpperCase().includes('DATE') || headerText.toUpperCase().includes('DUE')

    if (isProgressColumn || isPercentColumn || isDateColumn) {
      metricIndices.push(i)
      metricLabels.push(headerText)
    }
  }

  // Extract area from filename
  const areaName = extractAreaFromFilename(fileName)

  // Parse data rows
  const dataStartIndex = headerRowIndex + 1
  const tools: Tool[] = []

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty/total rows
    if (isEmptyRow(row) || isTotalRow(row)) {
      continue
    }

    // CHECK COLUMN A for type marker
    // Only parse rows where Column A = 'X' (main tools)
    // Skip 'Y' (sub-components), 'Z' (GA markers), 'T' (totals)
    const columnA = String(row[0] || '').trim().toUpperCase()
    if (columnA !== 'X') {
      // Skip sub-components and markers silently
      continue
    }

    // Extract tool number - can be in dedicated column OR embedded in station column
    let toolNumber = ''
    let stationCode = ''

    // Try dedicated TOOL_NUMBER column first
    const toolNumberIdx = coreIndices['TOOL_NUMBER']
    if (toolNumberIdx !== undefined) {
      toolNumber = String(row[toolNumberIdx] || '').trim()
    }

    // If no dedicated tool column, extract from STATION column
    // Format: "BN010 GJR 10" or "FU010 Fixture 5"
    if (!toolNumber && coreIndices['STATION'] !== undefined) {
      const stationValue = String(row[coreIndices['STATION']] || '').trim()

      // Parse format: "BN010 GJR 10" -> station: "BN010", tool: "GJR 10"
      const parts = stationValue.split(/\s+/)
      if (parts.length >= 2) {
        stationCode = parts[0]  // "BN010"
        toolNumber = parts.slice(1).join(' ')  // "GJR 10"
      } else {
        toolNumber = stationValue  // Use entire value as tool number
      }
    }

    if (!toolNumber) {
      // Skip silently if row is effectively empty
      if (!isEffectivelyEmptyRow(row, 2)) {
        warnings.push(createRowSkippedWarning({
          fileName,
          sheetName,
          rowIndex: i + 1,
          reason: 'No tool number found'
        }))
      }
      continue
    }

    // Extract station code if not already extracted
    if (!stationCode) {
      const extracted = coreIndices['STATION'] !== undefined
        ? String(row[coreIndices['STATION']] || '').trim() || extractStationCode(toolNumber)
        : extractStationCode(toolNumber)
      stationCode = extracted || ''
    }

    const description = coreIndices['DESCRIPTION'] !== undefined
      ? String(row[coreIndices['DESCRIPTION']] || '').trim() || undefined
      : undefined

    // Vacuum up all progress metrics
    const metrics: Record<string, any> = {}

    for (let j = 0; j < metricIndices.length; j++) {
      const colIndex = metricIndices[j]
      const label = metricLabels[j]
      const rawValue = row[colIndex]

      const percent = parsePercent(rawValue)

      metrics[label] = {
        percent,
        rawValue,
        label
      }
    }

    // Detect tool type
    const toolType = detectToolType(toolNumber)

    // Create Tool entity
    const tool: Tool = {
      id: generateId(),
      kind: toolType === 'SPOT_WELD' ? 'GUN' : 'TOOL',
      name: toolNumber,
      toolType,
      mountType: 'ROBOT_MOUNTED', // Default assumption for Assemblies List tools
      sourcing: 'MAKE', // Default assumption for Assemblies List (in-house manufacturing)
      description,
      areaName,
      stationNumber: stationCode,
      stationCode,
      metadata: {
        designProgress: JSON.stringify(metrics),
        source: 'AssembliesList'
      },
      sourceFile: fileName,
      sheetName,
      rowIndex: i + 1
    }

    tools.push(tool)
  }

  return {
    tools,
    warnings
  }
}
