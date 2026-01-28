// Cross-Reference Types
// Types for the Cross-Reference Engine that unifies ingested data

import { Tool, Robot, Cell } from '../core'
import { ParsedSimulationRow } from '../../ingestion/simulationStatusParser'
import { PanelMilestones } from '../../ingestion/simulationStatus/simulationStatusTypes'

// ============================================================================
// KEY TYPES
// ============================================================================

export type StationKey = string
export type RobotKey = string
export type GunKey = string
export type AreaKey = string

// ============================================================================
// SNAPSHOT TYPES (Normalized wrappers around ingested data)
// ============================================================================

/**
 * Snapshot of simulation status data for a station
 */
export interface SimulationStatusSnapshot {
  stationKey: StationKey
  areaKey?: AreaKey
  lineCode?: string
  application?: string
  firstStageCompletion?: number
  finalDeliverablesCompletion?: number
  hasIssues?: boolean
  dcsConfigured?: boolean
  engineer?: string
  /** Robot identifier (e.g., "8Y-020-01") for panel milestone lookup */
  robotKey?: string
  /** Panel-grouped milestones for all 11 panels */
  panelMilestones?: PanelMilestones
  raw: ParsedSimulationRow | Cell | Record<string, unknown>
}

/**
 * Snapshot of tooling data (from Tool List / In-House Tooling)
 */
export interface ToolSnapshot {
  stationKey: StationKey
  areaKey?: AreaKey
  toolId?: string
  simLeader?: string
  simEmployee?: string
  teamLeader?: string
  simDueDate?: string
  toolType?: string
  raw: Tool | Record<string, unknown>
}

/**
 * Snapshot of robot specification data
 */
export interface RobotSnapshot {
  stationKey: StationKey
  robotKey: RobotKey
  caption?: string
  eNumber?: string
  hasDressPackInfo: boolean
  oemModel?: string
  raw: Robot | Record<string, unknown>
}

/**
 * Snapshot of weld gun data (from Reuse Weld Guns)
 */
export interface WeldGunSnapshot {
  stationKey: StationKey
  gunKey: GunKey
  deviceName?: string
  applicationRobot?: string
  refreshmentOk?: boolean
  serialNumber?: string
  raw: Tool | Record<string, unknown>
}

/**
 * Snapshot of gun force data (from Zangenpool)
 */
export interface GunForceSnapshot {
  gunKey: GunKey
  requiredForce?: number
  area?: AreaKey
  robotNumber?: string
  quantity?: number
  raw: Record<string, unknown>
}

/**
 * Snapshot of riser data
 */
export interface RiserSnapshot {
  stationKey: StationKey
  areaKey?: AreaKey
  brand?: string
  height?: string | number
  project?: string
  raw: Tool | Record<string, unknown>
}

// ============================================================================
// FLAG TYPES
// ============================================================================

/**
 * Types of cross-reference validation flags
 */
export type CrossRefFlagType =
  | 'MISSING_GUN_FORCE_FOR_WELD_GUN'
  | 'ROBOT_MISSING_DRESS_PACK_INFO'
  | 'STATION_WITHOUT_SIMULATION_STATUS'
  | 'TOOL_WITHOUT_OWNER'
  | 'RISER_NOT_ALLOCATED_TO_NEW_STATION'
  | 'AMBIGUOUS_GUN_MATCH'
  | 'AMBIGUOUS_ROBOT_MATCH'
  | 'DUPLICATE_STATION_DEFINITION'

/**
 * A cross-reference validation flag
 */
export interface CrossRefFlag {
  type: CrossRefFlagType
  stationKey?: StationKey
  robotKey?: RobotKey
  gunKey?: GunKey
  message: string
  severity: 'WARNING' | 'ERROR'
}

// ============================================================================
// CELL SNAPSHOT (Unified station view)
// ============================================================================

/**
 * A unified view of all data for a single station/cell
 */
export interface CellSnapshot {
  stationKey: StationKey
  displayCode: string
  areaKey?: AreaKey
  lineCode?: string

  simulationStatus?: SimulationStatusSnapshot

  tools: ToolSnapshot[]
  robots: RobotSnapshot[]
  weldGuns: WeldGunSnapshot[]
  gunForces: GunForceSnapshot[]
  risers: RiserSnapshot[]

  flags: CrossRefFlag[]
}

// ============================================================================
// INPUT / OUTPUT TYPES
// ============================================================================

/**
 * Input to the cross-reference engine
 */
export interface CrossRefInput {
  simulationStatusRows: SimulationStatusSnapshot[]
  toolingRows: ToolSnapshot[]
  robotSpecsRows: RobotSnapshot[]
  weldGunRows: WeldGunSnapshot[]
  gunForceRows: GunForceSnapshot[]
  riserRows: RiserSnapshot[]
}

/**
 * Result of cross-reference processing
 */
export interface CrossRefResult {
  cells: CellSnapshot[]
  globalFlags: CrossRefFlag[]
  stats: {
    totalCells: number
    cellsWithRisks: number
    totalFlags: number
    robotCount: number
    toolCount: number
    weldGunCount: number
    riserCount: number
  }
  /** Ready-made summaries for UI consumption */
  cellHealthSummaries: CellHealthSummary[]
}

// ============================================================================
// HEALTH SUMMARY TYPES
// ============================================================================

/**
 * Risk level for a cell
 */
export type CellRiskLevel = 'OK' | 'AT_RISK' | 'CRITICAL'

/**
 * UI-ready health summary for a cell
 */
export interface CellHealthSummary {
  stationKey: StationKey
  displayCode: string
  areaKey?: AreaKey

  hasSimulationStatus: boolean

  // Progress & config from SimulationStatusSnapshot
  firstStageCompletion?: number
  finalDeliverablesCompletion?: number
  dcsConfigured?: boolean

  // Asset counts
  robotCount: number
  toolCount: number
  weldGunCount: number
  gunForceCount: number
  riserCount: number

  // Risk / flags
  riskLevel: CellRiskLevel
  flags: CrossRefFlag[]
  criticalReasons: string[]
  warningReasons: string[]
}
