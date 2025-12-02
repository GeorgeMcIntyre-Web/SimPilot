// Bottleneck Linker
// Helper utilities to build enriched bottleneck snapshots

import {
  BottleneckSnapshot,
  ToolingSnapshot,
  ToolingWorkflowStatus,
  WorkflowStage,
  resolveSeverityFromReason
} from './toolingTypes'

interface BuildBottleneckSnapshotInput {
  toolingSnapshot: ToolingSnapshot
  workflowStatuses: ToolingWorkflowStatus[]
}

export function buildBottleneckSnapshot(input: BuildBottleneckSnapshotInput): BottleneckSnapshot {
  const toolByNumber = new Map<string, ToolingWorkflowStatus['tool']>()

  for (const tool of input.toolingSnapshot.items) {
    toolByNumber.set(tool.toolingNumber, tool)
  }

  const enrichedStatuses = input.workflowStatuses.map(status => {
    const tool = toolByNumber.get(status.toolingNumber)
    const severity = status.severity ?? resolveSeverityFromReason(status.bottleneckReason)
    const severityScore = Number.isFinite(status.severityScore)
      ? status.severityScore
      : deriveSeverityScore(status)

    if (tool === undefined) {
      return {
        ...status,
        severity,
        severityScore
      }
    }

    return {
      ...status,
      tool,
      severity,
      severityScore
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    workflowStatuses: enrichedStatuses
  }
}

export function deriveSeverityScore(status: ToolingWorkflowStatus): number {
  const stageSnapshot = getStageSnapshot(status, status.dominantStage)
  const completion = stageSnapshot?.percentComplete ?? 0
  const sanitized = typeof completion === 'number' ? completion : 0
  const inverted = 100 - Math.min(Math.max(sanitized, 0), 100)
  const severityBoost = status.severity === 'HIGH' ? 20 : status.severity === 'MEDIUM' ? 10 : 0
  return Math.min(120, inverted + severityBoost)
}

function getStageSnapshot(
  status: ToolingWorkflowStatus,
  stage: WorkflowStage
) {
  if (stage === 'DESIGN') return status.designStage
  if (stage === 'SIMULATION') return status.simulationStage
  return status.manufactureStage
}
