/**
 * TOOLING LIST PARSER
 *
 * Parses TOOL_LIST workbooks containing tooling items with design/sim/mfg stage data.
 * Supports flexible column mapping for different workbook formats.
 *
 * Expected column patterns (case-insensitive, flexible matching):
 * - Tooling Number / Tool ID
 * - Equipment Number / Equip #
 * - Description
 * - Program
 * - Plant
 * - Unit
 * - Line
 * - Station
 * - Area
 * - Supplier
 * - Handedness (LH/RH/PAIR/NA)
 * - Design Status / Design % Complete
 * - Simulation Status / Sim % Complete
 * - Manufacture Status / Mfg % Complete
 */

import * as XLSX from 'xlsx'
import { readWorkbookFile } from '../../excel/reader'
import type { ToolingItem, ToolingLocation } from '../../domain/toolingTypes'

// ============================================================================
// TYPES
// ============================================================================

export interface ToolingListParseResult {
  items: ToolingItem[]
  warnings: string[]
  workbookName: string
}

interface RawRow {
  'Tooling Number'?: string | null
  'Equipment Number'?: string | null
  Description?: string | null
  Program?: string | null
  Plant?: string | null
  Unit?: string | null
  Line?: string | null
  Station?: string | null
  Area?: string | null
  Supplier?: string | null
  Handedness?: string | null
  Owner?: string | null
  [key: string]: string | number | boolean | null | undefined
}

// ============================================================================
// PARSER ENTRY POINT
// ============================================================================

/**
 * Parse a Tool List workbook from file path
 */
export async function parseToolListWorkbook(filePath: string): Promise<ToolingListParseResult> {
  const warnings: string[] = []

  // Guard: validate file path
  if (filePath.trim().length === 0) {
    throw new Error('File path cannot be empty')
  }

  try {
    const workbook = readWorkbookFile(filePath, { cellDates: true })
    const workbookName = filePath.split(/[/\\]/).pop() ?? 'Unknown'

    // Try to find the tooling sheet (common names: "Tooling", "Tools", "Tool List", "Sheet1")
    const sheetName = findToolingSheet(workbook)

    if (sheetName === null) {
      warnings.push(`No tooling sheet found in workbook: ${workbookName}`)
      return { items: [], warnings, workbookName }
    }

    const worksheet = workbook.Sheets[sheetName]
    if (worksheet === undefined) {
      warnings.push(`Sheet "${sheetName}" not found in workbook`)
      return { items: [], warnings, workbookName }
    }

    // Convert to JSON rows
    const rawRows: unknown[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
    })

    // Parse each row
    const items: ToolingItem[] = []

    for (let i = 0; i < rawRows.length; i++) {
      const rawRow = rawRows[i]

      if (typeof rawRow !== 'object' || rawRow === null) {
        warnings.push(`Row ${i + 2}: Invalid row data, skipping`)
        continue
      }

      const normalized = normalizeRow(rawRow as Record<string, unknown>)
      const parseResult = parseToolingRow(normalized, i + 2)

      if (parseResult.item !== null) {
        items.push(parseResult.item)
      }

      if (parseResult.warnings.length > 0) {
        warnings.push(...parseResult.warnings)
      }
    }

    return { items, warnings, workbookName }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to parse tooling workbook: ${message}`)
  }
}

// ============================================================================
// SHEET DETECTION
// ============================================================================

/**
 * Find the sheet containing tooling data
 */
function findToolingSheet(workbook: XLSX.WorkBook): string | null {
  const sheetNames = workbook.SheetNames

  // Priority list of common tooling sheet names
  const candidates = ['tooling', 'tools', 'tool list', 'tool_list', 'toollist', 'sheet1']

  for (const candidate of candidates) {
    const match = sheetNames.find((name) => name.toLowerCase().trim() === candidate)
    if (match !== undefined) {
      return match
    }
  }

  // Fallback: use first sheet
  if (sheetNames.length > 0) {
    return sheetNames[0]
  }

  return null
}

// ============================================================================
// ROW NORMALIZATION
// ============================================================================

/**
 * Normalize column names to standard format
 */
function normalizeRow(raw: Record<string, unknown>): RawRow {
  const normalized: RawRow = {}

  for (const [key, value] of Object.entries(raw)) {
    const normalizedKey = normalizeColumnName(key)
    if (normalizedKey !== null) {
      normalized[normalizedKey] =
        value === null || value === undefined ? null : String(value).trim()
    }
  }

  return normalized
}

/**
 * Map raw column names to normalized field names
 */
function normalizeColumnName(colName: string): string | null {
  const lower = colName.trim().toLowerCase()

  // Tooling Number
  if (
    lower === 'tooling number' ||
    lower === 'tool number' ||
    lower === 'tool id' ||
    lower === 'tooling id'
  ) {
    return 'Tooling Number'
  }

  // Equipment Number
  if (
    lower === 'equipment number' ||
    lower === 'equip number' ||
    lower === 'equip #' ||
    lower === 'equipment #'
  ) {
    return 'Equipment Number'
  }

  // Description
  if (lower === 'description' || lower === 'desc' || lower === 'tool description') {
    return 'Description'
  }

  // Location fields
  if (lower === 'program') {
    return 'Program'
  }
  if (lower === 'plant') {
    return 'Plant'
  }
  if (lower === 'unit') {
    return 'Unit'
  }
  if (lower === 'line') {
    return 'Line'
  }
  if (lower === 'station') {
    return 'Station'
  }
  if (lower === 'area') {
    return 'Area'
  }

  // Supplier
  if (lower === 'supplier' || lower === 'vendor') {
    return 'Supplier'
  }

  // Handedness
  if (lower === 'handedness' || lower === 'hand' || lower === 'side') {
    return 'Handedness'
  }

  // Owner
  if (lower === 'owner' || lower === 'responsible') {
    return 'Owner'
  }

  // Unknown column - preserve as-is for metadata
  return colName.trim()
}

// ============================================================================
// ROW PARSING
// ============================================================================

interface ParseRowResult {
  item: ToolingItem | null
  warnings: string[]
}

/**
 * Parse a normalized row into a ToolingItem
 */
function parseToolingRow(row: RawRow, rowNumber: number): ParseRowResult {
  const warnings: string[] = []

  // Guard: require tooling number
  const toolingNumber = row['Tooling Number']
  if (toolingNumber === null || toolingNumber === undefined || toolingNumber.trim().length === 0) {
    warnings.push(`Row ${rowNumber}: Missing tooling number, skipping`)
    return { item: null, warnings }
  }

  // Guard: require minimum location data (program, station)
  const program = row.Program ?? 'UNKNOWN'
  const station = row.Station ?? 'UNKNOWN'

  if (program === 'UNKNOWN' || station === 'UNKNOWN') {
    warnings.push(`Row ${rowNumber}: Missing program or station for ${toolingNumber}`)
  }

  // Build location
  const location: ToolingLocation = {
    program: program ?? 'UNKNOWN',
    plant: row.Plant ?? 'UNKNOWN',
    unit: row.Unit ?? 'UNKNOWN',
    line: row.Line ?? 'UNKNOWN',
    station: station ?? 'UNKNOWN',
    area: row.Area ?? 'UNKNOWN',
  }

  // Parse handedness
  const handedness = parseHandedness(row.Handedness)

  // Build metadata from remaining fields
  const metadata: Record<string, string | number | boolean | null | undefined> = {}
  for (const [key, value] of Object.entries(row)) {
    if (isStandardField(key) === false) {
      metadata[key] = value
    }
  }

  // Build ToolingItem
  const item: ToolingItem = {
    toolingId: generateToolingId(toolingNumber, location),
    toolingNumber: toolingNumber.trim(),
    equipmentNumber: row['Equipment Number'] ?? undefined,
    handedness,
    location,
    description: row.Description ?? undefined,
    supplier: row.Supplier ?? undefined,
    owner: row.Owner ?? undefined,
    metadata,
  }

  return { item, warnings }
}

/**
 * Generate unique tooling ID from number and location
 */
function generateToolingId(toolingNumber: string, location: ToolingLocation): string {
  return `${location.program}|${location.station}|${toolingNumber}`
}

/**
 * Parse handedness field
 */
function parseHandedness(
  value: string | null | undefined,
): 'LH' | 'RH' | 'PAIR' | 'NA' | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  const upper = value.trim().toUpperCase()

  if (upper === 'LH' || upper === 'LEFT') {
    return 'LH'
  }
  if (upper === 'RH' || upper === 'RIGHT') {
    return 'RH'
  }
  if (upper === 'PAIR' || upper === 'BOTH') {
    return 'PAIR'
  }
  if (upper === 'NA' || upper === 'N/A' || upper === 'NONE') {
    return 'NA'
  }

  return undefined
}

/**
 * Check if a field name is a standard field (not metadata)
 */
function isStandardField(fieldName: string): boolean {
  const standardFields = [
    'Tooling Number',
    'Equipment Number',
    'Description',
    'Program',
    'Plant',
    'Unit',
    'Line',
    'Station',
    'Area',
    'Supplier',
    'Handedness',
    'Owner',
  ]

  return standardFields.includes(fieldName)
}
