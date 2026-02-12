// SimPilot Core Domain Types
// Clean, future-proof type system following guard-clause architecture

import { UnifiedAsset, EquipmentSourcing } from './UnifiedModel'
export * from './UnifiedModel'

// ============================================================================
// INGESTION WARNINGS
// ============================================================================

export type IngestionWarningKind =
  | 'PARSER_ERROR'
  | 'HEADER_MISMATCH'
  | 'SEMANTIC_AMBIGUOUS_HEADER'
  | 'SEMANTIC_UNMAPPED_HEADER'
  | 'SEMANTIC_MISSING_REQUIRED_FIELD'
  | 'ROW_SKIPPED'
  | 'LINKING_AMBIGUOUS'
  | 'LINKING_MISSING_TARGET'
  | 'UNKNOWN_FILE_TYPE'
  | 'INACTIVE_ENTITY_REFERENCE'
  | 'DUPLICATE_ENTRY'

export interface IngestionWarning {
  id: string
  kind: IngestionWarningKind
  fileName: string
  sheetName?: string
  rowIndex?: number
  message: string
  details?: Record<string, string | number | boolean>
  createdAt: string
}

// ============================================================================
// SCHEDULE METADATA
// ============================================================================

export type SchedulePhase = 'unspecified' | 'presim' | 'offline' | 'onsite' | 'rampup' | 'handover'
export type ScheduleStatus = 'unknown' | 'onTrack' | 'atRisk' | 'late'

export interface ScheduleInfo {
  plannedStart?: string // ISO date string
  plannedEnd?: string // ISO date string
  dueDate?: string // ISO date string (optional hard deadline)
  phase: SchedulePhase
  status: ScheduleStatus
}

// High-level schedule summary extracted from overview sheets (calendar week based)
export interface OverviewScheduleMetrics {
  currentWeek?: number
  currentJobDuration?: number
  jobStartWeek?: number
  jobEndWeek?: number
  completeJobDuration?: number
  firstStageSimComplete?: number
  firstStageSimDuration?: number
  firstStageSimPerWeek?: number
  firstStageSimRequired?: number
  vcStartWeek?: number
  jobDurationToVcStart?: number
  vcReadyPerWeek?: number
  vcReadyRequired?: number
  finalDeliverablesEndWeek?: number
  finalDeliverablesDuration?: number
  finalDeliverablesPerWeek?: number
  finalDeliverablesRequired?: number
}

// ============================================================================
// HIERARCHY: PROJECT → PLANT → AREA → CELL → STATION → EQUIPMENT
// ============================================================================
//
// Correct manufacturing hierarchy:
//   Project (J11006 STLA-S)
//     → Plant (ZAR South Africa)
//       → Area (FRONT UNIT, REAR UNIT, UNDERBODY, BOTTOM TRAY)
//         → Cell (Rear Rail LH, WHR LH, UBM_Platforme / Styleline)
//           → Station (010, 020, 030)
//             → Equipment (Robots, Fixtures, Grippers, etc.)
//
// NOTE: The "Cell" type below represents station-level simulation rows,
// not manufacturing cells. A manufacturing cell (e.g., "Rear Rail LH")
// groups multiple stations and is currently stored in the "Area" concept.
// Future refactor: introduce explicit ManufacturingCell and Station types.
// ============================================================================

export type ProjectStatus = 'Planning' | 'Running' | 'OnHold' | 'Closed'

export interface Plant {
  id: string
  name: string // e.g. "STLA-S ZAR Plant"
  location: string // e.g. "ZAR" (South Africa)
  projectIds: string[] // Projects at this plant
}

export interface Project {
  id: string
  name: string // e.g. "STLA-S"
  jobNumber?: string // e.g. "J11006"
  customer: string // OEM / program family, e.g. "STLA-S"
  plantId?: string // Reference to Plant
  programCode?: string
  manager?: string // e.g. "Dale"
  status: ProjectStatus
  startDate?: string
  sopDate?: string
  schedule?: ScheduleInfo
}

export interface Area {
  id: string
  projectId: string
  name: string // AREA level: "FRONT UNIT", "REAR UNIT", "UNDERBODY"
  code?: string // Area code if applicable
}

// Zone represents a sub-area within an Area (manufacturing cell)
// Examples: "Rear Rail LH", "Front Floor ASS 1", "Wheelhouse RH"
// A Zone groups multiple stations that work on a specific assembly
export interface Zone {
  id: string
  projectId: string
  areaId: string // Parent area ("FRONT UNIT", "REAR UNIT", etc.)
  name: string // Zone name: "Rear Rail LH", "Front Floor ASS 1"
  code?: string // Zone code if applicable
}

export type CellStatus = 'NotStarted' | 'InProgress' | 'Blocked' | 'ReadyForReview' | 'Approved'

export interface SimulationStatus {
  percentComplete: number
  hasIssues: boolean
  metrics: Record<string, number | string>
  sourceFile: string
  sheetName: string
  rowIndex: number
  studyPath?: string // Path to the .psz study file
  application?: string // Robot application from status sheet (e.g., "SW", "MH/SW")
}

// NOTE: In STLA domain, this represents a station-level simulation row.
// Cell = Station in manufacturing terminology
export interface Cell {
  id: string
  projectId: string
  areaId: string // Reference to parent Area ("FRONT UNIT", "REAR UNIT")
  zoneId?: string // Optional reference to Zone ("Rear Rail LH", "Front Floor ASS 1")
  name: string // human-friendly label (station name)
  code: string // station number, e.g. "010", "020"
  stationId?: string | null // canonical station ID (area|station normalized)
  oemRef?: string
  status: CellStatus
  assignedEngineer?: string
  lineCode?: string // "BN_B05", "BC_B04"
  plannedStart?: string
  plannedFinish?: string
  lastUpdated?: string
  simulation?: SimulationStatus
  schedule?: ScheduleInfo
  sourcing?: EquipmentSourcing // sourcing status from linked assets (REUSE, NEW_BUY, etc.)
  metadata?: Record<string, any> // additional metadata from linked assets (Gun Force, Supplier, etc.)
}

// ============================================================================
// ROBOTS
// ============================================================================

export interface Robot extends UnifiedAsset {
  toolIds: string[]
  // Redundant fields removed or kept if they are specific overrides?
  // UnifiedAsset has: id, name, kind, sourcing, metadata, areaId, areaName, cellId, stationNumber, oemModel, description, sourceFile, sheetName, rowIndex
  // Robot had: id, name, oemModel, lineCode, areaName, stationCode, projectId, areaId, cellId, toolIds, sourcing, sourceFile, sheetName, rowIndex

  // Specific fields not in UnifiedAsset (or different name):
  lineCode?: string
  stationCode?: string // UnifiedAsset has stationNumber
  projectId?: string
}

// ============================================================================
// TOOLS (Generalized Equipment Model)
// ============================================================================

export type ToolType = 'SPOT_WELD' | 'SEALER' | 'STUD_WELD' | 'GRIPPER' | 'OTHER'

export type ToolMountType = 'ROBOT_MOUNTED' | 'STAND_MOUNTED' | 'HAND_TOOL' | 'UNKNOWN'

export type SpotWeldSubType = 'PNEUMATIC' | 'SERVO' | 'UNKNOWN'

export interface Tool extends UnifiedAsset {
  toolType: ToolType
  subType?: SpotWeldSubType
  mountType: ToolMountType
  lineCode?: string
  areaName?: string
  stationCode?: string
  projectId?: string
  robotId?: string
  reuseStatus?: string
  canonicalKey?: string // Schema-aware canonical key for UID resolution
  toolNo?: string // Tool number/code from Excel
}

// ============================================================================
// REFERENCE DATA (METADATA)
// ============================================================================

export interface EmployeeRecord {
  id: string
  name: string
  role?: string
  department?: string
}

export interface SupplierRecord {
  id: string
  name: string
  contact?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID from components
 */
export function generateId(...parts: (string | number)[]): string {
  return parts.filter((p) => p !== undefined && p !== null).join('-')
}

/**
 * Normalize string for comparison (lowercase, trim, collapse whitespace)
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return ''
  return str.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Parse percentage value from various formats
 */
export function parsePercentage(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value

  const str = String(value).trim().toLowerCase()
  if (str === '' || str === 'na' || str === 'n/a') return null

  const num = parseFloat(str)
  if (isNaN(num)) return null

  return num
}

/**
 * Determine cell status from completion percentage and issues
 */
export function deriveCellStatus(percentComplete: number, hasIssues: boolean): CellStatus {
  if (percentComplete === 0) return 'NotStarted'
  if (hasIssues) return 'Blocked'
  if (percentComplete === 100) return 'Approved'
  if (percentComplete >= 90) return 'ReadyForReview'
  return 'InProgress'
}
