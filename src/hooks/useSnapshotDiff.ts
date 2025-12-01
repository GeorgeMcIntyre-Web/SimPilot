// Snapshot Diff Hooks
// React hooks for accessing and computing snapshot diffs

import { useState, useMemo } from 'react'
import {
  DailySnapshot,
  SnapshotDiff,
  SnapshotRef
} from '../domain/history/snapshotTypes'
import { buildSnapshotDiff, describeDiffSummary } from '../domain/history/snapshotDiff'
import {
  useProjectSnapshots,
  useProjectSnapshotRefs,
  useSnapshot,
  useLatestSnapshot
} from '../domain/history/snapshotStore'

// Re-export hooks from store for convenience
export {
  useProjectSnapshots,
  useProjectSnapshotRefs,
  useSnapshot,
  useLatestSnapshot
}

// ============================================================================
// DIFF HOOKS
// ============================================================================

/**
 * Hook to compute diff between two snapshots
 */
export function useSnapshotDiff(
  fromSnapshotId: string | undefined,
  toSnapshotId: string | undefined
): SnapshotDiff | null {
  const fromSnapshot = useSnapshot(fromSnapshotId)
  const toSnapshot = useSnapshot(toSnapshotId)
  
  return useMemo(() => {
    if (!fromSnapshot || !toSnapshot) return null
    return buildSnapshotDiff(fromSnapshot, toSnapshot)
  }, [fromSnapshot, toSnapshot])
}

/**
 * Hook to get diff between latest and previous snapshot
 */
export function useLatestDiff(projectId: string): {
  diff: SnapshotDiff | null
  latestSnapshot: DailySnapshot | undefined
  previousSnapshot: DailySnapshot | undefined
} {
  const snapshots = useProjectSnapshots(projectId)
  
  return useMemo(() => {
    if (snapshots.length < 2) {
      return {
        diff: null,
        latestSnapshot: snapshots[0],
        previousSnapshot: undefined
      }
    }
    
    const latest = snapshots[0]
    const previous = snapshots[1]
    const diff = buildSnapshotDiff(previous, latest)
    
    return { diff, latestSnapshot: latest, previousSnapshot: previous }
  }, [snapshots])
}

/**
 * Hook to get human-readable diff summary
 */
export function useDiffSummaryText(
  fromSnapshotId: string | undefined,
  toSnapshotId: string | undefined
): string | null {
  const diff = useSnapshotDiff(fromSnapshotId, toSnapshotId)
  
  return useMemo(() => {
    if (!diff) return null
    return describeDiffSummary(diff.summary)
  }, [diff])
}

// ============================================================================
// TIMELINE HOOKS
// ============================================================================

/**
 * Timeline entry for display
 */
export interface TimelineEntry {
  snapshot: SnapshotRef
  diff: SnapshotDiff | null
  summaryText: string
}

/**
 * Hook to get a timeline of snapshots with diffs
 */
export function useSnapshotTimeline(projectId: string): TimelineEntry[] {
  const snapshots = useProjectSnapshots(projectId)
  
  return useMemo(() => {
    const timeline: TimelineEntry[] = []
    
    for (let i = 0; i < snapshots.length; i++) {
      const current = snapshots[i]
      const previous = snapshots[i + 1]
      
      const diff = previous
        ? buildSnapshotDiff(previous, current)
        : null
      
      timeline.push({
        snapshot: {
          id: current.id,
          projectId: current.projectId,
          capturedAt: current.capturedAt,
          capturedBy: current.capturedBy,
          cellCount: current.stats.totalCells,
          avgCompletion: current.stats.avgCompletion,
          atRiskCount: current.stats.atRiskCellCount,
          description: current.description
        },
        diff,
        summaryText: diff
          ? describeDiffSummary(diff.summary)
          : 'Initial snapshot'
      })
    }
    
    return timeline
  }, [snapshots])
}

// ============================================================================
// COMPARISON HOOKS
// ============================================================================

/**
 * State for snapshot comparison selection
 */
export interface ComparisonState {
  fromId: string | null
  toId: string | null
  setFrom: (id: string | null) => void
  setTo: (id: string | null) => void
  swap: () => void
  diff: SnapshotDiff | null
  isValid: boolean
}

/**
 * Hook for managing snapshot comparison state
 */
export function useSnapshotComparison(_projectId: string): ComparisonState {
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  
  const diff = useSnapshotDiff(fromId ?? undefined, toId ?? undefined)
  
  const swap = () => {
    const temp = fromId
    setFromId(toId)
    setToId(temp)
  }
  
  return {
    fromId,
    toId,
    setFrom: setFromId,
    setTo: setToId,
    swap,
    diff,
    isValid: fromId !== null && toId !== null && fromId !== toId
  }
}

// ============================================================================
// HISTORY STATS HOOKS
// ============================================================================

/**
 * Summary of project history
 */
export interface ProjectHistoryStats {
  snapshotCount: number
  firstSnapshotDate: string | null
  lastSnapshotDate: string | null
  avgCompletionTrend: number | null // positive = improving
  resolvedFlagsTotal: number
  newFlagsTotal: number
}

/**
 * Hook to get history statistics for a project
 */
export function useProjectHistoryStats(projectId: string): ProjectHistoryStats {
  const timeline = useSnapshotTimeline(projectId)
  
  return useMemo(() => {
    if (timeline.length === 0) {
      return {
        snapshotCount: 0,
        firstSnapshotDate: null,
        lastSnapshotDate: null,
        avgCompletionTrend: null,
        resolvedFlagsTotal: 0,
        newFlagsTotal: 0
      }
    }
    
    let resolvedFlagsTotal = 0
    let newFlagsTotal = 0
    let completionDeltas: number[] = []
    
    for (const entry of timeline) {
      if (!entry.diff) continue
      
      resolvedFlagsTotal += entry.diff.summary.resolvedFlagsCount
      newFlagsTotal += entry.diff.summary.newFlagsCount
      
      if (entry.diff.summary.avgCompletionDelta !== undefined) {
        completionDeltas.push(entry.diff.summary.avgCompletionDelta)
      }
    }
    
    const avgCompletionTrend = completionDeltas.length > 0
      ? completionDeltas.reduce((a, b) => a + b, 0) / completionDeltas.length
      : null
    
    return {
      snapshotCount: timeline.length,
      firstSnapshotDate: timeline[timeline.length - 1]?.snapshot.capturedAt ?? null,
      lastSnapshotDate: timeline[0]?.snapshot.capturedAt ?? null,
      avgCompletionTrend,
      resolvedFlagsTotal,
      newFlagsTotal
    }
  }, [timeline])
}
