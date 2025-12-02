/**
 * useBottleneckOverview Hook
 *
 * Provides unified access to bottleneck data for the dashboard.
 * Wraps the domain bottleneck engine with UI-friendly selectors.
 */

import { useMemo } from 'react'
import { useSimPilotStore } from '../../../domain/simPilotStore'
import {
  selectWorstBottlenecks,
  selectWorkflowBottleneckStats
} from '../../../domain/simPilotSelectors'
import type { ToolingWorkflowStatus, WorkflowStage, BottleneckReason } from '../../../domain/toolingTypes'
import type { BottleneckSeverity } from '../../../domain/workflowTypes'

export interface BottleneckOverviewResult {
  /** Is data currently loading */
  isLoading: boolean
  /** Is there any snapshot data available */
  hasData: boolean
  /** Top bottlenecks sorted by severity (configurable limit) */
  bottlenecks: ToolingWorkflowStatus[]
  /** Summary counts */
  summary: BottleneckSummary
  /** Last update timestamp */
  updatedAt: string | null
}

export interface BottleneckSummary {
  total: number
  high: number
  medium: number
  low: number
  byStage: Record<WorkflowStage, number>
}

export interface UseBottleneckOverviewOptions {
  /** Maximum number of bottlenecks to return (default: 25) */
  limit?: number
  /** Filter by workflow stage */
  stageFilter?: WorkflowStage | 'ALL'
  /** Filter by bottleneck reasons */
  reasonFilter?: BottleneckReason[]
}

/**
 * Hook providing bottleneck overview data for dashboard display
 */
export function useBottleneckOverview(
  options: UseBottleneckOverviewOptions = {}
): BottleneckOverviewResult {
  const { limit = 25, stageFilter = 'ALL', reasonFilter = [] } = options
  const simPilotState = useSimPilotStore()

  const isLoading = simPilotState.isLoading
  const hasData = simPilotState.snapshot !== null

  const worstBottlenecks = useMemo(() => {
    return selectWorstBottlenecks(simPilotState, limit)
  }, [simPilotState, limit])

  const filteredBottlenecks = useMemo(() => {
    return worstBottlenecks.filter(status => {
      if (stageFilter !== 'ALL' && status.dominantStage !== stageFilter) {
        return false
      }
      if (reasonFilter.length > 0 && !reasonFilter.includes(status.bottleneckReason)) {
        return false
      }
      return true
    })
  }, [worstBottlenecks, stageFilter, reasonFilter])

  const summary = useMemo(() => {
    const counts: BottleneckSummary = {
      total: worstBottlenecks.length,
      high: 0,
      medium: 0,
      low: 0,
      byStage: {
        DESIGN: 0,
        SIMULATION: 0,
        MANUFACTURE: 0
      }
    }

    for (const status of worstBottlenecks) {
      // Count by severity
      const severity = status.severity
      if (severity === 'HIGH') {
        counts.high += 1
      }
      if (severity === 'MEDIUM') {
        counts.medium += 1
      }
      if (severity === 'LOW') {
        counts.low += 1
      }

      // Count by stage
      const stage = status.dominantStage
      if (stage in counts.byStage) {
        counts.byStage[stage] += 1
      }
    }

    return counts
  }, [worstBottlenecks])

  const updatedAt = simPilotState.snapshot?.bottleneckSnapshot.generatedAt ?? null

  return {
    isLoading,
    hasData,
    bottlenecks: filteredBottlenecks,
    summary,
    updatedAt
  }
}

/**
 * Hook returning workflow bottleneck statistics from the generic engine
 */
export function useWorkflowBottleneckStats() {
  const simPilotState = useSimPilotStore()

  const stats = useMemo(() => {
    return selectWorkflowBottleneckStats(simPilotState)
  }, [simPilotState])

  return stats
}

/**
 * Derive severity label from bottleneck reason (legacy compatibility)
 */
export function deriveSeverityFromReason(reason: BottleneckReason): BottleneckSeverity {
  if (reason === 'DESIGN_BLOCKED' || reason === 'SIMULATION_DEFECT') {
    return 'HIGH'
  }
  if (reason === 'MANUFACTURE_CONSTRAINT' || reason === 'SUPPLIER_DELAY') {
    return 'MEDIUM'
  }
  return 'LOW'
}
