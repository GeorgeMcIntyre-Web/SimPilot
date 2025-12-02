// Excel Ingestion Types
// Type definitions that align with and extend the existing UnifiedAsset model
// Handles the full lifecycle: raw Excel rows → parsed domain objects → unified assets

import { UnifiedAsset, AssetKind, EquipmentSourcing } from '../domain/UnifiedModel'

// ============================================================================
// SIMULATION SOURCE & LOCATION
// ============================================================================

/**
 * Classification of simulation work ownership
 */
export type SimulationSourceKind =
  | 'InternalSimulation'   // Work done by internal team (Durban/PE)
  | 'OutsourceSimulation'  // Work done by DesignOS

/**
 * Physical site location
 */
export type SiteLocation =
  | 'Durban'
  | 'PortElizabeth'
  | 'Unknown'

// ============================================================================
// DETAILED ASSET CLASSIFICATION
// ============================================================================

/**
 * Detailed asset kind for Excel-level semantics.
 * Maps to existing AssetKind for compatibility:
 * - Robot → ROBOT
 * - WeldGun, TMSGun → GUN
 * - Gripper, Fixture, Riser, TipDresser, Measurement → TOOL
 * - Other → OTHER
 */
export type DetailedAssetKind =
  | 'Robot'
  | 'WeldGun'
  | 'Gripper'
  | 'Fixture'
  | 'Riser'
  | 'TipDresser'
  | 'TMSGun'
  | 'Measurement'
  | 'Other'

/**
 * Map DetailedAssetKind to existing AssetKind
 */
export function mapDetailedKindToAssetKind(detailedKind: DetailedAssetKind): AssetKind {
  switch (detailedKind) {
    case 'Robot':
      return 'ROBOT'
    case 'WeldGun':
    case 'TMSGun':
      return 'GUN'
    case 'Gripper':
    case 'Fixture':
    case 'Riser':
    case 'TipDresser':
    case 'Measurement':
      return 'TOOL'
    case 'Other':
      return 'OTHER'
  }
}

/**
 * Infer DetailedAssetKind from application code and context
 */
export function inferDetailedKind(input: {
  applicationCode?: string | null
  sheetCategory?: string | null
  assetName?: string | null
}): DetailedAssetKind {
  const app = (input.applicationCode ?? '').toUpperCase().trim()
  const sheet = (input.sheetCategory ?? '').toUpperCase().trim()
  const name = (input.assetName ?? '').toLowerCase().trim()

  // Sheet-based classification (highest priority)
  if (sheet.includes('RISER') || sheet.includes('RAISER')) {
    return 'Riser'
  }

  if (sheet.includes('TIP') && sheet.includes('DRESS')) {
    return 'TipDresser'
  }

  if (sheet.includes('TMS') && sheet.includes('WG')) {
    return 'TMSGun'
  }

  if (sheet.includes('WELD') && sheet.includes('GUN')) {
    return 'WeldGun'
  }

  // Application code classification
  if (app.includes('SW') || app.includes('SPOT') || app.includes('WELD')) {
    return 'WeldGun'
  }

  if (app.includes('MH') || app.includes('MATERIAL')) {
    return 'Gripper'
  }

  if (app.includes('IM') || app.includes('INSPECTION') || app.includes('MEASURE')) {
    return 'Measurement'
  }

  // Name-based hints
  if (name.includes('gun')) {
    return 'WeldGun'
  }

  if (name.includes('grip')) {
    return 'Gripper'
  }

  if (name.includes('riser') || name.includes('raiser')) {
    return 'Riser'
  }

  if (name.includes('fixture') || name.includes('jig')) {
    return 'Fixture'
  }

  if (name.includes('robot')) {
    return 'Robot'
  }

  return 'Other'
}

// ============================================================================
// SOURCING CLASSIFICATION
// ============================================================================

/**
 * Infer EquipmentSourcing from various signals.
 * Aligns with existing EquipmentSourcing type from UnifiedModel.
 *
 * Priority:
 * 1. Explicit "FREE ISSUE" markers → REUSE (free issue means reused from another project)
 * 2. Present in reuse list → REUSE
 * 3. Explicit "NEW" markers → NEW_BUY
 * 4. Explicit "MAKE" markers → MAKE
 * 5. Default → UNKNOWN
 */
export function inferSourcing(input: {
  isOnReuseList: boolean
  cellText?: string | null
  rawTags: string[]
  lifecycleHint?: string | null
}): EquipmentSourcing {
  const allText = [
    input.cellText ?? '',
    input.lifecycleHint ?? '',
    ...input.rawTags
  ].join(' ').toLowerCase()

  // Explicit free issue → REUSE
  if (allText.includes('free issue') || allText.includes('free-issue') || allText.includes('fi')) {
    return 'REUSE'
  }

  // On reuse list → REUSE
  if (input.isOnReuseList) {
    return 'REUSE'
  }

  // Explicit new → NEW_BUY
  if (allText.includes(' new ') || allText.startsWith('new ') || allText.endsWith(' new')) {
    return 'NEW_BUY'
  }

  // Explicit make/custom → MAKE
  if (allText.includes('make') || allText.includes('custom') || allText.includes('fabricate')) {
    return 'MAKE'
  }

  // Explicit reuse hints
  if (allText.includes('reuse') || allText.includes('re-use') || allText.includes('carry over')) {
    return 'REUSE'
  }

  return 'UNKNOWN'
}

// ============================================================================
// REUSE ALLOCATION TRACKING
// ============================================================================

/**
 * Allocation status for equipment in reuse pool.
 *
 * Business Context:
 * - Reuse lists track equipment AVAILABLE for allocation (equipment pool)
 * - Equipment moves from: AVAILABLE → ALLOCATED → IN_USE
 * - This is the retrofit job workflow for line builders
 */
export type ReuseAllocationStatus =
  | 'AVAILABLE'   // In reuse pool, target columns empty (ready to allocate)
  | 'ALLOCATED'   // Planned for new line, target columns filled (allocation made)
  | 'IN_USE'      // Installed on new line, appears in Simulation Status
  | 'RESERVED'    // Reserved for specific project but not allocated yet
  | 'UNKNOWN'     // Cannot determine status

/**
 * Infer reuse allocation status from target allocation columns and simulation presence.
 *
 * Logic:
 * 1. If asset appears in Simulation Status → IN_USE (installed and operational)
 * 2. If target columns filled → ALLOCATED (planned for new line)
 * 3. If target columns empty → AVAILABLE (in pool, ready for allocation)
 *
 * @param input - Allocation tracking data
 * @returns Allocation status
 */
export function inferReuseAllocation(input: {
  targetProject?: string | null
  targetLine?: string | null
  targetStation?: string | null
  targetSector?: string | null
  isInSimulationStatus?: boolean
}): ReuseAllocationStatus {
  // If already in simulation status, it's installed and operational
  if (input.isInSimulationStatus === true) {
    return 'IN_USE'
  }

  // Check if any target allocation exists
  const hasTargetAllocation = [
    input.targetProject,
    input.targetLine,
    input.targetStation,
    input.targetSector
  ].some(val => {
    if (val === null || val === undefined) {
      return false
    }
    const trimmed = String(val).trim()
    return trimmed.length > 0
  })

  if (hasTargetAllocation) {
    return 'ALLOCATED'
  }

  // No allocation, available in pool
  return 'AVAILABLE'
}

/**
 * Normalize location string for matching (removes whitespace, lowercases).
 */
function normalizeLocation(value?: string | null): string {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Check if reuse asset target matches simulation status actual location.
 * Used for cross-workbook linking to detect ALLOCATED → IN_USE transitions.
 *
 * @param reuseAsset - Asset from reuse list with target allocation
 * @param simAsset - Asset from simulation status with actual location
 * @returns True if locations match
 */
export function isReuseTargetMatch(
  reuseAsset: {
    targetLine?: string | null
    targetStation?: string | null
  },
  simAsset: {
    assemblyLine?: string | null
    station?: string | null
  }
): boolean {
  const targetLine = normalizeLocation(reuseAsset.targetLine)
  const actualLine = normalizeLocation(simAsset.assemblyLine)

  const targetStation = normalizeLocation(reuseAsset.targetStation)
  const actualStation = normalizeLocation(simAsset.station)

  // Both line and station must match
  if (targetLine.length === 0 || targetStation.length === 0) {
    return false
  }

  return targetLine === actualLine && targetStation === actualStation
}

// ============================================================================
// SOURCE WORKBOOK IDENTIFICATION
// ============================================================================

/**
 * Stable IDs for source workbooks.
 * Used for provenance tracking and merge rules.
 */
export type SourceWorkbookId =
  // Internal Simulation Status
  | 'STLA_REAR_DES_SIM_STATUS_INTERNAL'
  | 'STLA_UNDERBODY_DES_SIM_STATUS_INTERNAL'
  | 'STLA_FRONT_DES_SIM_STATUS_INTERNAL'
  // Outsource Simulation Status
  | 'STLA_FRONT_CSG_SIM_STATUS_OUTSOURCE'
  | 'STLA_REAR_CSG_SIM_STATUS_OUTSOURCE'
  | 'STLA_UNDERBODY_CSG_SIM_STATUS_OUTSOURCE'
  // Internal Robot Lists
  | 'STLA_UB_ROBOTLIST_REV05_INTERNAL'
  | 'STLA_UB_ROBOTLIST_REV01_INTERNAL'
  // Outsource Robot Lists
  | 'STLA_UB_ROBOTLIST_REV01_OUTSOURCE'
  | 'STLA_UB_ROBOTLIST_REV05_OUTSOURCE'
  // Reuse Lists (Internal)
  | 'FEB_UNDERBODY_TMS_REUSE_ROBOTS_DES_R01_INTERNAL'
  | 'GLOBAL_ZA_REUSE_RISERS_INTERNAL'
  | 'GLOBAL_ZA_REUSE_TIP_DRESSER_INTERNAL'
  | 'GLOBAL_ZA_REUSE_TMS_WG_INTERNAL'
  // Reuse Lists (Outsource - duplicates)
  | 'FEB_UNDERBODY_TMS_REUSE_ROBOTS_DES_R01_OUTSOURCE'
  | 'GLOBAL_ZA_REUSE_RISERS_OUTSOURCE'
  | 'GLOBAL_ZA_REUSE_TIP_DRESSER_OUTSOURCE'
  | 'GLOBAL_ZA_REUSE_TMS_WG_OUTSOURCE'
  // Gun Info / Reference
  | 'ZANGENPOOL_TMS_QUANTITY_FORCE'
  | 'ZANGEN_UEBERSICHTSLISTE_OPEL_MERIVA_ZARA'
  | 'UNKNOWN_WORKBOOK'

/**
 * Workbook configuration metadata
 */
export interface WorkbookConfig {
  workbookId: SourceWorkbookId
  simulationSourceKind: SimulationSourceKind
  defaultSiteLocation: SiteLocation
  humanLabel: string
  expectedSheets: string[]
  notes?: string
}

/**
 * Registry of all known workbooks.
 * Maps file paths/patterns to workbook configuration.
 */
export const WORKBOOK_REGISTRY: Record<string, WorkbookConfig> = {
  // Internal Simulation Status
  'STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx': {
    workbookId: 'STLA_REAR_DES_SIM_STATUS_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Durban',
    humanLabel: 'Internal STLA-S Rear Unit Simulation Status (DES)',
    expectedSheets: ['SIMULATION']
  },
  'STLA-S_UNDERBODY_Simulation_Status_DES.xlsx': {
    workbookId: 'STLA_UNDERBODY_DES_SIM_STATUS_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Durban',
    humanLabel: 'Internal STLA-S Underbody Simulation Status (DES)',
    expectedSheets: ['SIMULATION']
  },

  // Outsource Simulation Status
  'STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx': {
    workbookId: 'STLA_FRONT_CSG_SIM_STATUS_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S Front Unit Simulation Status (CSG)',
    expectedSheets: ['SIMULATION']
  },
  'STLA-S_REAR_UNIT_Simulation_Status_CSG.xlsx': {
    workbookId: 'STLA_REAR_CSG_SIM_STATUS_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S Rear Unit Simulation Status (CSG)',
    expectedSheets: ['SIMULATION']
  },
  'STLA-S_UNDERBODY_Simulation_Status_CSG.xlsx': {
    workbookId: 'STLA_UNDERBODY_CSG_SIM_STATUS_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S Underbody Simulation Status (CSG)',
    expectedSheets: ['SIMULATION']
  },

  // Internal Robot Lists
  'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx:INTERNAL': {
    workbookId: 'STLA_UB_ROBOTLIST_REV05_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Durban',
    humanLabel: 'Internal STLA-S UB Robotlist Rev05',
    expectedSheets: ['STLA-S'],
    notes: 'Latest revision - prefer over Rev01'
  },
  'Robotlist_ZA__STLA-S_UB_Rev01_20251028.xlsx:INTERNAL': {
    workbookId: 'STLA_UB_ROBOTLIST_REV01_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Durban',
    humanLabel: 'Internal STLA-S UB Robotlist Rev01',
    expectedSheets: ['STLA-S'],
    notes: 'Superseded by Rev05'
  },

  // Outsource Robot Lists
  'Robotlist_ZA__STLA-S_UB_Rev01_20251028.xlsx': {
    workbookId: 'STLA_UB_ROBOTLIST_REV01_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S UB Robotlist Rev01',
    expectedSheets: ['STLA-S'],
    notes: 'Superseded by Rev05 - only exists in outsource'
  },
  'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx:OUTSOURCE': {
    workbookId: 'STLA_UB_ROBOTLIST_REV05_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Outsource STLA-S UB Robotlist Rev05',
    expectedSheets: ['STLA-S'],
    notes: 'Same rev as internal - prefer internal as canonical'
  },

  // Reuse Lists - Internal (Primary)
  'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx:INTERNAL': {
    workbookId: 'GLOBAL_ZA_REUSE_RISERS_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - Risers (Internal)',
    expectedSheets: ['Raisers']
  },
  'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx:INTERNAL': {
    workbookId: 'GLOBAL_ZA_REUSE_TIP_DRESSER_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - Tip Dressers (Internal)',
    expectedSheets: ['Tip Dressers']
  },
  'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx:INTERNAL': {
    workbookId: 'GLOBAL_ZA_REUSE_TMS_WG_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - TMS Weld Guns (Internal)',
    expectedSheets: ['Welding guns']
  },
  'FEB Underbody TMS_10.09.25_REUSE_LIST_ROBOTS_DES - R01.xlsx:INTERNAL': {
    workbookId: 'FEB_UNDERBODY_TMS_REUSE_ROBOTS_DES_R01_INTERNAL',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'FEB Underbody TMS Reuse List - Robots (DES)',
    expectedSheets: ['STLA-S']
  },

  // Reuse Lists - Outsource (Duplicates)
  'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx:OUTSOURCE': {
    workbookId: 'GLOBAL_ZA_REUSE_RISERS_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - Risers (Outsource)',
    expectedSheets: ['Raisers'],
    notes: 'Duplicate of internal - use for cross-validation'
  },
  'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx:OUTSOURCE': {
    workbookId: 'GLOBAL_ZA_REUSE_TIP_DRESSER_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - Tip Dressers (Outsource)',
    expectedSheets: ['Tip Dressers'],
    notes: 'Duplicate of internal - use for cross-validation'
  },
  'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx:OUTSOURCE': {
    workbookId: 'GLOBAL_ZA_REUSE_TMS_WG_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Global ZA Reuse List - TMS Weld Guns (Outsource)',
    expectedSheets: ['Welding guns'],
    notes: 'Duplicate of internal - use for cross-validation'
  },
  'FEB Underbody TMS_10.09.25_REUSE_LIST_ROBOTS_DES - R01.xlsx:OUTSOURCE': {
    workbookId: 'FEB_UNDERBODY_TMS_REUSE_ROBOTS_DES_R01_OUTSOURCE',
    simulationSourceKind: 'OutsourceSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'FEB Underbody TMS Reuse List - Robots (Outsource)',
    expectedSheets: ['STLA-S'],
    notes: 'Duplicate of internal - use for cross-validation'
  },

  // Gun Info / Reference
  'Zangenpool_TMS_Rev01_Quantity_Force_Info.xls': {
    workbookId: 'ZANGENPOOL_TMS_QUANTITY_FORCE',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Zangenpool TMS - Gun Force & Quantity Info',
    expectedSheets: ['Zaragoza Allocation']
  },
  'Zangenübersichtsliste_OPEL_MERIVA_ZARA_052017.xls': {
    workbookId: 'ZANGEN_UEBERSICHTSLISTE_OPEL_MERIVA_ZARA',
    simulationSourceKind: 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: 'Zangenübersichtsliste - OPEL Meriva Historic Gun List',
    expectedSheets: []
  }
}

/**
 * Get workbook config from file name and path context
 */
export function getWorkbookConfig(fileName: string, sourcePath: string): WorkbookConfig {
  // Determine if file is from Internal or Outsource path
  const isOutsource = sourcePath.includes('DesignOS')
  const isInternal = sourcePath.includes('03_Simulation')

  // For duplicate files, add :INTERNAL or :OUTSOURCE suffix
  const duplicateFiles = [
    'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
    'GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx',
    'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx',
    'FEB Underbody TMS_10.09.25_REUSE_LIST_ROBOTS_DES - R01.xlsx',
    'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx'
  ]

  let lookupKey = fileName

  if (duplicateFiles.includes(fileName)) {
    if (isInternal) {
      lookupKey = `${fileName}:INTERNAL`
    }

    if (isOutsource) {
      lookupKey = `${fileName}:OUTSOURCE`
    }
  }

  const config = WORKBOOK_REGISTRY[lookupKey]

  if (config !== undefined) {
    return config
  }

  // Fallback for unknown workbooks
  return {
    workbookId: 'UNKNOWN_WORKBOOK',
    simulationSourceKind: isOutsource ? 'OutsourceSimulation' : 'InternalSimulation',
    defaultSiteLocation: 'Unknown',
    humanLabel: fileName,
    expectedSheets: []
  }
}

// ============================================================================
// EXTENDED ASSET TYPE
// ============================================================================

/**
 * Extended asset type that builds on UnifiedAsset.
 * Adds Excel-specific metadata and provenance tracking.
 */
export interface ExcelIngestedAsset extends UnifiedAsset {
  // Additional classification
  detailedKind: DetailedAssetKind

  // Simulation context
  simulationSourceKind: SimulationSourceKind
  siteLocation: SiteLocation

  // Hierarchy (in addition to UnifiedAsset's areaId/cellId)
  projectCode?: string
  assemblyLine?: string | null
  station?: string | null

  // Robot-specific
  robotNumber?: string | null
  robotOrderCode?: string | null
  robotType?: string | null
  payloadKg?: number | null
  reachMm?: number | null
  trackUsed?: boolean | null

  // Application/Technology
  applicationCode?: string | null
  technologyCode?: string | null

  // Reuse allocation tracking (for equipment from reuse lists)
  reuseAllocationStatus?: ReuseAllocationStatus

  // OLD location (from reuse list - where equipment came from)
  oldProject?: string | null
  oldLine?: string | null
  oldStation?: string | null
  oldArea?: string | null

  // NEW/TARGET location (from reuse list - where it's being allocated to)
  targetProject?: string | null   // "Project STLA/P1H/O1H/LPM"
  targetLine?: string | null       // "New Line"
  targetStation?: string | null    // "New station"
  targetSector?: string | null     // "New Sector"

  // Provenance (enhances UnifiedAsset's sourceFile/sheetName/rowIndex)
  primaryWorkbookId: SourceWorkbookId
  sourceWorkbookIds: SourceWorkbookId[]
  sourceSheetNames: string[]
  rawRowIds: string[]

  // Free-form tags for debugging and future rules
  rawTags: string[]
}

/**
 * Convert ExcelIngestedAsset to UnifiedAsset for storage/API
 */
export function toUnifiedAsset(excelAsset: ExcelIngestedAsset): UnifiedAsset {
  return {
    id: excelAsset.id,
    name: excelAsset.name,
    kind: mapDetailedKindToAssetKind(excelAsset.detailedKind),
    sourcing: excelAsset.sourcing,
    metadata: {
      ...excelAsset.metadata,
      detailedKind: excelAsset.detailedKind,
      simulationSourceKind: excelAsset.simulationSourceKind,
      siteLocation: excelAsset.siteLocation,
      projectCode: excelAsset.projectCode ?? null,
      assemblyLine: excelAsset.assemblyLine ?? null,
      robotNumber: excelAsset.robotNumber ?? null,
      robotOrderCode: excelAsset.robotOrderCode ?? null,
      robotType: excelAsset.robotType ?? null,
      applicationCode: excelAsset.applicationCode ?? null,
      technologyCode: excelAsset.technologyCode ?? null,
      reuseAllocationStatus: excelAsset.reuseAllocationStatus ?? null,
      oldProject: excelAsset.oldProject ?? null,
      oldLine: excelAsset.oldLine ?? null,
      oldStation: excelAsset.oldStation ?? null,
      oldArea: excelAsset.oldArea ?? null,
      targetProject: excelAsset.targetProject ?? null,
      targetLine: excelAsset.targetLine ?? null,
      targetStation: excelAsset.targetStation ?? null,
      targetSector: excelAsset.targetSector ?? null,
      primaryWorkbookId: excelAsset.primaryWorkbookId,
      sourceWorkbookIds: JSON.stringify(excelAsset.sourceWorkbookIds),
      rawTags: JSON.stringify(excelAsset.rawTags)
    },
    areaId: excelAsset.areaId,
    areaName: excelAsset.areaName,
    cellId: excelAsset.cellId,
    stationNumber: excelAsset.station ?? undefined,
    sourceFile: excelAsset.sourceFile,
    sheetName: excelAsset.sheetName,
    rowIndex: excelAsset.rowIndex,
    notes: excelAsset.notes,
    lastUpdated: excelAsset.lastUpdated,
    type: excelAsset.robotType ?? excelAsset.type,
    payloadClass: excelAsset.payloadKg !== null && excelAsset.payloadKg !== undefined
      ? `${excelAsset.payloadKg}kg`
      : excelAsset.payloadClass
  }
}

// ============================================================================
// RAW ROW TYPES (Stage 1: IO)
// ============================================================================

/**
 * Raw row data extracted from Excel.
 * Stage 1 output - no domain logic applied yet.
 */
export interface RawRow {
  workbookId: SourceWorkbookId
  sheetName: string
  rowIndex: number
  cells: Record<string, unknown>  // headerKey → cell value
}

/**
 * Parsed asset row with domain fields extracted.
 * Stage 2 output - ready for classification and linking.
 */
export interface ParsedAssetRow {
  // Asset identity
  name: string
  detailedKind: DetailedAssetKind
  sourcing: EquipmentSourcing

  // Provenance
  sourceWorkbookId: SourceWorkbookId
  sourceFile: string
  sourceSheetName: string
  sourceRowIndex: number

  // Hierarchy (optional - may be minimal for reuse pool equipment)
  projectCode?: string | null
  areaName?: string | null
  assemblyLine?: string | null
  station?: string | null

  // Asset identity (optional)
  robotNumber?: string | null
  partNumber?: string | null

  // Reuse allocation tracking (for reuse list items)
  reuseAllocationStatus?: ReuseAllocationStatus
  oldProject?: string | null
  oldArea?: string | null
  oldLine?: string | null
  oldStation?: string | null
  targetProject?: string | null
  targetLine?: string | null
  targetStation?: string | null
  targetSector?: string | null

  // Classification hints
  applicationCode?: string | null
  technologyCode?: string | null
  lifecycleHint?: string | null

  // Raw data for classification
  rawTags: string[]
  notes?: string | null
  rawLocation?: string | null  // Unparsed location string for future processing
}

/**
 * Build a unique ID for a raw row
 */
export function buildRawRowId(workbookId: SourceWorkbookId, sheetName: string, rowIndex: number): string {
  return `${workbookId}:${sheetName}:${rowIndex}`
}

/**
 * Build a canonical asset key for cross-workbook linking.
 * Assets with the same key should be merged/linked.
 *
 * For reuse pool equipment, use flexible params (name + location + station)
 */
export function buildAssetKey(input: {
  name?: string | null
  location?: string | null
  station?: string | null
  projectCode?: string | null
  areaName?: string | null
  assemblyLine?: string | null
  robotNumber?: string | null
}): string {
  const parts: string[] = []

  // For reuse list assets, use simpler key structure
  if (input.name !== null && input.name !== undefined && input.name.trim().length > 0) {
    parts.push(input.name.trim().toLowerCase())
  }

  if (input.location !== null && input.location !== undefined && input.location.trim().length > 0) {
    parts.push(input.location.trim().toLowerCase())
  }

  if (input.station !== null && input.station !== undefined && input.station.trim().length > 0) {
    parts.push(input.station.trim().toLowerCase())
  }

  // For simulation status assets, use full hierarchy
  if (input.projectCode !== null && input.projectCode !== undefined && input.projectCode.trim().length > 0) {
    parts.push(input.projectCode.trim().toLowerCase())
  }

  if (input.areaName !== null && input.areaName !== undefined && input.areaName.trim().length > 0) {
    parts.push(input.areaName.trim().toLowerCase())
  }

  if (input.assemblyLine !== null && input.assemblyLine !== undefined && input.assemblyLine.trim().length > 0) {
    parts.push(input.assemblyLine.trim().toLowerCase())
  }

  if (input.robotNumber !== null && input.robotNumber !== undefined && input.robotNumber.trim().length > 0) {
    parts.push(input.robotNumber.trim().toLowerCase())
  }

  // Must have at least one part
  if (parts.length === 0) {
    return 'UNKNOWN_ASSET'
  }

  return parts.join('|')
}
