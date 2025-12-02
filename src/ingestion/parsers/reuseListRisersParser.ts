/**
 * Reuse List Parser - RISERS
 *
 * Parses GLOBAL_ZA_REUSE_LIST_RISERS.xlsx
 * Tracks robot risers available for reuse across ZA projects
 *
 * Column Structure:
 * - OLD Location: Proyect, Area, Location
 * - Equipment: Brand (part number), Height (type), Standard, Type
 * - NEW Allocation: Project STLA/P1H/O1H/LPM, New Line, New station
 * - Notes: Coments
 */

import type {
  ExcelIngestedAsset,
  ParsedAssetRow,
  WorkbookConfig,
  ReuseAllocationStatus
} from '../excelIngestionTypes'
import {
  inferReuseAllocation,
  buildAssetKey
} from '../excelIngestionTypes'

// ============================================================================
// TYPES
// ============================================================================

interface RiserRawRow {
  // OLD location (where it came from)
  Proyect: string | null
  Area: string | null
  Location: string | null

  // Equipment details
  Brand: string | null        // Part number (e.g., Ka000292S)
  Height: string | null       // Riser type (e.g., Baseplate)
  Standard: string | null     // OV, Standard, etc.
  Type: string | null

  // NEW allocation (where it's going)
  'Project\r\nSTLA/P1H/O1H/LPM': string | null
  'New Line': string | null
  'New station': string | null
  Coments: string | null
}

// ============================================================================
// COLUMN MAPPING
// ============================================================================

/**
 * Maps raw column names to normalized field names
 */
function normalizeColumnName(colName: string): string {
  const normalized = colName.trim().toLowerCase()

  if (normalized === 'proyect') {
    return 'Proyect'
  }

  if (normalized === 'area') {
    return 'Area'
  }

  if (normalized === 'location') {
    return 'Location'
  }

  if (normalized === 'brand') {
    return 'Brand'
  }

  if (normalized === 'height') {
    return 'Height'
  }

  if (normalized === 'standard') {
    return 'Standard'
  }

  if (normalized === 'type') {
    return 'Type'
  }

  // Handle multiline column header
  if (normalized.includes('project') && (normalized.includes('stla') || normalized.includes('p1h'))) {
    return 'Project\r\nSTLA/P1H/O1H/LPM'
  }

  if (normalized === 'new line') {
    return 'New Line'
  }

  if (normalized === 'new station') {
    return 'New station'
  }

  if (normalized === 'coments' || normalized === 'comments') {
    return 'Coments'
  }

  return colName
}

/**
 * Extracts typed row from raw Excel row
 */
function extractRiserRawRow(rawRow: Record<string, unknown>): RiserRawRow {
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(rawRow)) {
    const normalizedKey = normalizeColumnName(key)
    normalized[normalizedKey] = value
  }

  return {
    Proyect: String(normalized.Proyect ?? '').trim() || null,
    Area: String(normalized.Area ?? '').trim() || null,
    Location: String(normalized.Location ?? '').trim() || null,
    Brand: String(normalized.Brand ?? '').trim() || null,
    Height: String(normalized.Height ?? '').trim() || null,
    Standard: String(normalized.Standard ?? '').trim() || null,
    Type: String(normalized.Type ?? '').trim() || null,
    'Project\r\nSTLA/P1H/O1H/LPM': String(normalized['Project\r\nSTLA/P1H/O1H/LPM'] ?? '').trim() || null,
    'New Line': String(normalized['New Line'] ?? '').trim() || null,
    'New station': String(normalized['New station'] ?? '').trim() || null,
    Coments: String(normalized.Coments ?? '').trim() || null
  }
}

// ============================================================================
// ROW VALIDATION
// ============================================================================

/**
 * Checks if row is effectively empty (no meaningful data)
 */
function isEffectivelyEmptyRow(row: RiserRawRow): boolean {
  // Must have at minimum: old project and equipment brand
  if (row.Proyect === null || row.Proyect === undefined) {
    return true
  }

  if (row.Brand === null || row.Brand === undefined) {
    return true
  }

  const hasCoreData = (
    row.Proyect.length > 0 &&
    row.Brand.length > 0
  )

  return !hasCoreData
}

// ============================================================================
// PARSING LOGIC
// ============================================================================

/**
 * Parses a single riser row into ParsedAssetRow
 */
function parseRiserRow(
  rawRow: RiserRawRow,
  rowIndex: number,
  workbookConfig: WorkbookConfig,
  sheetName: string,
  fileName: string
): ParsedAssetRow | null {
  // Skip empty rows
  if (isEffectivelyEmptyRow(rawRow)) {
    return null
  }

  // Build asset name from part number and type
  const partNumber = rawRow.Brand ?? 'UNKNOWN_RISER'
  const riserType = rawRow.Height ?? null
  const assetName = riserType !== null
    ? `${partNumber} - ${riserType}`
    : partNumber

  // Infer allocation status
  const allocationStatus: ReuseAllocationStatus = inferReuseAllocation({
    targetProject: rawRow['Project\r\nSTLA/P1H/O1H/LPM'],
    targetLine: rawRow['New Line'],
    targetStation: rawRow['New station'],
    isInSimulationStatus: false
  })

  // Build tags for future filtering
  const tags: string[] = []

  if (rawRow.Standard !== null) {
    tags.push(`Standard:${rawRow.Standard}`)
  }

  if (rawRow.Type !== null) {
    tags.push(`Type:${rawRow.Type}`)
  }

  tags.push('REUSE_LIST')
  tags.push('RISER')

  // Build ParsedAssetRow
  const parsed: ParsedAssetRow = {
    name: assetName,
    detailedKind: 'Riser',
    sourcing: 'REUSE',

    // OLD location (where it came from)
    oldProject: rawRow.Proyect,
    oldArea: rawRow.Area,
    oldLine: null,  // Location field contains full path, not parsed yet
    oldStation: null,

    // NEW allocation (where it's going)
    targetProject: rawRow['Project\r\nSTLA/P1H/O1H/LPM'],
    targetLine: rawRow['New Line'],
    targetStation: rawRow['New station'],
    targetSector: null,

    // Allocation status
    reuseAllocationStatus: allocationStatus,

    // Provenance
    sourceWorkbookId: workbookConfig.workbookId,
    sourceFile: fileName,
    sourceSheetName: sheetName,
    sourceRowIndex: rowIndex,

    // Metadata
    partNumber: rawRow.Brand,
    notes: rawRow.Coments,
    rawTags: tags,

    // Store raw location for future parsing
    rawLocation: rawRow.Location
  }

  return parsed
}

/**
 * Main entry point: parse entire RISERS sheet
 */
export function parseReuseListRisers(
  rawRows: Record<string, unknown>[],
  workbookConfig: WorkbookConfig,
  sheetName: string,
  fileName: string
): ParsedAssetRow[] {
  const results: ParsedAssetRow[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i]

    if (rawRow === null || rawRow === undefined) {
      continue
    }

    const riserRow = extractRiserRawRow(rawRow)
    const parsed = parseRiserRow(riserRow, i, workbookConfig, sheetName, fileName)

    if (parsed !== null) {
      results.push(parsed)
    }
  }

  return results
}

// ============================================================================
// PARSED ROW → ASSET CONVERSION
// ============================================================================

/**
 * Converts ParsedAssetRow to ExcelIngestedAsset
 */
export function riserParsedRowToAsset(
  parsed: ParsedAssetRow,
  workbookConfig: WorkbookConfig
): ExcelIngestedAsset {
  // Build asset key
  const assetKey = buildAssetKey({
    name: parsed.name,
    location: parsed.targetLine ?? parsed.oldProject ?? 'POOL',
    station: parsed.targetStation ?? 'REUSE_POOL'
  })

  const asset: ExcelIngestedAsset = {
    id: assetKey,
    name: parsed.name,
    kind: 'TOOL',
    detailedKind: 'Riser',
    sourcing: 'REUSE',

    // Allocation tracking
    reuseAllocationStatus: parsed.reuseAllocationStatus,

    // OLD location
    oldProject: parsed.oldProject,
    oldArea: parsed.oldArea,
    oldLine: parsed.oldLine,
    oldStation: parsed.oldStation,

    // NEW allocation
    targetProject: parsed.targetProject,
    targetLine: parsed.targetLine,
    targetStation: parsed.targetStation,
    targetSector: parsed.targetSector,

    // Simulation context
    simulationSourceKind: workbookConfig.simulationSourceKind,
    siteLocation: workbookConfig.defaultSiteLocation,

    // Hierarchy (minimal for reuse pool equipment)
    areaId: parsed.oldArea ?? 'UNKNOWN',
    areaName: parsed.oldArea !== null && parsed.oldArea !== undefined ? parsed.oldArea : undefined,
    cellId: null,
    projectCode: parsed.targetProject ?? parsed.oldProject ?? undefined,

    // Location
    assemblyLine: parsed.targetLine !== null && parsed.targetLine !== undefined ? parsed.targetLine : null,
    station: parsed.targetStation !== null && parsed.targetStation !== undefined ? parsed.targetStation : null,

    // Provenance
    primaryWorkbookId: workbookConfig.workbookId,
    sourceWorkbookIds: [workbookConfig.workbookId],
    sourceSheetNames: [parsed.sourceSheetName],
    rawRowIds: [`${parsed.sourceFile}:${parsed.sourceSheetName}:${parsed.sourceRowIndex}`],

    sourceFile: parsed.sourceFile,
    sheetName: parsed.sourceSheetName,
    rowIndex: parsed.sourceRowIndex,

    // Metadata
    referenceNumber: parsed.partNumber !== null && parsed.partNumber !== undefined ? parsed.partNumber : undefined,
    notes: parsed.notes !== null && parsed.notes !== undefined ? parsed.notes : undefined,
    rawTags: parsed.rawTags,
    metadata: {
      partNumber: parsed.partNumber ?? null,
      riserType: parsed.rawLocation ?? null
    },

    // Fields from UnifiedAsset
    type: 'Riser',
    lastUpdated: new Date().toISOString()
  }

  return asset
}
