import { useEffect, useState } from 'react'

export type WorkflowStage = 'DESIGN' | 'SIMULATION'
export type StageStatus = 'ON_TRACK' | 'AT_RISK' | 'BLOCKED'
export type BottleneckSeverity = 'info' | 'warning' | 'critical'
export type BottleneckReason =
  | 'BUILD_AHEAD_OF_SIM'
  | 'SIM_CHANGES_REQUESTED'
  | 'DESIGN_NEEDS_UPDATES'
  | 'ROBOT_PATHS_PENDING'
  | 'WAITING_ON_FIXTURES'
  | 'UNSPECIFIED'

export interface StageSnapshot {
  stage: WorkflowStage
  status: StageStatus
  progress?: number
  updatedAt?: string
}

export interface ToolingWorkflowStatus {
  toolingNumber: string
  toolType: string
  stationKey: string
  stationNumber: string
  dominantStage: WorkflowStage
  bottleneckReason: BottleneckReason
  severity: BottleneckSeverity
  designStage: StageSnapshot
  simulationStage: StageSnapshot
  dominantOwner?: string
  updatedAt?: string
}

export interface ToolingBottleneckSnapshot {
  statuses: ToolingWorkflowStatus[]
}

export interface ToolingBottleneckState {
  statuses: ToolingWorkflowStatus[]
  byStationKey: Record<string, ToolingWorkflowStatus[]>
  byStationNumber: Record<string, ToolingWorkflowStatus[]>
  byToolingNumber: Record<string, ToolingWorkflowStatus>
}

function createEmptyState(): ToolingBottleneckState {
  return {
    statuses: [],
    byStationKey: {},
    byStationNumber: {},
    byToolingNumber: {}
  }
}

let storeState: ToolingBottleneckState = createEmptyState()

const subscribers = new Set<() => void>()

function notifySubscribers(): void {
  subscribers.forEach(callback => callback())
}

function normalizeStationNumber(stationKey: string, provided?: string): string {
  if (provided && provided.length > 0) return provided
  const parts = stationKey.split('|')
  const last = parts[parts.length - 1]
  if (last) return last
  return ''
}

function buildState(statuses: ToolingWorkflowStatus[]): ToolingBottleneckState {
  if (statuses.length === 0) {
    return createEmptyState()
  }

  const byStationKey: Record<string, ToolingWorkflowStatus[]> = {}
  const byStationNumber: Record<string, ToolingWorkflowStatus[]> = {}
  const byToolingNumber: Record<string, ToolingWorkflowStatus> = {}

  for (const status of statuses) {
    const normalizedStationNumber = normalizeStationNumber(status.stationKey, status.stationNumber)
    const statusWithStationNumber: ToolingWorkflowStatus = {
      ...status,
      stationNumber: normalizedStationNumber
    }

    const stationKeyList = byStationKey[status.stationKey] ?? []
    stationKeyList.push(statusWithStationNumber)
    byStationKey[status.stationKey] = stationKeyList

    if (normalizedStationNumber.length > 0) {
      const stationNumberList = byStationNumber[normalizedStationNumber] ?? []
      stationNumberList.push(statusWithStationNumber)
      byStationNumber[normalizedStationNumber] = stationNumberList
    }

    byToolingNumber[status.toolingNumber] = statusWithStationNumber
  }

  return {
    statuses,
    byStationKey,
    byStationNumber,
    byToolingNumber
  }
}

export function createToolingBottleneckState(statuses: ToolingWorkflowStatus[]): ToolingBottleneckState {
  return buildState(statuses)
}

export const toolingBottleneckStore = {
  getState(): ToolingBottleneckState {
    return storeState
  },

  loadSnapshot(snapshot: ToolingBottleneckSnapshot): void {
    const statuses = snapshot?.statuses ?? []
    if (statuses.length === 0) {
      storeState = createEmptyState()
      notifySubscribers()
      return
    }

    storeState = buildState(statuses)
    notifySubscribers()
  },

  clear(): void {
    storeState = createEmptyState()
    notifySubscribers()
  },

  subscribe(callback: () => void): () => void {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }
}

export function useToolingBottleneckState(): ToolingBottleneckState {
  const [state, setState] = useState(storeState)

  useEffect(() => {
    const unsubscribe = toolingBottleneckStore.subscribe(() => {
      setState(toolingBottleneckStore.getState())
    })
    return unsubscribe
  }, [])

  return state
}
