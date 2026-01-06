// Assemblies List Parser
// Parses Excel Assemblies List files (design progress tracking)
// Uses vacuum parsing to capture all progress metrics without hardcoded columns

import * as XLSX from 'xlsx'
import { log } from '../lib/log'
import {
  Tool,
  ToolType,
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
import { createRowSkippedWarning } from './warningUtils'
import {
  buildStationId,
  buildToolId,
  inferAssembliesAreaName,
  extractRawStationCodeFromAssembliesLabel
} from './normalizers'

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
 * @deprecated Use extractRawStationCodeFromAssembliesLabel from normalizers.ts
 */
function extractStationCode(toolNumber: string): string | undefined {
  const result = extractRawStationCodeFromAssembliesLabel(toolNumber)
  return result || undefined
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
  // Skip first 8 rows to avoid matching metadata rows (Job Number, Customer, etc.)
  const rowsToSearch = rows.slice(8)
  const headerRowIndexRelative = findBestHeaderRow(
    rowsToSearch,
    STRONG_KEYWORDS,
    WEAK_KEYWORDS,
    3  // Minimum score
  )

  if (headerRowIndexRelative === null) {
    throw new Error(
      `Could not find header row in ${fileName}. ` +
      `Expected keywords like: ${STRONG_KEYWORDS.slice(0, 5).join(', ')}, etc.`
    )
  }

  const headerRowIndex = headerRowIndexRelative + 8
  const headerRow = rows[headerRowIndex]

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

  // Infer area from filename (and optionally workbook metadata)
  const areaName = inferAssembliesAreaName({ filename: fileName })

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

    // Extract tool number - ALWAYS use STATION column in Assemblies Lists
    // Format: "BN010 GJR 10" or "FU010 Fixture 5" or "S010 GJR 02 - 03"
    let toolNumber = ''
    let stationCode = ''

    const stationIdx = coreIndices['STATION']
    if (stationIdx !== undefined) {
      const stationValue = String(row[stationIdx] || '').trim()

      // Extract station code using normalizer helper (handles "S010", "BN010", etc.)
      const extractedStation = extractRawStationCodeFromAssembliesLabel(stationValue)
      if (extractedStation) {
        stationCode = extractedStation

        // Tool number is everything after the station code
        // "S010 GJR 02 - 03" -> "GJR 02 - 03"
        // "BN010 GJR 10" -> "GJR 10"
        const remainder = stationValue.substring(extractedStation.length).trim()
        toolNumber = remainder || stationValue
      } else {
        // No station code found, treat entire value as tool number
        toolNumber = stationValue
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

    // Extract station code if not already extracted (fallback)
    if (!stationCode) {
      const extracted = extractStationCode(toolNumber)
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

    // Build canonical IDs
    const canonicalStationId = buildStationId(areaName, stationCode)
    const canonicalToolId = buildToolId(canonicalStationId, toolNumber, null)

    // Create Tool entity
    const tool: Tool = {
      id: generateId(),
      kind: toolType === 'SPOT_WELD' ? 'GUN' : 'TOOL',
      name: toolNumber,
      toolType,
      mountType: 'ROBOT_MOUNTED', // Default assumption for Assemblies List tools
      sourcing: 'MAKE', // Default assumption for Assemblies List (in-house manufacturing)
      description,
      areaName: areaName ?? undefined,
      stationNumber: stationCode,
      stationCode,
      stationId: canonicalStationId,
      toolId: canonicalToolId,
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

  log.info(`[Assemblies Parser] ${fileName} - Parsed ${tools.length} tools`)

  return {
    tools,
    warnings
  }
}
