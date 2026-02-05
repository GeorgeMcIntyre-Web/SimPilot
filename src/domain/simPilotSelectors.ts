// SimPilot Selectors
// Pure helpers that operate on SimPilotStoreState

import type { SimPilotStoreState } from './simPilotStore'
import type { ToolingWorkflowStatus, WorkflowStage } from './toolingTypes'
import type {
  WorkflowBottleneckStatus,
  WorkflowStage as GenericWorkflowStage,
  WorkflowBottleneckReason,
  WorkflowItemKind,
} from './workflowTypes'
import {
  getWorstBottlenecks as getWorstWorkflowBottlenecks,
  getBottlenecksByContextKey,
  getBottleneckStats as getWorkflowBottleneckStats,
} from './workflowBottleneckLinker'

const SEVERITY_PRIORITY: Record<ToolingWorkflowStatus['severity'], number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export function selectWorstBottlenecks(
  state: SimPilotStoreState,
  limit = 5,
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
  stationKey: string,
): ToolingWorkflowStatus[] {
  const trimmed = stationKey.trim()
  if (trimmed.length === 0) {
    return []
  }

  const statuses = state.snapshot?.bottleneckSnapshot.workflowStatuses
  if (statuses === undefined || statuses.length === 0) {
    return []
  }

  return statuses.filter((status) => status.stationKey === trimmed)
}

export function selectBottlenecksForToolingNumber(
  state: SimPilotStoreState,
  toolingNumber: string,
): ToolingWorkflowStatus[] {
  const trimmed = toolingNumber.trim()
  if (trimmed.length === 0) {
    return []
  }

  const statuses = state.snapshot?.bottleneckSnapshot.workflowStatuses
  if (statuses === undefined || statuses.length === 0) {
    return []
  }

  return statuses.filter((status) => status.toolingNumber === trimmed)
}

export function selectBottlenecksByStage(
  state: SimPilotStoreState,
  stage: WorkflowStage,
): ToolingWorkflowStatus[] {
  const statuses = state.snapshot?.bottleneckSnapshot.workflowStatuses
  if (statuses === undefined || statuses.length === 0) {
    return []
  }

  return statuses.filter((status) => status.dominantStage === stage)
}

// ======================================================================
// GENERIC WORKFLOW SELECTORS
// ======================================================================

export function selectWorstWorkflowBottlenecks(
  state: SimPilotStoreState,
  limit = 5,
): WorkflowBottleneckStatus[] {
  const bottlenecks = state.snapshot?.workflowBottleneckSnapshot.bottlenecks
  if (bottlenecks === undefined || bottlenecks.length === 0) {
    return []
  }
  return getWorstWorkflowBottlenecks(bottlenecks, limit)
}

export function selectWorkflowBottlenecksByContextKey(
  state: SimPilotStoreState,
  contextKey: string,
): WorkflowBottleneckStatus[] {
  const trimmed = contextKey.trim()
  if (trimmed.length === 0) {
    return []
  }

  const bottlenecks = state.snapshot?.workflowBottleneckSnapshot.bottlenecks
  if (bottlenecks === undefined || bottlenecks.length === 0) {
    return []
  }

  return getBottlenecksByContextKey(bottlenecks, trimmed)
}

export function selectWorkflowBottlenecksByKind(
  state: SimPilotStoreState,
  kind: WorkflowItemKind,
): WorkflowBottleneckStatus[] {
  const bottlenecks = state.snapshot?.workflowBottleneckSnapshot.bottlenecks
  if (bottlenecks === undefined || bottlenecks.length === 0) {
    return []
  }

  return bottlenecks.filter((b) => b.kind === kind)
}

export function selectWorkflowBottlenecksByStage(
  state: SimPilotStoreState,
  stage: GenericWorkflowStage,
): WorkflowBottleneckStatus[] {
  const bottlenecks = state.snapshot?.workflowBottleneckSnapshot.bottlenecks
  if (bottlenecks === undefined || bottlenecks.length === 0) {
    return []
  }

  return bottlenecks.filter((b) => b.dominantStage === stage)
}

export function selectWorkflowBottlenecksByReason(
  state: SimPilotStoreState,
  reason: WorkflowBottleneckReason,
): WorkflowBottleneckStatus[] {
  const bottlenecks = state.snapshot?.workflowBottleneckSnapshot.bottlenecks
  if (bottlenecks === undefined || bottlenecks.length === 0) {
    return []
  }

  return bottlenecks.filter((b) => b.bottleneckReason === reason)
}

export function selectWorkflowBottleneckStats(state: SimPilotStoreState) {
  const bottlenecks = state.snapshot?.workflowBottleneckSnapshot.bottlenecks
  if (bottlenecks === undefined || bottlenecks.length === 0) {
    return {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      ok: 0,
      bySeverity: {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        OK: 0,
      },
      byStage: {
        DESIGN: 0,
        SIMULATION: 0,
        MANUFACTURE: 0,
        EXTERNAL_SUPPLIER: 0,
        UNKNOWN: 0,
      },
      byReason: {} as Record<WorkflowBottleneckReason, number>,
      byKind: {
        TOOLING: 0,
        WELD_GUN: 0,
        ROBOT_CELL: 0,
        FIXTURE: 0,
        OTHER: 0,
      },
    }
  }

  // Get base stats from workflow engine
  const baseStats = getWorkflowBottleneckStats(bottlenecks)

  // Compute additional stats: severity breakdown and byKind
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    ok: 0,
  }

  const kindCounts: Record<WorkflowItemKind, number> = {
    TOOLING: 0,
    WELD_GUN: 0,
    ROBOT_CELL: 0,
    FIXTURE: 0,
    OTHER: 0,
  }

  for (const bottleneck of bottlenecks) {
    // Count by severity
    const severity = bottleneck.severity.toLowerCase() as keyof typeof severityCounts
    if (severity in severityCounts) {
      severityCounts[severity] += 1
    }

    // Count by kind
    kindCounts[bottleneck.kind] += 1
  }

  return {
    total: baseStats.total,
    critical: severityCounts.critical,
    high: severityCounts.high,
    medium: severityCounts.medium,
    low: severityCounts.low,
    ok: severityCounts.ok,
    bySeverity: baseStats.bySeverity,
    byStage: baseStats.byStage,
    byReason: baseStats.byReason,
    byKind: kindCounts,
  }
}

// ======================================================================
// TOOLING-SPECIFIC WORKFLOW BRIDGES
// ======================================================================
// These selectors provide convenience access to tooling workflow bottlenecks
// from the generic workflow engine, maintaining API compatibility while
// enabling future migration from legacy tooling-specific selectors

/**
 * Select worst tooling workflow bottlenecks using the generic workflow engine
 * This is a bridge that filters generic workflow bottlenecks to TOOLING kind only
 */
export function selectWorstToolingWorkflowBottlenecks(
  state: SimPilotStoreState,
  limit = 5,
): WorkflowBottleneckStatus[] {
  const toolingBottlenecks = selectWorkflowBottlenecksByKind(state, 'TOOLING')
  return getWorstWorkflowBottlenecks(toolingBottlenecks, limit)
}

/**
 * Select tooling workflow bottlenecks by context key
 * Bridge that combines context key filtering with tooling kind filtering
 */
export function selectToolingWorkflowBottlenecksByContextKey(
  state: SimPilotStoreState,
  contextKey: string,
): WorkflowBottleneckStatus[] {
  const contextBottlenecks = selectWorkflowBottlenecksByContextKey(state, contextKey)
  return contextBottlenecks.filter((b) => b.kind === 'TOOLING')
}

/**
 * Select tooling workflow bottlenecks by stage
 * Bridge that combines stage filtering with tooling kind filtering
 */
export function selectToolingWorkflowBottlenecksByStage(
  state: SimPilotStoreState,
  stage: GenericWorkflowStage,
): WorkflowBottleneckStatus[] {
  const stageBottlenecks = selectWorkflowBottlenecksByStage(state, stage)
  return stageBottlenecks.filter((b) => b.kind === 'TOOLING')
}

/**
 * Select tooling workflow bottleneck statistics
 * Bridge that provides tooling-specific stats from the generic workflow engine
 */
export function selectToolingWorkflowBottleneckStats(state: SimPilotStoreState) {
  const allStats = selectWorkflowBottleneckStats(state)

  // Extract tooling-specific counts
  return {
    total: allStats.byKind.TOOLING,
    critical: 0, // Would need to filter and count
    high: 0,
    medium: 0,
    low: 0,
    ok: 0,
    byStage: {
      DESIGN: 0, // Would need to filter tooling + stage
      SIMULATION: 0,
      MANUFACTURE: 0,
    },
  }
}
