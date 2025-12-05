// Tool List Parser
// Parses Excel tool/equipment files into generic Tool entities
// Handles spot weld guns (pneumatic/servo), sealers, grippers, etc.

import * as XLSX from 'xlsx'
import { Tool, ToolType, ToolMountType, SpotWeldSubType, generateId, IngestionWarning, EquipmentSourcing, AssetKind } from '../domain/core'
import {
  sheetToMatrix,
  findBestHeaderRow,
  buildColumnMap,
  getCellString,
  isEmptyRow,
  isTotalRow,
  isEffectivelyEmptyRow
} from './excelUtils'
import { createRowSkippedWarning, createParserErrorWarning } from './warningUtils'
import { buildStationId, buildToolId, inferAssembliesAreaName } from './normalizers'

// ============================================================================
// TYPES
// ============================================================================

export interface ToolListResult {
  tools: Tool[]
  warnings: IngestionWarning[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Strong keywords for tool/equipment identification
 * These are domain-specific terms that strongly indicate aheader row for tool lists.
 * Score: +2 points per match
 */
const STRONG_KEYWORDS = [
  'gun',
  'tool',
  'device',
  'riser',
  'tip dresser',
  'dresser',
  'stand',
  'equipment',
  'sealer',
  'gripper'
]

/**
 * Weak keywords for general column identification
 * These are common terms that appear in many types of sheets.
 * Score: +1 point per match
 */
const WEAK_KEYWORDS = [
  'id',
  'name',
  'type',
  'area',
  'station',
  'zone',
  'line',
  'cell',
  'qty',
  'quantity',
  'model',
  'oem',
  'robot'
]

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse a Tool List Excel file (weld guns, sealers, etc.) into Tool entities
 * 
 * @param workbook - The Excel workbook to parse
 * @param fileName - Name of the file (for warnings and metadata)
 * @param targetSheetName - Optional: specific sheet to parse (bypasses auto-detection)
 */
export async function parseToolList(
  workbook: XLSX.WorkBook,
  fileName: string,
  targetSheetName?: string
): Promise<ToolListResult> {
  const warnings: IngestionWarning[] = []

  // Use provided sheet name or default to first sheet
  const sheetName = targetSheetName ?? workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error(`No sheets found in ${fileName}`)
  }

  // Validate that the target sheet exists
  if (workbook.SheetNames.includes(sheetName) === false) {
    throw new Error(`Sheet "${sheetName}" not found in ${fileName}. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }

  // Convert to matrix
  const rows = sheetToMatrix(workbook, sheetName)
  if (rows.length < 2) {
    throw new Error(`Sheet "${sheetName}" has too few rows (${rows.length}). Expected at least 2 rows.`)
  }

  // Find header row using confidence-based scoring
  // This approach is more resilient than strict pattern matching:
  // - Handles varied header names ("Device Name" vs "Gun" vs "Equipment")
  // - Tolerates typos and extra columns
  // - Doesn't require exact 3-header combinations
  const headerRowIndex = findBestHeaderRow(
    rows,
    STRONG_KEYWORDS,
    WEAK_KEYWORDS,
    2  // Minimum score: 1 strong keyword OR 2 weak keywords
  )

  if (headerRowIndex === null) {
    throw new Error(
      `Could not find header row in ${fileName}. ` +
      `Expected at least one strong keyword (${STRONG_KEYWORDS.slice(0, 5).join(', ')}, etc.) ` +
      `or multiple weak keywords (${WEAK_KEYWORDS.slice(0, 5).join(', ')}, etc.)`
    )
  }

  // Build column map with all possible column names
  const headerRow = rows[headerRowIndex]
  const columnMap = buildColumnMap(headerRow, [
    'EQUIPMENT NO SHOWN',
    'EQUIPMENT NO',
    'GUN',
    'GUN ID',
    'GUN NUMBER',
    'TOOL',
    'TOOL ID',
    'TOOL NAME',
    'ID',
    'NAME',
    'EQUIPMENT',
    'EQUIPMENT ID',
    'TYPE',
    'TOOL TYPE',
    'GUN TYPE',
    'SUBTYPE',
    'MODEL',
    'OEM MODEL',
    'MANUFACTURER',
    'SUPPLIER',
    'AREA',
    'AREA NAME',
    'LINE',
    'LINE CODE',
    'ASSEMBLY LINE',
    'STATION',
    'STATION CODE',
    'CELL',
    'REUSE',
    'REUSE STATUS',
    'STATUS',
    'COMMENTS',
    'COMMENT',
    'NOTES',
    'NOTE',
    'SUPPLY',
    'REFRESMENT OK'
  ])

  // Detect tool type from filename
  const defaultToolType = detectToolTypeFromFilename(fileName)

  // Parse data rows
  const dataStartIndex = headerRowIndex + 1
  const tools: Tool[] = []

  // Check if "EQUIPMENT NO SHOWN" column exists in the header
  const hasEquipmentNoColumn = columnMap['EQUIPMENT NO SHOWN'] !== null || columnMap['EQUIPMENT NO'] !== null

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i]

    // Skip empty or total rows
    if (isEmptyRow(row) || isTotalRow(row)) continue

    // FILTER: Only parse rows where "Equipment No \nShown" is not empty
    // This column indicates real tool positions (excludes metadata/summary rows)
    // BUT: Only apply this filter if the column actually exists in the data
    const equipmentNoShown = getCellString(row, columnMap, 'EQUIPMENT NO SHOWN')
      || getCellString(row, columnMap, 'EQUIPMENT NO')

    if (hasEquipmentNoColumn && !equipmentNoShown) {
      // Skip rows without equipment number (not a real tool)
      // Only apply this filter when the column exists in the sheet
      continue
    }

    // Extract tool identifier (try multiple column names)
    // Priority order: specific IDs first, then broader names
    // IMPORTANT: Check "EQUIPMENT NO SHOWN" before "TOOL" to avoid matching generic "Tool" column
    const toolId = getCellString(row, columnMap, 'EQUIPMENT NO SHOWN')
      || getCellString(row, columnMap, 'GUN ID')
      || getCellString(row, columnMap, 'GUN NUMBER')
      || getCellString(row, columnMap, 'TOOL ID')
      || getCellString(row, columnMap, 'EQUIPMENT ID')
      || getCellString(row, columnMap, 'GUN')
      || getCellString(row, columnMap, 'TOOL')
      || getCellString(row, columnMap, 'TOOL NAME')
      || getCellString(row, columnMap, 'EQUIPMENT NO')
      || getCellString(row, columnMap, 'EQUIPMENT')
      || getCellString(row, columnMap, 'ID')
      || getCellString(row, columnMap, 'NAME')

    if (!toolId) {
      // Only warn if row looks like it might have been intended as data
      // Skip warnings for effectively empty rows (reduces noise)
      if (!isEffectivelyEmptyRow(row, 2)) {
        warnings.push(createRowSkippedWarning({
          fileName,
          sheetName,
          rowIndex: i + 1,
          reason: 'No tool ID found in any expected columns'
        }))
      }
      continue
    }

    // Extract type information
    const typeStr = getCellString(row, columnMap, 'TYPE')
      || getCellString(row, columnMap, 'TOOL TYPE')
      || getCellString(row, columnMap, 'GUN TYPE')

    const subtypeStr = getCellString(row, columnMap, 'SUBTYPE')

    // Determine tool type and subtype
    const toolType = detectToolType(typeStr, fileName, defaultToolType)
    const subType = detectSpotWeldSubType(typeStr, subtypeStr)

    // Extract optional fields
    const oemModel = getCellString(row, columnMap, 'MODEL')
      || getCellString(row, columnMap, 'OEM MODEL')
      || getCellString(row, columnMap, 'MANUFACTURER')
      || getCellString(row, columnMap, 'SUPPLIER')

    let areaName: string | undefined = getCellString(row, columnMap, 'AREA')
      || getCellString(row, columnMap, 'AREA NAME')

    // Infer area from filename if not in row (similar to Assemblies Lists)
    if (!areaName) {
      areaName = inferAssembliesAreaName({ filename: fileName }) ?? undefined
    }

    const lineCode = getCellString(row, columnMap, 'LINE')
      || getCellString(row, columnMap, 'LINE CODE')
      || getCellString(row, columnMap, 'ASSEMBLY LINE')

    const stationCode = getCellString(row, columnMap, 'STATION')
      || getCellString(row, columnMap, 'STATION CODE')
      || getCellString(row, columnMap, 'CELL')

    const reuseStatus = getCellString(row, columnMap, 'REUSE')
      || getCellString(row, columnMap, 'REUSE STATUS')
      || getCellString(row, columnMap, 'STATUS')

    const comments = getCellString(row, columnMap, 'COMMENTS')
      || getCellString(row, columnMap, 'COMMENT')

    const notes = getCellString(row, columnMap, 'NOTES')
      || getCellString(row, columnMap, 'NOTE')

    const supply = getCellString(row, columnMap, 'SUPPLY')
    const refreshment = getCellString(row, columnMap, 'REFRESMENT OK')

    // Detect if tool is cancelled/inactive based on notes
    // Strikethrough tools in Excel have specific markers in the NOTES column
    const isActive = !isCancelledTool(notes)

    // Detect sourcing
    const sourcing = detectSourcing(reuseStatus, comments, supply, refreshment)

    // Detect mount type (default to UNKNOWN)
    const mountType: ToolMountType = 'UNKNOWN'

    // Detect Kind
    const kind = detectKind(toolType)

    // Build canonical IDs
    const canonicalStationId = buildStationId(areaName, stationCode)
    const canonicalToolId = buildToolId(canonicalStationId, toolId, equipmentNoShown)

    // Vacuum Parser: Collect all other columns into metadata
    const metadata: Record<string, string | number | boolean | null> = {}
    const consumedHeaders = [
      'GUN', 'GUN ID', 'GUN NUMBER', 'TOOL', 'TOOL ID', 'TOOL NAME', 'EQUIPMENT ID', 'EQUIPMENT', 'ID', 'NAME',
      'EQUIPMENT NO SHOWN', 'EQUIPMENT NO', // Add Equipment No to consumed headers
      'TYPE', 'TOOL TYPE', 'GUN TYPE', 'SUBTYPE',
      'MODEL', 'OEM MODEL', 'MANUFACTURER', 'SUPPLIER',
      'AREA', 'AREA NAME',
      'LINE', 'LINE CODE', 'ASSEMBLY LINE',
      'STATION', 'STATION CODE', 'CELL',
      'REUSE', 'REUSE STATUS', 'STATUS',
      'COMMENTS', 'COMMENT', 'NOTES', 'NOTE', 'SUPPLY', 'REFRESMENT OK'
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

    // Build tool entity
    const tool: Tool = {
      id: generateId('tool', toolId),
      kind,
      name: toolId,
      toolType,
      subType: toolType === 'SPOT_WELD' ? subType : undefined,
      oemModel: oemModel || undefined,
      mountType,
      areaName: areaName || undefined,
      lineCode: lineCode || undefined,
      stationCode: stationCode || undefined,
      stationNumber: stationCode || undefined, // Map to UnifiedAsset field
      stationId: canonicalStationId,
      toolId: canonicalToolId,
      reuseStatus: reuseStatus || undefined,
      sourcing,
      isActive, // Track if tool is active or cancelled (strikethrough in Excel)
      metadata: {
        ...metadata,
        // Store lineCode and notes in metadata for reference
        ...(lineCode ? { lineCode } : {}),
        ...(notes ? { notes } : {})
      },
      sourceFile: fileName,
      sheetName,
      rowIndex: i
    }

    tools.push(tool)
  }

  if (tools.length === 0) {
    warnings.push(createParserErrorWarning({
      fileName,
      sheetName,
      error: 'No valid tool rows found after parsing'
    }))
  }

  console.log(`[Tool List Parser] ${fileName} - Parsed ${tools.length} tools`)

  return {
    tools,
    warnings
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Detect tool type from filename
 */
function detectToolTypeFromFilename(fileName: string): ToolType {
  const lower = fileName.toLowerCase()

  if (lower.includes('wg') || lower.includes('weld') || lower.includes('gun')) {
    return 'SPOT_WELD'
  }

  if (lower.includes('sealer') || lower.includes('seal')) {
    return 'SEALER'
  }

  if (lower.includes('stud')) {
    return 'STUD_WELD'
  }

  if (lower.includes('gripper') || lower.includes('grip')) {
    return 'GRIPPER'
  }

  return 'OTHER'
}

/**
 * Detect tool type from type string or filename
 */
function detectToolType(typeStr: string, _fileName: string, defaultType: ToolType): ToolType {
  if (!typeStr) return defaultType

  const lower = typeStr.toLowerCase()

  // Check for explicit type strings
  if (lower.includes('weld') || lower.includes('gun')) return 'SPOT_WELD'
  if (lower.includes('sealer') || lower.includes('seal')) return 'SEALER'
  if (lower.includes('stud')) return 'STUD_WELD'
  if (lower.includes('gripper') || lower.includes('grip')) return 'GRIPPER'

  return defaultType
}

/**
 * Detect spot weld gun subtype (pneumatic vs servo)
 */
function detectSpotWeldSubType(typeStr: string, subtypeStr: string): SpotWeldSubType {
  const combined = `${typeStr} ${subtypeStr}`.toLowerCase()

  if (combined.includes('servo')) return 'SERVO'
  if (combined.includes('pneumatic') || combined.includes('pneu')) return 'PNEUMATIC'

  return 'UNKNOWN'
}

/**
 * Detect sourcing status from various columns
 */
function detectSourcing(
  reuseStatus: string,
  comments: string,
  supply: string,
  refreshment: string
): EquipmentSourcing {
  const combined = `${reuseStatus} ${comments} ${supply} ${refreshment}`.toLowerCase()

  if (combined.includes('carry over') || combined.includes('existing') || combined.includes('retain')) {
    return 'REUSE'
  }

  if (combined.includes('new') || combined.includes('new line') || combined.includes('new station')) {
    return 'NEW_BUY'
  }

  if (combined.includes('make') || combined.includes('in-house') || combined.includes('fabricate')) {
    return 'MAKE'
  }

  return 'UNKNOWN'
}

/**
 * Detect asset kind from tool type
 */
function detectKind(toolType: ToolType): AssetKind {
  switch (toolType) {
    case 'SPOT_WELD':
      return 'GUN'
    case 'SEALER':
    case 'STUD_WELD':
    case 'GRIPPER':
      return 'TOOL'
    default:
      return 'OTHER'
  }
}

/**
 * Detect if a tool is cancelled/inactive based on NOTES column
 *
 * Strikethrough tools in Excel have specific markers in NOTES:
 * - "REMOVED FROM BOM" - Tool explicitly removed
 * - "SIM TO SPEC" - Simulation-only tool (not manufactured)
 * - Possibly others that indicate historical/cancelled status
 *
 * These tools should be tracked for history but marked as inactive.
 */
function isCancelledTool(notes: string): boolean {
  if (!notes) return false

  const notesUpper = notes.toUpperCase().trim()

  // Patterns indicating cancelled/inactive tools
  const cancelPatterns = [
    'REMOVED FROM BOM',
    'SIM TO SPEC'
    // Note: "DESIGN AND MANUFACTURE" and "DESIGN ONLY" are NOT cancelled
    // They're valid tools, just happen to have strikethrough in some cases
  ]

  return cancelPatterns.some(pattern => notesUpper.includes(pattern))
}
