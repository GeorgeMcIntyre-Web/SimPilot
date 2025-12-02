/**
 * Reuse List Parser - TMS WELD GUNS
 *
 * Parses GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx - "Welding guns" sheet
 * Tracks TMS weld guns available for reuse across ZA projects
 *
 * Column Structure:
 * OLD Location:
 * - [1] Plant
 * - [2] Area
 * - [3] Zone/Subzone
 * - [4] Station
 *
 * Equipment Details:
 * - [5] Device Name
 * - [6] Application robot
 * - [7] Model
 * - [9] Supplier
 * - [11] Standard
 * - [12] Serial Number Complete WG
 *
 * NEW Allocation:
 * - [20] STLA/P1H/O1H/LPM
 * - [21] Sector
 * - [22] Line
 * - [23] Station3
 * - [24] Coment
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

interface TMSWGRawRow {
  // OLD location (where it came from)
  Plant: string | null
  Area: string | null
  ZoneSubzone: string | null
  Station: string | null

  // Equipment details
  DeviceName: string | null
  ApplicationRobot: string | null
  Model: string | null
  Supplier: string | null
  Standard: string | null
  SerialNumber: string | null

  // NEW allocation (where it's going)
  'STLA/P1H/O1H/LPM': string | null
  Sector: string | null
  Line: string | null
  Station3: string | null
  Coment: string | null
}

// ============================================================================
// COLUMN MAPPING
// ============================================================================

/**
 * Maps raw column names to normalized field names
 */
function normalizeColumnName(colName: string): string {
  const normalized = colName.trim().toLowerCase()

  if (normalized === 'plant') {
    return 'Plant'
  }

  if (normalized === 'area') {
    return 'Area'
  }

  if (normalized.includes('zone') && normalized.includes('subzone')) {
    return 'ZoneSubzone'
  }

  if (normalized === 'station') {
    return 'Station'
  }

  if (normalized === 'device name') {
    return 'DeviceName'
  }

  if (normalized === 'application robot') {
    return 'ApplicationRobot'
  }

  if (normalized === 'model') {
    return 'Model'
  }

  if (normalized === 'supplier') {
    return 'Supplier'
  }

  if (normalized === 'standard') {
    return 'Standard'
  }

  if (normalized.includes('serial number') && normalized.includes('complete')) {
    return 'SerialNumber'
  }

  // NEW allocation columns
  if (normalized.includes('stla') || normalized.includes('p1h') || normalized.includes('o1h') || normalized.includes('lpm')) {
    return 'STLA/P1H/O1H/LPM'
  }

  if (normalized === 'sector') {
    return 'Sector'
  }

  if (normalized === 'line') {
    return 'Line'
  }

  if (normalized === 'station3') {
    return 'Station3'
  }

  if (normalized === 'coment' || normalized === 'comment') {
    return 'Coment'
  }

  return colName
}

/**
 * Extracts typed row from raw Excel row
 */
function extractTMSWGRawRow(rawRow: Record<string, unknown>): TMSWGRawRow {
  const normalized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(rawRow)) {
    const normalizedKey = normalizeColumnName(key)
    normalized[normalizedKey] = value
  }

  return {
    Plant: String(normalized.Plant ?? '').trim() || null,
    Area: String(normalized.Area ?? '').trim() || null,
    ZoneSubzone: String(normalized.ZoneSubzone ?? '').trim() || null,
    Station: String(normalized.Station ?? '').trim() || null,
    DeviceName: String(normalized.DeviceName ?? '').trim() || null,
    ApplicationRobot: String(normalized.ApplicationRobot ?? '').trim() || null,
    Model: String(normalized.Model ?? '').trim() || null,
    Supplier: String(normalized.Supplier ?? '').trim() || null,
    Standard: String(normalized.Standard ?? '').trim() || null,
    SerialNumber: String(normalized.SerialNumber ?? '').trim() || null,
    'STLA/P1H/O1H/LPM': String(normalized['STLA/P1H/O1H/LPM'] ?? '').trim() || null,
    Sector: String(normalized.Sector ?? '').trim() || null,
    Line: String(normalized.Line ?? '').trim() || null,
    Station3: String(normalized.Station3 ?? '').trim() || null,
    Coment: String(normalized.Coment ?? '').trim() || null
  }
}

// ============================================================================
// ROW VALIDATION
// ============================================================================

/**
 * Checks if row is effectively empty (no meaningful data)
 */
function isEffectivelyEmptyRow(row: TMSWGRawRow): boolean {
  // Must have at minimum: device name or serial number
  if (row.DeviceName === null || row.DeviceName === undefined) {
    if (row.SerialNumber === null || row.SerialNumber === undefined) {
      return true
    }
  }

  const hasCoreData = (
    (row.DeviceName !== null && row.DeviceName.length > 0) ||
    (row.SerialNumber !== null && row.SerialNumber.length > 0)
  )

  return !hasCoreData
}

// ============================================================================
// PARSING LOGIC
// ============================================================================

/**
 * Parses a single TMS weld gun row into ParsedAssetRow
 */
function parseTMSWGRow(
  rawRow: TMSWGRawRow,
  rowIndex: number,
  workbookConfig: WorkbookConfig,
  sheetName: string,
  fileName: string
): ParsedAssetRow | null {
  // Skip empty rows
  if (isEffectivelyEmptyRow(rawRow)) {
    return null
  }

  // Build asset name from device name and serial
  const deviceName = rawRow.DeviceName ?? 'UNKNOWN_GUN'
  const serialNum = rawRow.SerialNumber !== null ? ` (${rawRow.SerialNumber})` : ''
  const assetName = `${deviceName}${serialNum}`

  // Infer allocation status
  const allocationStatus: ReuseAllocationStatus = inferReuseAllocation({
    targetProject: rawRow['STLA/P1H/O1H/LPM'],
    targetLine: rawRow.Line,
    targetStation: rawRow.Station3,
    targetSector: rawRow.Sector,
    isInSimulationStatus: false
  })

  // Build tags for future filtering
  const tags: string[] = []

  if (rawRow.Standard !== null) {
    tags.push(`Standard:${rawRow.Standard}`)
  }

  if (rawRow.Model !== null) {
    tags.push(`Model:${rawRow.Model}`)
  }

  if (rawRow.Supplier !== null) {
    tags.push(`Supplier:${rawRow.Supplier}`)
  }

  if (rawRow.ApplicationRobot !== null) {
    tags.push(`Robot:${rawRow.ApplicationRobot}`)
  }

  tags.push('REUSE_LIST')
  tags.push('TMS_GUN')

  // Build ParsedAssetRow
  const parsed: ParsedAssetRow = {
    name: assetName,
    detailedKind: 'TMSGun',
    sourcing: 'REUSE',

    // OLD location (where it came from)
    oldProject: rawRow.Plant,
    oldArea: rawRow.Area,
    oldLine: rawRow.ZoneSubzone,
    oldStation: rawRow.Station,

    // NEW allocation (where it's going)
    targetProject: rawRow['STLA/P1H/O1H/LPM'],
    targetSector: rawRow.Sector,
    targetLine: rawRow.Line,
    targetStation: rawRow.Station3,

    // Allocation status
    reuseAllocationStatus: allocationStatus,

    // Provenance
    sourceWorkbookId: workbookConfig.workbookId,
    sourceFile: fileName,
    sourceSheetName: sheetName,
    sourceRowIndex: rowIndex,

    // Metadata
    partNumber: rawRow.SerialNumber,
    robotNumber: rawRow.ApplicationRobot,
    notes: rawRow.Coment,
    rawTags: tags,

    // Store raw data for future parsing
    rawLocation: `${rawRow.Plant ?? ''}/${rawRow.Area ?? ''}/${rawRow.ZoneSubzone ?? ''}`
  }

  return parsed
}

/**
 * Main entry point: parse entire Welding guns sheet
 */
export function parseReuseListTMSWG(
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

    const wgRow = extractTMSWGRawRow(rawRow)
    const parsed = parseTMSWGRow(wgRow, i, workbookConfig, sheetName, fileName)

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
export function tmswgParsedRowToAsset(
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
    kind: 'GUN',
    detailedKind: 'TMSGun',
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
      serialNumber: parsed.partNumber ?? null,
      associatedRobot: parsed.robotNumber ?? null,
      originalLocation: parsed.rawLocation ?? null
    },

    // Fields from UnifiedAsset
    type: 'TMSGun',
    lastUpdated: new Date().toISOString()
  }

  return asset
}
