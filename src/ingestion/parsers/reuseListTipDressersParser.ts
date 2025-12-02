/**
 * Reuse List Parser - TIP DRESSERS
 *
 * Parses GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx
 * Tracks tip dressers available for reuse across ZA projects
 *
 * Column Structure (sparse headers, using positional indices):
 * - [0] ID/Number
 * - [1] Plant (OLD)
 * - [2] Area (OLD)
 * - [3] Project (OLD)
 * - [4] Zone/Subzone (OLD)
 * - [5] ROBOT (associated robot)
 * - [6] Standard
 * - [9] WELDING GUNS
 * - [10] TIP DRESSER (equipment ID)
 * - [23] Project STLA/P1H/O1H/LPM (NEW)
 * - [24] New Sector (NEW)
 * - [25] New Line (NEW)
 * - [26] New station (NEW)
 * - [27] Robot Standard (Confirm)
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

interface TipDresserRawRow {
  // Positional columns (sparse header)
  ID?: number | string | null
  Plant?: string | null
  Area?: string | null
  Project?: string | null
  ZoneSubzone?: string | null
  Robot?: string | null
  Standard?: string | null
  WeldingGuns?: string | null
  TipDresser?: string | null

  // NEW allocation columns (named headers)
  'Project\r\nSTLA/P1H/O1H/LPM': string | null
  'New Sector': string | null
  'New Line': string | null
  'New station': string | null
  'Robot Standard (Confirm)': string | null
}

// ============================================================================
// COLUMN MAPPING
// ============================================================================

/**
 * Extracts typed row from raw Excel row
 * Uses positional indices for sparse columns
 */
function extractTipDresserRawRow(rawRow: Record<string, unknown>): TipDresserRawRow {
  // Get positional columns by index
  const rowArray = Object.values(rawRow)

  // Helper to safely get column value
  const getCol = (index: number): string | null => {
    const val = rowArray[index]
    if (val === null || val === undefined) {
      return null
    }
    const str = String(val).trim()
    return str.length > 0 ? str : null
  }

  // Extract named columns from header matches
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rawRow)) {
    const keyLower = key.trim().toLowerCase()

    if (keyLower.includes('project') && (keyLower.includes('stla') || keyLower.includes('p1h'))) {
      normalized['Project\r\nSTLA/P1H/O1H/LPM'] = value
    }

    if (keyLower === 'new sector') {
      normalized['New Sector'] = value
    }

    if (keyLower === 'new line') {
      normalized['New Line'] = value
    }

    if (keyLower === 'new station') {
      normalized['New station'] = value
    }

    if (keyLower.includes('robot standard') && keyLower.includes('confirm')) {
      normalized['Robot Standard (Confirm)'] = value
    }
  }

  return {
    ID: rowArray[0] !== null && rowArray[0] !== undefined ? String(rowArray[0]) : null,
    Plant: getCol(1),
    Area: getCol(2),
    Project: getCol(3),
    ZoneSubzone: getCol(4),
    Robot: getCol(5),
    Standard: getCol(6),
    WeldingGuns: getCol(9),
    TipDresser: getCol(10),
    'Project\r\nSTLA/P1H/O1H/LPM': String(normalized['Project\r\nSTLA/P1H/O1H/LPM'] ?? '').trim() || null,
    'New Sector': String(normalized['New Sector'] ?? '').trim() || null,
    'New Line': String(normalized['New Line'] ?? '').trim() || null,
    'New station': String(normalized['New station'] ?? '').trim() || null,
    'Robot Standard (Confirm)': String(normalized['Robot Standard (Confirm)'] ?? '').trim() || null
  }
}

// ============================================================================
// ROW VALIDATION
// ============================================================================

/**
 * Checks if row is effectively empty (no meaningful data)
 */
function isEffectivelyEmptyRow(row: TipDresserRawRow): boolean {
  // Must have at minimum: tip dresser ID
  if (row.TipDresser === null || row.TipDresser === undefined) {
    return true
  }

  const hasCoreData = row.TipDresser.length > 0

  return !hasCoreData
}

// ============================================================================
// PARSING LOGIC
// ============================================================================

/**
 * Parses a single tip dresser row into ParsedAssetRow
 */
function parseTipDresserRow(
  rawRow: TipDresserRawRow,
  rowIndex: number,
  workbookConfig: WorkbookConfig,
  sheetName: string,
  fileName: string
): ParsedAssetRow | null {
  // Skip empty rows
  if (isEffectivelyEmptyRow(rawRow)) {
    return null
  }

  // Build asset name from tip dresser ID
  const tipDresserID = rawRow.TipDresser ?? 'UNKNOWN_TIPDRESSER'
  const assetName = `TD-${tipDresserID}`

  // Infer allocation status
  const allocationStatus: ReuseAllocationStatus = inferReuseAllocation({
    targetProject: rawRow['Project\r\nSTLA/P1H/O1H/LPM'],
    targetLine: rawRow['New Line'],
    targetStation: rawRow['New station'],
    targetSector: rawRow['New Sector'],
    isInSimulationStatus: false
  })

  // Build tags for future filtering
  const tags: string[] = []

  if (rawRow.Standard !== null) {
    tags.push(`Standard:${rawRow.Standard}`)
  }

  if (rawRow.Robot !== null) {
    tags.push(`Robot:${rawRow.Robot}`)
  }

  if (rawRow.WeldingGuns !== null) {
    tags.push(`Guns:${rawRow.WeldingGuns}`)
  }

  tags.push('REUSE_LIST')
  tags.push('TIP_DRESSER')

  // Build ParsedAssetRow
  const parsed: ParsedAssetRow = {
    name: assetName,
    detailedKind: 'TipDresser',
    sourcing: 'REUSE',

    // OLD location (where it came from)
    oldProject: rawRow.Project,
    oldArea: rawRow.Area,
    oldLine: null,
    oldStation: null,

    // NEW allocation (where it's going)
    targetProject: rawRow['Project\r\nSTLA/P1H/O1H/LPM'],
    targetSector: rawRow['New Sector'],
    targetLine: rawRow['New Line'],
    targetStation: rawRow['New station'],

    // Allocation status
    reuseAllocationStatus: allocationStatus,

    // Provenance
    sourceWorkbookId: workbookConfig.workbookId,
    sourceFile: fileName,
    sourceSheetName: sheetName,
    sourceRowIndex: rowIndex,

    // Metadata
    partNumber: rawRow.TipDresser,
    robotNumber: rawRow.Robot,
    notes: rawRow['Robot Standard (Confirm)'],
    rawTags: tags,

    // Store raw data for future parsing
    rawLocation: `${rawRow.Plant ?? ''}/${rawRow.ZoneSubzone ?? ''}`
  }

  return parsed
}

/**
 * Main entry point: parse entire TIP DRESSER sheet
 */
export function parseReuseListTipDressers(
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

    const tipDresserRow = extractTipDresserRawRow(rawRow)
    const parsed = parseTipDresserRow(tipDresserRow, i, workbookConfig, sheetName, fileName)

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
export function tipDresserParsedRowToAsset(
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
    detailedKind: 'TipDresser',
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
    targetSector: parsed.targetSector,
    targetLine: parsed.targetLine,
    targetStation: parsed.targetStation,

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

    // Robot association
    robotNumber: parsed.robotNumber !== null && parsed.robotNumber !== undefined ? parsed.robotNumber : null,

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
      tipDresserID: parsed.partNumber ?? null,
      associatedRobot: parsed.robotNumber ?? null,
      originalLocation: parsed.rawLocation ?? null
    },

    // Fields from UnifiedAsset
    type: 'TipDresser',
    lastUpdated: new Date().toISOString()
  }

  return asset
}
