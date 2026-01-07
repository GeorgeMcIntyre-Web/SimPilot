// Core Store
// Simple in-memory store for new domain entities (Project, Area, Cell, Robot, Tool)

import { useState, useEffect } from 'react'
import { Project, Area, Cell, Robot, Tool, UnifiedAsset, EmployeeRecord, SupplierRecord } from './core'
import {
  getProjectMetrics,
  getAllProjectMetrics,
  getGlobalSimulationMetrics,
  getAllEngineerMetrics,
  getEngineerMetrics,
  type ProjectMetrics,
  type GlobalSimulationMetrics,
  type EngineerMetrics
} from './derivedMetrics'
import { getDemoScenarioData, DemoScenarioId, DEMO_SCENARIOS } from './demoData'
import { StoreSnapshot, createSnapshotFromState, applySnapshotToState } from './storeSnapshot'
import { ChangeRecord } from './changeLog'
import { StationRecord, ToolRecord, RobotRecord, AliasRule, ImportRun, DiffResult } from './uidTypes'

export { DEMO_SCENARIOS }
export type { DemoScenarioId, DemoScenarioSummary } from './demoData'

export function loadDemoScenario(id: DemoScenarioId): void {
  const data = getDemoScenarioData(id)
  coreStore.setData(data, 'Demo')
}

// ============================================================================
// STORE STATE
// ============================================================================

export interface CoreStoreState {
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  assets: UnifiedAsset[] // Unified Asset Storage
  warnings: string[]
  changeLog: ChangeRecord[]
  lastUpdated: string | null
  dataSource: 'Demo' | 'Local' | 'MS365' | null  // Track where data came from
  referenceData: {
    employees: EmployeeRecord[]
    suppliers: SupplierRecord[]
  }
  // Schema v3: UID-backed linking collections
  stationRecords: StationRecord[]
  toolRecords: ToolRecord[]
  robotRecords: RobotRecord[]
  aliasRules: AliasRule[]
  importRuns: ImportRun[]
  diffResults: DiffResult[]  // Store diff results from imports for UI display
}

let storeState: CoreStoreState = {
  projects: [],
  areas: [],
  cells: [],
  assets: [],
  warnings: [],
  changeLog: [],
  lastUpdated: null,
  dataSource: null,
  referenceData: {
    employees: [],
    suppliers: []
  },
  stationRecords: [],
  toolRecords: [],
  robotRecords: [],
  aliasRules: [],
  importRuns: [],
  diffResults: []
}

// Subscribers for reactive updates
const subscribers = new Set<() => void>()

function notifySubscribers() {
  subscribers.forEach(callback => callback())
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

function validateSetDataInput(data: unknown): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: must be an object')
  }

  const d = data as Record<string, unknown>

  // Validate required array fields
  const requiredArrayFields = ['projects', 'areas', 'cells', 'robots', 'tools', 'warnings']
  for (const field of requiredArrayFields) {
    if (!Array.isArray(d[field])) {
      throw new Error(`Invalid data: ${field} must be an array`)
    }
  }

  // Validate referenceData structure if provided
  if (d.referenceData !== undefined) {
    const refData = d.referenceData as Record<string, unknown>
    if (!refData || typeof refData !== 'object') {
      throw new Error('Invalid data: referenceData must be an object')
    }
    if (!Array.isArray(refData.employees)) {
      throw new Error('Invalid data: referenceData.employees must be an array')
    }
    if (!Array.isArray(refData.suppliers)) {
      throw new Error('Invalid data: referenceData.suppliers must be an array')
    }
  }
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

export const coreStore = {
  /**
   * Get current state
   */
  getState(): CoreStoreState {
    return storeState
  },

  /**
   * Replace all entities with new data
   * @throws {Error} If data structure is invalid
   */
  setData(data: {
    projects: Project[]
    areas: Area[]
    cells: Cell[]
    robots: Robot[]
    tools: Tool[]
    warnings: string[]
    referenceData?: {
      employees: EmployeeRecord[]
      suppliers: SupplierRecord[]
    }
  }, source?: 'Demo' | 'Local' | 'MS365'): void {
    // Validate input structure
    validateSetDataInput(data)

    storeState = {
      projects: [...data.projects],
      areas: [...data.areas],
      cells: [...data.cells],
      assets: [...data.robots, ...data.tools], // Merge into Unified Assets
      warnings: [...data.warnings],
      changeLog: [], // Reset change log on new data load
      lastUpdated: new Date().toISOString(),
      dataSource: source || null,
      referenceData: data.referenceData || { employees: [], suppliers: [] }
    }
    notifySubscribers()
  },

  /**
   * Clear all data
   */
  clear(): void {
    storeState = {
      projects: [],
      areas: [],
      cells: [],
      assets: [],
      warnings: [],
      changeLog: [],
      lastUpdated: null,
      dataSource: null,
      referenceData: {
        employees: [],
        suppliers: []
      },
      stationRecords: [],
      toolRecords: [],
      robotRecords: [],
      aliasRules: [],
      importRuns: [],
      diffResults: []
    }
    notifySubscribers()
  },

  /**
   * Add a change record to the log
   */
  addChange(change: ChangeRecord): void {
    storeState = {
      ...storeState,
      changeLog: [...storeState.changeLog, change],
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Clear the change log
   */
  clearChangeLog(): void {
    storeState = {
      ...storeState,
      changeLog: [],
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Update a cell's engineer assignment
   */
  updateCellEngineer(cellId: string, newEngineer: string | undefined): void {
    storeState = {
      ...storeState,
      cells: storeState.cells.map(c =>
        c.id === cellId ? { ...c, assignedEngineer: newEngineer } : c
      ),
      lastUpdated: new Date().toISOString()
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
   * Get a snapshot of the current state
   */
  getSnapshot(): StoreSnapshot {
    return createSnapshotFromState(storeState, {
      sourceKind: 'unknown' // Caller should override this if known
    })
  },

  /**
   * Load a snapshot into the store
   */
  loadSnapshot(snapshot: StoreSnapshot): void {
    storeState = applySnapshotToState(snapshot)
    notifySubscribers()
  },

  /**
   * Clear all data (alias for clear, but explicit for persistence)
   */
  clearStore(): void {
    this.clear()
  },

  // ============================================================================
  // UID-BACKED LINKING METHODS (Schema v3)
  // ============================================================================

  /**
   * Add or update StationRecords
   */
  upsertStationRecords(records: StationRecord[]): void {
    const byUid = new Map(storeState.stationRecords.map(r => [r.uid, r]))

    for (const record of records) {
      byUid.set(record.uid, record)
    }

    storeState = {
      ...storeState,
      stationRecords: Array.from(byUid.values()),
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Add or update ToolRecords
   */
  upsertToolRecords(records: ToolRecord[]): void {
    const byUid = new Map(storeState.toolRecords.map(r => [r.uid, r]))

    for (const record of records) {
      byUid.set(record.uid, record)
    }

    storeState = {
      ...storeState,
      toolRecords: Array.from(byUid.values()),
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Add or update RobotRecords
   */
  upsertRobotRecords(records: RobotRecord[]): void {
    const byUid = new Map(storeState.robotRecords.map(r => [r.uid, r]))

    for (const record of records) {
      byUid.set(record.uid, record)
    }

    storeState = {
      ...storeState,
      robotRecords: Array.from(byUid.values()),
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Add alias rules (deduplicated by fromKey + entityType)
   */
  addAliasRules(rules: AliasRule[]): void {
    const existing = new Map(
      storeState.aliasRules.map(r => [`${r.entityType}:${r.fromKey}`, r])
    )

    for (const rule of rules) {
      existing.set(`${rule.entityType}:${rule.fromKey}`, rule)
    }

    storeState = {
      ...storeState,
      aliasRules: Array.from(existing.values()),
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Add an import run record
   */
  addImportRun(importRun: ImportRun): void {
    storeState = {
      ...storeState,
      importRuns: [...storeState.importRuns, importRun],
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Add a diff result
   */
  addDiffResult(diffResult: DiffResult): void {
    storeState = {
      ...storeState,
      diffResults: [...storeState.diffResults, diffResult],
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Soft-delete a station (set status to inactive)
   */
  deactivateStation(uid: string): void {
    storeState = {
      ...storeState,
      stationRecords: storeState.stationRecords.map(r =>
        r.uid === uid ? { ...r, status: 'inactive' as const, updatedAt: new Date().toISOString() } : r
      ),
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Reactivate a station
   */
  reactivateStation(uid: string): void {
    storeState = {
      ...storeState,
      stationRecords: storeState.stationRecords.map(r =>
        r.uid === uid ? { ...r, status: 'active' as const, updatedAt: new Date().toISOString() } : r
      ),
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Soft-delete a tool
   */
  deactivateTool(uid: string): void {
    storeState = {
      ...storeState,
      toolRecords: storeState.toolRecords.map(r =>
        r.uid === uid ? { ...r, status: 'inactive' as const, updatedAt: new Date().toISOString() } : r
      ),
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  /**
   * Reactivate a tool
   */
  reactivateTool(uid: string): void {
    storeState = {
      ...storeState,
      toolRecords: storeState.toolRecords.map(r =>
        r.uid === uid ? { ...r, status: 'active' as const, updatedAt: new Date().toISOString() } : r
      ),
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

/**
 * Hook to access full store state
 */
export function useCoreStore(): CoreStoreState {
  const [state, setState] = useState(storeState)

  useEffect(() => {
    const unsubscribe = coreStore.subscribe(() => {
      setState(coreStore.getState())
    })
    return unsubscribe
  }, [])

  return state
}

/**
 * Hook to access projects
 */
export function useProjects(): Project[] {
  const state = useCoreStore()
  return state.projects
}

/**
 * Hook to access a single project
 */
export function useProject(projectId: string): Project | undefined {
  const projects = useProjects()
  return projects.find(p => p.id === projectId)
}

/**
 * Hook to access areas for a project
 */
export function useAreas(projectId?: string): Area[] {
  const state = useCoreStore()
  if (!projectId) return state.areas
  return state.areas.filter(a => a.projectId === projectId)
}

/**
 * Hook to access cells for a project or area
 */
export function useCells(projectId?: string, areaId?: string): Cell[] {
  const state = useCoreStore()

  if (areaId) {
    return state.cells.filter(c => c.areaId === areaId)
  }

  if (projectId) {
    return state.cells.filter(c => c.projectId === projectId)
  }

  return state.cells
}

/**
 * Hook to access a single cell
 */
export function useCell(cellId: string): Cell | undefined {
  const state = useCoreStore()
  return state.cells.find(c => c.id === cellId)
}

/**
 * Hook to access robots for a cell
 */
export function useRobots(cellId?: string): Robot[] {
  const state = useCoreStore()
  const robots = state.assets.filter(a => a.kind === 'ROBOT') as unknown as Robot[]
  if (!cellId) return robots
  return robots.filter(r => r.cellId === cellId)
}

/**
 * Hook to access tools for a cell
 */
export function useTools(cellId?: string): Tool[] {
  const state = useCoreStore()
  // Tools are everything that is NOT a robot (Guns, Tools, Others)
  const tools = state.assets.filter(a => a.kind !== 'ROBOT') as unknown as Tool[]
  if (!cellId) return tools
  return tools.filter(t => t.cellId === cellId)
}

/**
 * Hook to access ingestion warnings
 */
export function useWarnings(): string[] {
  const state = useCoreStore()
  return state.warnings
}

/**
 * Hook to access the change log
 */
export function useChangeLog(): ChangeRecord[] {
  const state = useCoreStore()
  return state.changeLog
}

/**
 * Hook to check for unsynced changes
 */
export function useHasUnsyncedChanges(): boolean {
  const state = useCoreStore()
  return state.changeLog.length > 0
}

/**
 * Hook to access a cell by ID with optional undefined handling
 */
export function useCellById(cellId: string | undefined): Cell | undefined {
  if (!cellId) return undefined
  return useCell(cellId)
}

/**
 * Hook to access robots filtered by cell
 */
export function useRobotsByCell(cellId: string): Robot[] {
  return useRobots(cellId)
}

/**
 * Hook to access tools filtered by cell
 */
export function useToolsByCell(cellId: string): Tool[] {
  return useTools(cellId)
}

// ============================================================================
// DERIVED METRICS HOOKS
// ============================================================================

/**
 * Hook to access metrics for a specific project
 */
export function useProjectMetrics(projectId: string): ProjectMetrics | undefined {
  const state = useCoreStore()
  const project = state.projects.find(p => p.id === projectId)

  if (!project) return undefined

  return getProjectMetrics(projectId)
}

/**
 * Hook to access metrics for all projects
 */
export function useAllProjectMetrics(): ProjectMetrics[] {
  useCoreStore() // Subscribe to store changes
  return getAllProjectMetrics()
}

/**
 * Hook to access global simulation metrics across all projects
 */
export function useGlobalSimulationMetrics(): GlobalSimulationMetrics {
  useCoreStore() // Subscribe to store changes
  return getGlobalSimulationMetrics()
}

/**
 * Hook to access metrics for all engineers
 */
export function useAllEngineerMetrics(): EngineerMetrics[] {
  useCoreStore() // Subscribe to store changes
  return getAllEngineerMetrics()
}

/**
 * Hook to access metrics for a specific engineer
 */
export function useEngineerMetrics(engineerName: string | undefined): EngineerMetrics | undefined {
  useCoreStore() // Subscribe to store changes

  if (!engineerName) return undefined

  return getEngineerMetrics(engineerName)
}

/**
 * Hook to check if any simulation data is loaded
 */
export function useHasSimulationData(): boolean {
  const state = useCoreStore()

  for (const cell of state.cells) {
    if (cell.simulation && cell.simulation.percentComplete >= 0) {
      return true
    }
  }

  return false
}

/**
 * Hook to get last updated timestamp
 */
export function useLastUpdated(): string | null {
  const state = useCoreStore()
  return state.lastUpdated
}

/**
 * Hook to get data source
 */
export function useDataSource(): 'Demo' | 'Local' | 'MS365' | null {
  const state = useCoreStore()
  return state.dataSource
}

/**
 * Hook to access reference data (employees, suppliers)
 */
export function useReferenceData() {
  const state = useCoreStore()
  return state.referenceData
}
