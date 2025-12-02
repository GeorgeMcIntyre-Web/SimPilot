/**
 * WORKFLOW TYPES
 *
 * Generic workflow bottleneck framework that supports multiple asset kinds
 * (tooling, weld guns, robot cells, external supplier items, etc.)
 *
 * This abstracts the common DESIGN → SIMULATION → MANUFACTURE workflow
 * and allows tracking bottlenecks across different asset types uniformly.
 */

/**
 * Kind of workflow item being tracked
 */
export type WorkflowItemKind =
  | 'TOOLING'           // Fixtures, clamps, risers, etc.
  | 'WELD_GUN'          // External supplier gun (2D → 3D)
  | 'ROBOT_CELL'        // Complete robot station/cell
  | 'FIXTURE'           // Dedicated fixture item
  | 'OTHER'             // Other external supplier items

/**
 * Workflow stage in the DESIGN → SIMULATION → MANUFACTURE pipeline
 */
export type WorkflowStage =
  | 'DESIGN'
  | 'SIMULATION'
  | 'MANUFACTURE'
  | 'EXTERNAL_SUPPLIER'
  | 'UNKNOWN'

/**
 * Status of a workflow stage
 */
export type WorkflowStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'BLOCKED'
  | 'COMPLETE'
  | 'UNKNOWN'

/**
 * Generic bottleneck reason (applies across all asset kinds)
 */
export type WorkflowBottleneckReason =
  | 'DESIGN_NOT_DETAILED'       // Design incomplete / missing detail
  | 'DESIGN_BLOCKED'            // Design blocked by upstream item
  | 'SIM_NOT_STARTED'           // Simulation not started
  | 'SIM_CHANGES_REQUESTED'     // Simulation rejected / issues found
  | 'SIM_BEHIND_DESIGN'         // Simulation lagging design
  | 'SIM_BLOCKED'               // Simulation blocked by upstream item
  | 'BUILD_AHEAD_OF_SIM'        // Manufacturing started before sim approval
  | 'MANUFACTURE_CONSTRAINT'    // Manufacturing resource/tooling constraint
  | 'MISSING_ASSETS'            // Physical assets not allocated
  | 'MISSING_REUSE'             // Reuse allocation not planned
  | 'SUPPLIER_DELAY'            // External supplier behind schedule
  | 'DATA_GAP'                  // Missing required data
  | 'DEPENDENCY_BLOCKED'        // Blocked by another workflow item
  | 'OK'                        // No bottleneck
  | 'UNKNOWN'

/**
 * Severity of a bottleneck
 */
export type BottleneckSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK'

/**
 * Stage status snapshot
 */
export interface StageStatusSnapshot {
  stage: WorkflowStage
  status: WorkflowStatus
  percentComplete: number | null
  owner?: string
  note?: string
  updatedAt?: string
}

/**
 * Generic workflow item (can represent tooling, guns, cells, etc.)
 */
export interface WorkflowItem {
  /** Unique ID for this workflow item */
  id: string

  /** What kind of item this is */
  kind: WorkflowItemKind

  /** Link to simulation context (Program|Plant|Unit|Line|Station) */
  simulationContextKey: string

  /** Human-readable name/description */
  name: string

  /** Item number (tooling number, gun ID, cell ID, etc.) */
  itemNumber?: string

  /** Equipment number (if applicable) */
  equipmentNumber?: string

  /** Handedness for physical items */
  handedness?: 'LH' | 'RH' | 'PAIR' | 'NA'

  /** Design stage status */
  designStageStatus: StageStatusSnapshot

  /** Simulation stage status */
  simulationStageStatus: StageStatusSnapshot

  /** Manufacture stage status */
  manufactureStageStatus: StageStatusSnapshot

  /** External supplier name (for externally sourced items) */
  externalSupplierName?: string

  /** Is this a reuse item? */
  isReuse?: boolean

  /** Has physical assets been allocated? */
  hasAssets?: boolean

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Workflow bottleneck status (result of bottleneck analysis)
 */
export interface WorkflowBottleneckStatus {
  /** ID of the workflow item */
  workflowItemId: string

  /** Kind of item */
  kind: WorkflowItemKind

  /** Link to simulation context */
  simulationContextKey: string

  /** Item number */
  itemNumber?: string

  /** Dominant stage where bottleneck exists */
  dominantStage: WorkflowStage

  /** Specific bottleneck reason */
  bottleneckReason: WorkflowBottleneckReason

  /** Severity level */
  severity: BottleneckSeverity

  /** Numeric severity score (0-120, higher = worse) */
  severityScore: number

  /** IDs of other workflow items blocking this one */
  blockingItemIds: string[]

  /** Design stage snapshot */
  designStage: StageStatusSnapshot

  /** Simulation stage snapshot */
  simulationStage: StageStatusSnapshot

  /** Manufacture stage snapshot */
  manufactureStage: StageStatusSnapshot

  /** Optional reference to full workflow item */
  workflowItem?: WorkflowItem
}

/**
 * Collection of workflow items
 */
export interface WorkflowSnapshot {
  generatedAt: string
  items: WorkflowItem[]
}

/**
 * Collection of bottleneck statuses
 */
export interface WorkflowBottleneckSnapshot {
  generatedAt: string
  bottlenecks: WorkflowBottleneckStatus[]
}

/**
 * Resolve severity from bottleneck reason
 */
export function resolveSeverityFromReason(reason: WorkflowBottleneckReason): BottleneckSeverity {
  if (reason === 'OK') return 'OK'

  // Critical: building ahead of sim, missing critical dependencies
  if (reason === 'BUILD_AHEAD_OF_SIM') return 'CRITICAL'
  if (reason === 'DEPENDENCY_BLOCKED') return 'CRITICAL'

  // High: design/sim issues that block progress
  if (reason === 'DESIGN_BLOCKED') return 'HIGH'
  if (reason === 'DESIGN_NOT_DETAILED') return 'HIGH'
  if (reason === 'SIM_CHANGES_REQUESTED') return 'HIGH'
  if (reason === 'SIM_BLOCKED') return 'HIGH'

  // Medium: sim/manufacture coordination issues
  if (reason === 'SIM_NOT_STARTED') return 'MEDIUM'
  if (reason === 'SIM_BEHIND_DESIGN') return 'MEDIUM'
  if (reason === 'MANUFACTURE_CONSTRAINT') return 'MEDIUM'
  if (reason === 'SUPPLIER_DELAY') return 'MEDIUM'

  // Low: resource allocation issues
  if (reason === 'MISSING_ASSETS') return 'LOW'
  if (reason === 'MISSING_REUSE') return 'LOW'
  if (reason === 'DATA_GAP') return 'LOW'

  return 'LOW'
}

/**
 * Create empty workflow snapshot
 */
export function createEmptyWorkflowSnapshot(): WorkflowSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    items: []
  }
}

/**
 * Create empty bottleneck snapshot
 */
export function createEmptyWorkflowBottleneckSnapshot(): WorkflowBottleneckSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    bottlenecks: []
  }
}
