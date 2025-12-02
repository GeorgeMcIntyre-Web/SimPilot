/**
 * Bottleneck linker
 *
 * Utility helpers to stitch bottleneck snapshots into workflow statuses that
 * the UI can query via selectors.
 */

import {
  type ToolingItem,
  type ToolingSnapshot,
  type BottleneckSnapshot,
  type ToolingWorkflowStatus,
  type WorkflowStage,
  type BottleneckReason,
  type BottleneckSeverity
} from './toolingTypes'

export interface LinkerInput {
  toolingSnapshot: ToolingSnapshot
  bottleneckSnapshot: BottleneckSnapshot | null
}

export function buildWorkflowStatuses({ toolingSnapshot, bottleneckSnapshot }: LinkerInput): ToolingWorkflowStatus[] {
  const bottlenecksById = new Map<string, BottleneckSnapshot['entries'][number]>()

  if (bottleneckSnapshot !== null) {
    for (const record of bottleneckSnapshot.entries) {
      const key = record.toolingId || record.toolingNumber
      if (key) bottlenecksById.set(key, record)
    }
  }

  return toolingSnapshot.items.map<ToolingWorkflowStatus>((item) => {
    const bottleneck = bottlenecksById.get(item.id) ?? bottlenecksById.get(item.toolingNumber)

    const dominantStage: WorkflowStage = bottleneck?.dominantStage ?? 'DESIGN'
    const reason: BottleneckReason | undefined = bottleneck?.reason
    const severity: BottleneckSeverity = bottleneck?.severity ?? 'LOW'

    return {
      id: `workflow-${item.id}`,
      toolingId: item.id,
      toolingNumber: item.toolingNumber,
      dominantStage,
      bottleneckReason: reason,
      severity,
      updatedAt: bottleneckSnapshot?.asOf ?? toolingSnapshot.asOf,
      note: bottleneck?.note
    }
  })
}

export function mapWorkflowStatuses(statuses: ToolingWorkflowStatus[]): Map<string, ToolingWorkflowStatus> {
  const map = new Map<string, ToolingWorkflowStatus>()
  for (const status of statuses) {
    map.set(status.toolingId, status)
  }
  return map
}

export function attachWorkflowStatuses(items: ToolingItem[], statusMap: Map<string, ToolingWorkflowStatus>): Array<{
  item: ToolingItem
  workflow: ToolingWorkflowStatus | null
}> {
  return items.map((item) => ({
    item,
    workflow: statusMap.get(item.id) ?? null
  }))
}
