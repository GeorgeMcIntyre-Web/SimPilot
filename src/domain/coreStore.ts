// Core Store
// Simple in-memory store for new domain entities (Project, Area, Cell, Robot, Tool)

import { useState, useEffect } from 'react'
import { Project, Area, Cell, Robot, Tool } from './core'
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

export { DEMO_SCENARIOS }
export type { DemoScenarioId, DemoScenarioSummary } from './demoData'

export function loadDemoScenario(id: DemoScenarioId): void {
  const data = getDemoScenarioData(id)
  coreStore.setData(data)
}

// ============================================================================
// STORE STATE
// ============================================================================

export interface CoreStoreState {
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  robots: Robot[]
  tools: Tool[]
  warnings: string[]
  lastUpdated: string | null
}

let storeState: CoreStoreState = {
  projects: [],
  areas: [],
  cells: [],
  robots: [],
  tools: [],
  warnings: [],
  lastUpdated: null
}

// Subscribers for reactive updates
const subscribers = new Set<() => void>()

function notifySubscribers() {
  subscribers.forEach(callback => callback())
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
   */
  setData(data: {
    projects: Project[]
    areas: Area[]
    cells: Cell[]
    robots: Robot[]
    tools: Tool[]
    warnings: string[]
  }): void {
    storeState = {
      ...data,
      lastUpdated: new Date().toISOString()
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
      robots: [],
      tools: [],
      warnings: [],
      lastUpdated: null
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
  if (!cellId) return state.robots
  return state.robots.filter(r => r.cellId === cellId)
}

/**
 * Hook to access tools for a cell
 */
export function useTools(cellId?: string): Tool[] {
  const state = useCoreStore()
  if (!cellId) return state.tools
  return state.tools.filter(t => t.cellId === cellId)
}

/**
 * Hook to access ingestion warnings
 */
export function useWarnings(): string[] {
  const state = useCoreStore()
  return state.warnings
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
