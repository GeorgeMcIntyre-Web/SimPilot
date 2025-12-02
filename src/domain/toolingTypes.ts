/**
 * Tooling domain types
 *
 * Defines all enums and interfaces required for the tooling workflow view.
 */

export type ToolingItemId = string

export type ToolHandedness = 'RH' | 'LH' | 'BOTH' | 'NA'

export type ToolingDesignStage =
  | 'NOT_STARTED'
  | 'LAYOUT_ONLY'
  | 'SIM_LAYOUT'
  | 'SIM_READY'
  | 'RELEASED'

export type WorkflowStage = 'DESIGN' | 'SIMULATION' | 'MANUFACTURE'

export type BottleneckSeverity = 'LOW' | 'MEDIUM' | 'HIGH'

export type BottleneckReason =
  | 'DATA_GAP'
  | 'STAFFING'
  | 'HARDWARE_DELAY'
  | 'SCOPE_CHANGE'
  | 'QUALITY'
  | 'NONE'

export interface SimulationContext {
  program: string
  plant?: string
  unit?: string
  area?: string
  station?: string
}

export interface ToolingTimeline {
  simulationDue?: string
  olpDue?: string
  documentationDue?: string
  safetyLayoutDue?: string
}

export interface ToolingSimulationStatus {
  state: 'NOT_STARTED' | 'PLANNING' | 'IN_PROGRESS' | 'COMPLETE'
  percentComplete?: number
  shortLabel: string
}

export interface ToolingItem {
  id: ToolingItemId
  toolingNumber: string
  equipmentNumbers: string[]
  gaDescription: string
  toolType: string
  equipmentType?: string
  handedness: ToolHandedness
  designStage: ToolingDesignStage
  simulationStatus: ToolingSimulationStatus
  hasAssets: boolean
  hasReusePlan: boolean
  reusePlanNotes?: string
  context: SimulationContext
  timeline: ToolingTimeline
  simulationApps: string[]
  simulationMethods: string[]
  specialFunctions: string[]
  workflowStatusId?: string
}

export interface ToolingSnapshot {
  asOf: string
  items: ToolingItem[]
  source?: string
}

export interface BottleneckRecord {
  toolingId: ToolingItemId
  toolingNumber: string
  dominantStage: WorkflowStage
  reason: BottleneckReason
  severity: BottleneckSeverity
  note?: string
}

export interface BottleneckSnapshot {
  asOf: string
  entries: BottleneckRecord[]
}

export interface ToolingWorkflowStatus {
  id: string
  toolingId: ToolingItemId
  toolingNumber: string
  dominantStage: WorkflowStage
  bottleneckReason?: BottleneckReason
  severity: BottleneckSeverity
  updatedAt: string
  owner?: string
  note?: string
}

export function isBottleneckActive(status: ToolingWorkflowStatus | null | undefined): boolean {
  if (status === null || status === undefined) return false
  return status.bottleneckReason !== undefined && status.bottleneckReason !== 'NONE'
}
