// SimPilot Core Domain Types
// Clean, future-proof type system following guard-clause architecture

import { UnifiedAsset } from './UnifiedModel'
export * from './UnifiedModel'

// ============================================================================
// INGESTION WARNINGS
// ============================================================================

export type IngestionWarningKind =
  | "PARSER_ERROR"
  | "HEADER_MISMATCH"
  | "ROW_SKIPPED"
  | "LINKING_AMBIGUOUS"
  | "LINKING_MISSING_TARGET"
  | "UNKNOWN_FILE_TYPE"

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
  plannedStart?: string       // ISO date string
  plannedEnd?: string         // ISO date string
  dueDate?: string            // ISO date string (optional hard deadline)
  phase: SchedulePhase
  status: ScheduleStatus
}

// ============================================================================
// PROJECTS, AREAS, CELLS
// ============================================================================

export type ProjectStatus = "Planning" | "Running" | "OnHold" | "Closed"

export interface Project {
  id: string
  name: string              // e.g. "STLA-S Rear Unit"
  customer: string          // OEM / program family, e.g. "STLA-S"
  plant?: string
  programCode?: string
  manager?: string          // e.g. "Dale"
  status: ProjectStatus
  startDate?: string
  sopDate?: string
  schedule?: ScheduleInfo   // NEW: schedule metadata
}

export interface Area {
  id: string
  projectId: string
  name: string              // "WHR LH", "Rear Rail LH", "UBM_Platforme / Styleline"
  code?: string             // "BN_B05", etc.
}

export type CellStatus =
  | "NotStarted"
  | "InProgress"
  | "Blocked"
  | "ReadyForReview"
  | "Approved"

export interface SimulationStatus {
  percentComplete: number
  hasIssues: boolean
  metrics: Record<string, number | string>
  sourceFile: string
  sheetName: string
  rowIndex: number
  studyPath?: string // Path to the .psz study file
}

export interface Cell {
  id: string
  projectId: string
  areaId: string
  name: string        // human-friendly label
  code: string        // station id, e.g. "010"
  oemRef?: string
  status: CellStatus
  assignedEngineer?: string
  lineCode?: string   // "BN_B05", "BC_B04"
  plannedStart?: string
  plannedFinish?: string
  lastUpdated?: string
  simulation?: SimulationStatus
  schedule?: ScheduleInfo  // NEW: schedule metadata
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

export type ToolType =
  | "SPOT_WELD"
  | "SEALER"
  | "STUD_WELD"
  | "GRIPPER"
  | "OTHER"

export type ToolMountType =
  | "ROBOT_MOUNTED"
  | "STAND_MOUNTED"
  | "HAND_TOOL"
  | "UNKNOWN"

export type SpotWeldSubType = "PNEUMATIC" | "SERVO" | "UNKNOWN"

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
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID from components
 */
export function generateId(...parts: (string | number)[]): string {
  return parts.filter(p => p !== undefined && p !== null).join('-')
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
export function deriveCellStatus(
  percentComplete: number,
  hasIssues: boolean
): CellStatus {
  if (percentComplete === 0) return "NotStarted"
  if (hasIssues) return "Blocked"
  if (percentComplete === 100) return "Approved"
  if (percentComplete >= 90) return "ReadyForReview"
  return "InProgress"
}
