/**
 * WORKFLOW MAPPERS
 *
 * Mapping functions to convert asset-specific types (ToolingItem, WeldGun, etc.)
 * into generic WorkflowItem instances for unified bottleneck analysis.
 */

import type {
  WorkflowItem,
  StageStatusSnapshot,
  WorkflowStatus
} from './workflowTypes'
import type {
  ToolingItem,
  ToolingWorkflowStatus,
  StageStatusSnapshot as ToolingStageStatusSnapshot
} from './toolingTypes'

/**
 * Map ToolingItem to generic WorkflowItem
 */
export function toolingItemToWorkflowItem(toolingItem: ToolingItem): WorkflowItem {
  const contextKey = buildSimulationContextKey(
    toolingItem.location.program,
    toolingItem.location.plant,
    toolingItem.location.unit,
    toolingItem.location.line,
    toolingItem.location.station
  )

  return {
    id: toolingItem.toolingId,
    kind: 'TOOLING',
    simulationContextKey: contextKey,
    name: toolingItem.description ?? toolingItem.toolingNumber,
    itemNumber: toolingItem.toolingNumber,
    equipmentNumber: toolingItem.equipmentNumber,
    handedness: toolingItem.handedness,
    designStageStatus: createUnknownStageSnapshot('DESIGN'),
    simulationStageStatus: createUnknownStageSnapshot('SIMULATION'),
    manufactureStageStatus: createUnknownStageSnapshot('MANUFACTURE'),
    externalSupplierName: toolingItem.supplier,
    metadata: toolingItem.metadata
  }
}

/**
 * Map ToolingWorkflowStatus to WorkflowItem (enriched version with stage data)
 */
export function toolingWorkflowStatusToWorkflowItem(status: ToolingWorkflowStatus): WorkflowItem {
  return {
    id: status.workflowId,
    kind: 'TOOLING',
    simulationContextKey: status.stationKey,
    name: status.toolingNumber,
    itemNumber: status.toolingNumber,
    equipmentNumber: status.equipmentNumber,
    handedness: status.handedness,
    designStageStatus: convertToolingStageSnapshot(status.designStage),
    simulationStageStatus: convertToolingStageSnapshot(status.simulationStage),
    manufactureStageStatus: convertToolingStageSnapshot(status.manufactureStage),
    metadata: status.tool?.metadata
  }
}

/**
 * TODO: Map WeldGun to WorkflowItem
 *
 * @example
 * export function weldGunToWorkflowItem(gun: WeldGun): WorkflowItem {
 *   return {
 *     id: gun.gunId,
 *     kind: 'WELD_GUN',
 *     simulationContextKey: buildSimulationContextKey(...),
 *     name: gun.gunName,
 *     itemNumber: gun.gunId,
 *     designStageStatus: mapGunDesignStage(gun),
 *     simulationStageStatus: mapGunSimStage(gun),
 *     manufactureStageStatus: mapGunMfgStage(gun),
 *     externalSupplierName: gun.supplier,
 *     metadata: { ... }
 *   }
 * }
 */

/**
 * TODO: Map RobotCell to WorkflowItem
 *
 * @example
 * export function robotCellToWorkflowItem(cell: RobotCell): WorkflowItem {
 *   return {
 *     id: cell.cellId,
 *     kind: 'ROBOT_CELL',
 *     simulationContextKey: buildSimulationContextKey(...),
 *     name: cell.cellName,
 *     itemNumber: cell.cellCode,
 *     designStageStatus: mapCellDesignStage(cell),
 *     simulationStageStatus: mapCellSimStage(cell),
 *     manufactureStageStatus: mapCellMfgStage(cell),
 *     metadata: { ... }
 *   }
 * }
 */

/**
 * Build simulation context key from hierarchy components
 */
function buildSimulationContextKey(
  program: string,
  plant: string,
  unit: string,
  line: string,
  station: string
): string {
  return `${program}|${plant}|${unit}|${line}|${station}`
}

/**
 * Create a placeholder stage snapshot when data is not available
 */
function createUnknownStageSnapshot(stage: StageStatusSnapshot['stage']): StageStatusSnapshot {
  return {
    stage,
    status: 'UNKNOWN',
    percentComplete: null
  }
}

/**
 * Convert tooling-specific StageStatusSnapshot to generic workflow StageStatusSnapshot
 */
function convertToolingStageSnapshot(
  toolingStage: ToolingStageStatusSnapshot
): StageStatusSnapshot {
  let workflowStatus: WorkflowStatus = 'UNKNOWN'

  if (toolingStage.status === 'ON_TRACK') {
    workflowStatus = 'IN_PROGRESS'
  }
  if (toolingStage.status === 'AT_RISK') {
    workflowStatus = 'IN_PROGRESS'
  }
  if (toolingStage.status === 'BLOCKED') {
    workflowStatus = 'BLOCKED'
  }

  return {
    stage: toolingStage.stage,
    status: workflowStatus,
    percentComplete: toolingStage.percentComplete,
    owner: toolingStage.owner,
    note: toolingStage.note,
    updatedAt: toolingStage.updatedAt
  }
}
