// Snapshot Types for Git-Style History
// Defines types for tracking daily ingestion snapshots and computing diffs

import { CellSnapshot, CrossRefFlag, CellHealthSummary } from '../crossRef/CrossRefTypes'

// ============================================================================
// DAILY SNAPSHOT (The "Commit")
// ============================================================================

/**
 * A daily snapshot represents a single "commit" of project state.
 * Captured after ingestion + CrossRef runs.
 */
export interface DailySnapshot {
  /** Unique identifier (uuid or content hash) */
  id: string
  
  /** Project this snapshot belongs to */
  projectId: string
  
  /** ISO timestamp when snapshot was captured */
  capturedAt: string
  
  /** User or automation that triggered the capture */
  capturedBy: string
  
  /** Source files that contributed to this snapshot */
  sourceFiles: string[]
  
  /** The unified cell snapshots from CrossRef */
  cells: CellSnapshot[]
  
  /** Pre-computed health summaries for quick access */
  healthSummaries: CellHealthSummary[]
  
  /** Global flags from CrossRef */
  globalFlags: CrossRefFlag[]
  
  /** Statistics at time of capture */
  stats: SnapshotStats
  
  /** Optional description/note */
  description?: string
}

/**
 * Aggregated statistics for a snapshot
 */
export interface SnapshotStats {
  totalCells: number
  cellsWithRisks: number
  totalFlags: number
  robotCount: number
  toolCount: number
  weldGunCount: number
  riserCount: number
  avgCompletion?: number
  atRiskCellCount: number
}

// ============================================================================
// METRIC DELTA (Change in a single metric)
// ============================================================================

/**
 * Represents a change in a single metric between snapshots
 */
export interface MetricDelta {
  /** The metric being compared (e.g., "ROBOT POSITION - STAGE 1") */
  metricLabel: string
  
  /** Previous value (null if metric didn't exist) */
  fromPercent: number | null
  
  /** New value (null if metric was removed) */
  toPercent: number | null
  
  /** Previous remaining hours (if tracked) */
  fromRemainingHours?: number
  
  /** New remaining hours (if tracked) */
  toRemainingHours?: number
}

// ============================================================================
// CELL DELTA (Changes to a single station/cell)
// ============================================================================

/**
 * Represents all changes to a single station between snapshots
 */
export interface CellDelta {
  /** Station identifier */
  stationKey: string
  
  /** Area key (if available) */
  areaKey?: string
  
  /** Was this station added in the new snapshot? */
  added: boolean
  
  /** Was this station removed in the new snapshot? */
  removed: boolean
  
  /** Changes to individual metrics */
  metricDeltas: MetricDelta[]
  
  /** Change in assigned owner */
  ownerChange?: {
    from: string | null
    to: string | null
  }
  
  /** Change in simulation completion */
  completionChange?: {
    fromFirstStage: number | null
    toFirstStage: number | null
    fromFinalDeliverables: number | null
    toFinalDeliverables: number | null
  }
  
  /** Changes in flags/warnings */
  flagsAdded: CrossRefFlag[]
  flagsRemoved: CrossRefFlag[]
  
  /** Asset count changes */
  assetChanges?: {
    robotsDelta: number
    toolsDelta: number
    weldGunsDelta: number
    risersDelta: number
  }
}

// ============================================================================
// SNAPSHOT DIFF (Git-style diff between two snapshots)
// ============================================================================

/**
 * The complete diff between two snapshots - like a Git commit diff
 */
export interface SnapshotDiff {
  /** ID of the older snapshot */
  fromId: string
  
  /** ID of the newer snapshot */
  toId: string
  
  /** Timestamps for context */
  fromCapturedAt: string
  toCapturedAt: string
  
  /** Cell-level changes */
  cells: CellDelta[]
  
  /** Summary statistics of the diff */
  summary: DiffSummary
}

/**
 * Summary statistics for a snapshot diff
 */
export interface DiffSummary {
  /** Number of cells added */
  cellsAdded: number
  
  /** Number of cells removed */
  cellsRemoved: number
  
  /** Number of cells with changes */
  cellsModified: number
  
  /** Number of cells unchanged */
  cellsUnchanged: number
  
  /** Total metrics that improved */
  metricsImproved: number
  
  /** Total metrics that regressed */
  metricsRegressed: number
  
  /** Total hours delta (negative = progress made) */
  totalHoursDelta?: number
  
  /** Average completion delta */
  avgCompletionDelta?: number
  
  /** New flags added across all cells */
  newFlagsCount: number
  
  /** Flags resolved across all cells */
  resolvedFlagsCount: number
}

// ============================================================================
// STATUS DIVERGENCE (Sim vs Declared)
// ============================================================================

/**
 * Represents divergence between declared status and actual simulation state.
 * This is where "source control" comparison happens.
 */
export type DivergenceFlagType =
  | 'STATUS_DIVERGES_FROM_SIM'
  | 'DECLARED_AHEAD_OF_ACTUAL'
  | 'DECLARED_BEHIND_ACTUAL'

export interface MetricPair {
  /** Metric identifier */
  metricId: string
  
  /** Human-readable label */
  metricLabel: string
  
  /** Value from status file (declared) */
  fromStatusPercent: number | null
  
  /** Value from simulation export (actual) */
  fromSimPercent: number | null
  
  /** Divergence threshold that was exceeded */
  divergenceThreshold: number
}

export interface DivergenceFlag {
  type: DivergenceFlagType
  stationKey: string
  message: string
  severity: 'WARNING' | 'ERROR'
  metrics: MetricPair[]
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Lightweight snapshot reference for timeline display
 */
export interface SnapshotRef {
  id: string
  projectId: string
  capturedAt: string
  capturedBy: string
  cellCount: number
  avgCompletion?: number
  atRiskCount: number
  description?: string
}

/**
 * Convert a DailySnapshot to a SnapshotRef for listing
 */
export function toSnapshotRef(snapshot: DailySnapshot): SnapshotRef {
  return {
    id: snapshot.id,
    projectId: snapshot.projectId,
    capturedAt: snapshot.capturedAt,
    capturedBy: snapshot.capturedBy,
    cellCount: snapshot.stats.totalCells,
    avgCompletion: snapshot.stats.avgCompletion,
    atRiskCount: snapshot.stats.atRiskCellCount,
    description: snapshot.description
  }
}
