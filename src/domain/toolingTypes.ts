// Tooling Types
// Shared domain contracts for tooling and bottleneck snapshots

export type WorkflowStage = 'DESIGN' | 'SIMULATION' | 'MANUFACTURE'

export type BottleneckReason =
  | 'DESIGN_BLOCKED'
  | 'SIMULATION_DEFECT'
  | 'MANUFACTURE_CONSTRAINT'
  | 'SUPPLIER_DELAY'
  | 'DATA_GAP'
  | 'UNKNOWN'

export type BottleneckSeverity = 'HIGH' | 'MEDIUM' | 'LOW'

export interface ToolingLocation {
  program: string
  plant: string
  unit: string
  line: string
  station: string
  area: string
}

export interface StageStatusSnapshot {
  stage: WorkflowStage
  percentComplete: number | null
  status: 'ON_TRACK' | 'AT_RISK' | 'BLOCKED'
  owner?: string
  note?: string
  updatedAt?: string
}

export interface ToolingItem {
  toolingId: string
  toolingNumber: string
  equipmentNumber?: string
  handedness?: 'LH' | 'RH' | 'PAIR' | 'NA'
  location: ToolingLocation
  description?: string
  supplier?: string
  owner?: string
  metadata: Record<string, string | number | boolean | null | undefined>
}

export interface ToolingWorkflowStatus {
  workflowId: string
  toolingNumber: string
  equipmentNumber?: string
  handedness?: 'LH' | 'RH' | 'PAIR' | 'NA'
  stationKey: string
  program: string
  area: string
  station: string
  location: ToolingLocation
  designStage: StageStatusSnapshot
  simulationStage: StageStatusSnapshot
  manufactureStage: StageStatusSnapshot
  dominantStage: WorkflowStage
  bottleneckReason: BottleneckReason
  severity: BottleneckSeverity
  severityScore: number
  tool?: ToolingItem
}

export interface ToolingSnapshot {
  updatedAt: string
  items: ToolingItem[]
}

export interface BottleneckSnapshot {
  generatedAt: string
  workflowStatuses: ToolingWorkflowStatus[]
}

export function resolveSeverityFromReason(reason: BottleneckReason): BottleneckSeverity {
  if (reason === 'DESIGN_BLOCKED' || reason === 'SIMULATION_DEFECT') {
    return 'HIGH'
  }

  if (reason === 'MANUFACTURE_CONSTRAINT' || reason === 'SUPPLIER_DELAY') {
    return 'MEDIUM'
  }

  if (reason === 'DATA_GAP') {
    return 'LOW'
  }

  return 'LOW'
}

export function createEmptyToolingSnapshot(): ToolingSnapshot {
  return {
    updatedAt: new Date().toISOString(),
    items: []
  }
}

export function createEmptyBottleneckSnapshot(): BottleneckSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    workflowStatuses: []
  }
}
