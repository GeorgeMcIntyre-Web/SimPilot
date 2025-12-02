// Bottleneck Linker
// Tooling-specific wrapper around generic workflow bottleneck engine
// Maintains backward compatibility with existing dashboard

import type {
  BottleneckSnapshot,
  ToolingSnapshot,
  ToolingWorkflowStatus,
  BottleneckReason
} from './toolingTypes'
import { toolingWorkflowStatusToWorkflowItem } from './workflowMappers'
import { analyzeWorkflowItem } from './workflowBottleneckLinker'
import type { WorkflowBottleneckReason } from './workflowTypes'

interface BuildBottleneckSnapshotInput {
  toolingSnapshot: ToolingSnapshot
  workflowStatuses: ToolingWorkflowStatus[]
}

/**
 * Build bottleneck snapshot from tooling workflow statuses
 * Now delegates to generic workflow engine for analysis
 */
export function buildBottleneckSnapshot(input: BuildBottleneckSnapshotInput): BottleneckSnapshot {
  const toolByNumber = new Map<string, ToolingWorkflowStatus['tool']>()

  for (const tool of input.toolingSnapshot.items) {
    toolByNumber.set(tool.toolingNumber, tool)
  }

  const enrichedStatuses = input.workflowStatuses.map(status => {
    const tool = toolByNumber.get(status.toolingNumber)

    // Convert to WorkflowItem and re-analyze with generic engine
    const workflowItem = toolingWorkflowStatusToWorkflowItem(status)
    const workflowBottleneck = analyzeWorkflowItem(workflowItem)

    // Map back to tooling-specific types
    const toolingReason = mapWorkflowReasonToToolingReason(workflowBottleneck.bottleneckReason)
    const severity = mapWorkflowSeverityToToolingSeverity(workflowBottleneck.severity)
    const severityScore = workflowBottleneck.severityScore

    if (tool === undefined) {
      return {
        ...status,
        bottleneckReason: toolingReason,
        severity,
        severityScore
      }
    }

    return {
      ...status,
      tool,
      bottleneckReason: toolingReason,
      severity,
      severityScore
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    workflowStatuses: enrichedStatuses
  }
}

/**
 * Map workflow bottleneck reason to tooling-specific reason
 */
function mapWorkflowReasonToToolingReason(reason: WorkflowBottleneckReason): BottleneckReason {
  if (reason === 'DESIGN_BLOCKED' || reason === 'DESIGN_NOT_DETAILED') {
    return 'DESIGN_BLOCKED'
  }

  if (reason === 'SIM_CHANGES_REQUESTED' || reason === 'SIM_BLOCKED' || reason === 'SIM_NOT_STARTED') {
    return 'SIMULATION_DEFECT'
  }

  if (reason === 'BUILD_AHEAD_OF_SIM' || reason === 'MANUFACTURE_CONSTRAINT' || reason === 'MISSING_ASSETS') {
    return 'MANUFACTURE_CONSTRAINT'
  }

  if (reason === 'SUPPLIER_DELAY') {
    return 'SUPPLIER_DELAY'
  }

  if (reason === 'DATA_GAP' || reason === 'MISSING_REUSE') {
    return 'DATA_GAP'
  }

  return 'UNKNOWN'
}

/**
 * Map workflow severity to tooling severity
 */
function mapWorkflowSeverityToToolingSeverity(
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OK'
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'HIGH'
  if (severity === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

/**
 * Legacy: Derive severity score from status
 * Now delegated to generic workflow engine
 */
export function deriveSeverityScore(status: ToolingWorkflowStatus): number {
  const workflowItem = toolingWorkflowStatusToWorkflowItem(status)
  const workflowBottleneck = analyzeWorkflowItem(workflowItem)
  return workflowBottleneck.severityScore
}

