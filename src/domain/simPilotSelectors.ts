// SimPilot Selectors
// Pure helpers that operate on SimPilotStoreState

import type { SimPilotStoreState } from './simPilotStore'
import type { ToolingWorkflowStatus, WorkflowStage } from './toolingTypes'

const SEVERITY_PRIORITY: Record<ToolingWorkflowStatus['severity'], number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
}

export function selectWorstBottlenecks(
  state: SimPilotStoreState,
  limit = 5
): ToolingWorkflowStatus[] {
  const statuses = state.snapshot?.bottleneckSnapshot.workflowStatuses
  if (statuses === undefined || statuses.length === 0) {
    return []
  }

  const sorted = [...statuses].sort((a, b) => {
    const severityDiff = SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity]
    if (severityDiff !== 0) return severityDiff
    return b.severityScore - a.severityScore
  })

  return sorted.slice(0, limit)
}

export function selectBottlenecksByStationKey(
  state: SimPilotStoreState,
  stationKey: string
): ToolingWorkflowStatus[] {
  const trimmed = stationKey.trim()
  if (trimmed.length === 0) {
    return []
  }

  const statuses = state.snapshot?.bottleneckSnapshot.workflowStatuses
  if (statuses === undefined || statuses.length === 0) {
    return []
  }

  return statuses.filter(status => status.stationKey === trimmed)
}

export function selectBottlenecksForToolingNumber(
  state: SimPilotStoreState,
  toolingNumber: string
): ToolingWorkflowStatus[] {
  const trimmed = toolingNumber.trim()
  if (trimmed.length === 0) {
    return []
  }

  const statuses = state.snapshot?.bottleneckSnapshot.workflowStatuses
  if (statuses === undefined || statuses.length === 0) {
    return []
  }

  return statuses.filter(status => status.toolingNumber === trimmed)
}

export function selectBottlenecksByStage(
  state: SimPilotStoreState,
  stage: WorkflowStage
): ToolingWorkflowStatus[] {
  const statuses = state.snapshot?.bottleneckSnapshot.workflowStatuses
  if (statuses === undefined || statuses.length === 0) {
    return []
  }

  return statuses.filter(status => status.dominantStage === stage)
}
