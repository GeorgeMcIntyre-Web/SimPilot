// Snapshot Store
// In-memory store for managing daily snapshots
// Integrates with IndexedDB for persistence

import { useState, useEffect } from 'react'
import {
  DailySnapshot,
  SnapshotRef,
  SnapshotStats,
  toSnapshotRef
} from './snapshotTypes'
import { CellSnapshot, CellHealthSummary, CrossRefFlag } from '../crossRef/CrossRefTypes'
import { buildCellHealthSummaries } from '../crossRef/CellHealthSummary'

// ============================================================================
// STORE STATE
// ============================================================================

interface SnapshotStoreState {
  /** All snapshots by project ID */
  snapshotsByProject: Map<string, DailySnapshot[]>
  
  /** Quick lookup by snapshot ID */
  snapshotsById: Map<string, DailySnapshot>
  
  /** Loading state */
  isLoading: boolean
  
  /** Last error */
  lastError: string | null
}

let storeState: SnapshotStoreState = {
  snapshotsByProject: new Map(),
  snapshotsById: new Map(),
  isLoading: false,
  lastError: null
}

// Subscribers for reactive updates
const subscribers = new Set<() => void>()

function notifySubscribers(): void {
  subscribers.forEach(callback => callback())
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate a unique snapshot ID based on timestamp and project
 */
export function generateSnapshotId(projectId: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `snap_${projectId}_${timestamp}_${random}`
}

/**
 * Generate a content-based hash for deduplication
 */
export function hashSnapshotContent(cells: CellSnapshot[]): string {
  // Simple hash based on station keys and their data
  const contentStr = cells
    .map(c => `${c.stationKey}:${c.simulationStatus?.firstStageCompletion ?? 0}`)
    .sort()
    .join('|')
  
  // Simple djb2 hash
  let hash = 5381
  for (let i = 0; i < contentStr.length; i++) {
    hash = ((hash << 5) + hash) + contentStr.charCodeAt(i)
  }
  
  return (hash >>> 0).toString(36)
}

// ============================================================================
// SNAPSHOT CREATION
// ============================================================================

/**
 * Create a new DailySnapshot from CrossRef cells
 */
export function createDailySnapshot(
  projectId: string,
  cells: CellSnapshot[],
  globalFlags: CrossRefFlag[],
  options: {
    capturedBy?: string
    sourceFiles?: string[]
    description?: string
  } = {}
): DailySnapshot {
  const healthSummaries = buildCellHealthSummaries(cells)
  const stats = computeSnapshotStats(cells, healthSummaries, globalFlags)
  
  return {
    id: generateSnapshotId(projectId),
    projectId,
    capturedAt: new Date().toISOString(),
    capturedBy: options.capturedBy ?? 'system',
    sourceFiles: options.sourceFiles ?? [],
    cells,
    healthSummaries,
    globalFlags,
    stats,
    description: options.description
  }
}

/**
 * Compute statistics for a snapshot
 */
function computeSnapshotStats(
  cells: CellSnapshot[],
  healthSummaries: CellHealthSummary[],
  globalFlags: CrossRefFlag[]
): SnapshotStats {
  let totalFlags = globalFlags.length
  let robotCount = 0
  let toolCount = 0
  let weldGunCount = 0
  let riserCount = 0
  let atRiskCellCount = 0
  let completionSum = 0
  let completionCount = 0
  
  for (const cell of cells) {
    totalFlags += cell.flags?.length ?? 0
    robotCount += cell.robots?.length ?? 0
    toolCount += cell.tools?.length ?? 0
    weldGunCount += cell.weldGuns?.length ?? 0
    riserCount += cell.risers?.length ?? 0
    
    // Completion tracking
    const completion = cell.simulationStatus?.firstStageCompletion
    if (completion !== undefined && completion !== null) {
      completionSum += completion
      completionCount++
    }
  }
  
  // Count at-risk cells from health summaries
  for (const summary of healthSummaries) {
    if (summary.riskLevel === 'AT_RISK' || summary.riskLevel === 'CRITICAL') {
      atRiskCellCount++
    }
  }
  
  const cellsWithRisks = cells.filter(c => c.flags && c.flags.length > 0).length
  
  return {
    totalCells: cells.length,
    cellsWithRisks,
    totalFlags,
    robotCount,
    toolCount,
    weldGunCount,
    riserCount,
    avgCompletion: completionCount > 0
      ? Math.round(completionSum / completionCount)
      : undefined,
    atRiskCellCount
  }
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

export const snapshotStore = {
  /**
   * Get current state
   */
  getState(): SnapshotStoreState {
    return storeState
  },
  
  /**
   * Add a new snapshot
   */
  addSnapshot(snapshot: DailySnapshot): void {
    const projectSnapshots = storeState.snapshotsByProject.get(snapshot.projectId) ?? []
    
    // Insert sorted by capturedAt (newest first)
    const newSnapshots = [...projectSnapshots, snapshot].sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
    )
    
    storeState = {
      ...storeState,
      snapshotsByProject: new Map(storeState.snapshotsByProject).set(
        snapshot.projectId,
        newSnapshots
      ),
      snapshotsById: new Map(storeState.snapshotsById).set(snapshot.id, snapshot)
    }
    
    notifySubscribers()
  },
  
  /**
   * Get all snapshots for a project
   */
  getProjectSnapshots(projectId: string): DailySnapshot[] {
    return storeState.snapshotsByProject.get(projectId) ?? []
  },
  
  /**
   * Get snapshot refs for a project (lightweight for timeline)
   */
  getProjectSnapshotRefs(projectId: string): SnapshotRef[] {
    const snapshots = this.getProjectSnapshots(projectId)
    return snapshots.map(toSnapshotRef)
  },
  
  /**
   * Get a specific snapshot by ID
   */
  getSnapshot(snapshotId: string): DailySnapshot | undefined {
    return storeState.snapshotsById.get(snapshotId)
  },
  
  /**
   * Get the latest snapshot for a project
   */
  getLatestSnapshot(projectId: string): DailySnapshot | undefined {
    const snapshots = this.getProjectSnapshots(projectId)
    return snapshots[0] // Already sorted newest first
  },
  
  /**
   * Get the previous snapshot (before the given one)
   */
  getPreviousSnapshot(snapshotId: string): DailySnapshot | undefined {
    const snapshot = this.getSnapshot(snapshotId)
    if (!snapshot) return undefined
    
    const snapshots = this.getProjectSnapshots(snapshot.projectId)
    const index = snapshots.findIndex(s => s.id === snapshotId)
    
    if (index < 0 || index >= snapshots.length - 1) return undefined
    return snapshots[index + 1]
  },
  
  /**
   * Load snapshots from persistence (called on app init)
   */
  loadSnapshots(snapshots: DailySnapshot[]): void {
    const byProject = new Map<string, DailySnapshot[]>()
    const byId = new Map<string, DailySnapshot>()
    
    for (const snapshot of snapshots) {
      byId.set(snapshot.id, snapshot)
      
      const projectSnapshots = byProject.get(snapshot.projectId) ?? []
      projectSnapshots.push(snapshot)
      byProject.set(snapshot.projectId, projectSnapshots)
    }
    
    // Sort each project's snapshots by date (newest first)
    for (const [projectId, projectSnapshots] of byProject) {
      byProject.set(
        projectId,
        projectSnapshots.sort(
          (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
        )
      )
    }
    
    storeState = {
      snapshotsByProject: byProject,
      snapshotsById: byId,
      isLoading: false,
      lastError: null
    }
    
    notifySubscribers()
  },
  
  /**
   * Clear all snapshots (for a project or all)
   */
  clear(projectId?: string): void {
    if (projectId) {
      const snapshots = storeState.snapshotsByProject.get(projectId) ?? []
      const newById = new Map(storeState.snapshotsById)
      
      for (const snapshot of snapshots) {
        newById.delete(snapshot.id)
      }
      
      const newByProject = new Map(storeState.snapshotsByProject)
      newByProject.delete(projectId)
      
      storeState = {
        ...storeState,
        snapshotsByProject: newByProject,
        snapshotsById: newById
      }
    } else {
      storeState = {
        snapshotsByProject: new Map(),
        snapshotsById: new Map(),
        isLoading: false,
        lastError: null
      }
    }
    
    notifySubscribers()
  },
  
  /**
   * Subscribe to store changes
   */
  subscribe(callback: () => void): () => void {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  },
  
  /**
   * Get all snapshots (for persistence)
   */
  getAllSnapshots(): DailySnapshot[] {
    return Array.from(storeState.snapshotsById.values())
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to access project snapshots
 */
export function useProjectSnapshots(projectId: string): DailySnapshot[] {
  const [snapshots, setSnapshots] = useState<DailySnapshot[]>(
    snapshotStore.getProjectSnapshots(projectId)
  )
  
  useEffect(() => {
    const unsubscribe = snapshotStore.subscribe(() => {
      setSnapshots(snapshotStore.getProjectSnapshots(projectId))
    })
    return unsubscribe
  }, [projectId])
  
  return snapshots
}

/**
 * Hook to access project snapshot refs (lightweight)
 */
export function useProjectSnapshotRefs(projectId: string): SnapshotRef[] {
  const [refs, setRefs] = useState<SnapshotRef[]>(
    snapshotStore.getProjectSnapshotRefs(projectId)
  )
  
  useEffect(() => {
    const unsubscribe = snapshotStore.subscribe(() => {
      setRefs(snapshotStore.getProjectSnapshotRefs(projectId))
    })
    return unsubscribe
  }, [projectId])
  
  return refs
}

/**
 * Hook to access a specific snapshot
 */
export function useSnapshot(snapshotId: string | undefined): DailySnapshot | undefined {
  const [snapshot, setSnapshot] = useState<DailySnapshot | undefined>(
    snapshotId ? snapshotStore.getSnapshot(snapshotId) : undefined
  )
  
  useEffect(() => {
    if (!snapshotId) {
      setSnapshot(undefined)
      return
    }
    
    setSnapshot(snapshotStore.getSnapshot(snapshotId))
    
    const unsubscribe = snapshotStore.subscribe(() => {
      setSnapshot(snapshotStore.getSnapshot(snapshotId))
    })
    return unsubscribe
  }, [snapshotId])
  
  return snapshot
}

/**
 * Hook to access the latest snapshot for a project
 */
export function useLatestSnapshot(projectId: string): DailySnapshot | undefined {
  const [snapshot, setSnapshot] = useState<DailySnapshot | undefined>(
    snapshotStore.getLatestSnapshot(projectId)
  )
  
  useEffect(() => {
    const unsubscribe = snapshotStore.subscribe(() => {
      setSnapshot(snapshotStore.getLatestSnapshot(projectId))
    })
    return unsubscribe
  }, [projectId])
  
  return snapshot
}
