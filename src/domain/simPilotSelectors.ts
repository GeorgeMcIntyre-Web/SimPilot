import type { SimPilotStoreState } from './simPilotStore'
import type {
  ToolingItem,
  ToolingItemId,
  ToolingWorkflowStatus,
  BottleneckRecord
} from './toolingTypes'

export function selectAllToolingItems(state: SimPilotStoreState): ToolingItem[] {
  return state.toolingSnapshot.items
}

export function selectToolingWorkflowById(
  state: SimPilotStoreState,
  toolingId: ToolingItemId
): ToolingWorkflowStatus | null {
  const match = state.workflowStatuses.find((status) => status.toolingId === toolingId)
  if (match === undefined) return null
  return match
}

export function selectBottlenecksForToolingNumber(
  state: SimPilotStoreState,
  toolingNumber: string
): BottleneckRecord[] {
  const snapshot = state.bottleneckSnapshot
  if (snapshot === null) return []

  return snapshot.entries.filter((entry) => {
    if (entry.toolingNumber === toolingNumber) return true
    return entry.toolingId === toolingNumber
  })
}

export function selectWorkflowIndex(state: SimPilotStoreState): Map<string, ToolingWorkflowStatus> {
  const map = new Map<string, ToolingWorkflowStatus>()
  for (const status of state.workflowStatuses) {
    map.set(status.toolingId, status)
  }
  return map
}
