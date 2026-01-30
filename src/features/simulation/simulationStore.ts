// Simulation Store
// Central store for simulation context data with selectors for hierarchy navigation
// Follows the pattern of coreStore.ts with guard clauses, no else, max nesting 2

import { useMemo, useSyncExternalStore } from 'react'
import type { UnifiedAsset } from '../../domain/UnifiedModel'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Hierarchy levels in the simulation context
 * Program → Plant → Unit → Line → Station
 */
export interface SimulationContext {
  program: string
  plant: string
  unit: string
  line: string
  station: string
}

/**
 * Station with simulation context and asset information
 */
export interface StationContext {
  contextKey: string
  program: string
  plant: string
  unit: string
  line: string
  station: string
  simulationStatus?: SimulationStatusInfo
  assetCounts: AssetCounts
  sourcingCounts: SourcingCounts
  assets: UnifiedAsset[]
}

/**
 * Simulation status summary for a station
 */
export interface SimulationStatusInfo {
  firstStageCompletion?: number
  finalDeliverablesCompletion?: number
  dcsConfigured?: boolean
  engineer?: string
  sourceFile?: string
  sheetName?: string
}

/**
 * Asset counts by type
 */
export interface AssetCounts {
  total: number
  robots: number
  guns: number
  tools: number
  other: number
}

/**
 * Sourcing counts
 */
export interface SourcingCounts {
  reuse: number
  freeIssue: number
  newBuy: number
  unknown: number
}

/**
 * Hierarchy node for tree navigation
 */
export interface HierarchyNode {
  key: string
  label: string
  level: 'program' | 'plant' | 'unit' | 'line' | 'station'
  children: HierarchyNode[]
  stationCount: number
  context?: StationContext
}

/**
 * Store state for simulation data
 */
export interface SimulationStoreState {
  stations: StationContext[]
  isLoading: boolean
  errors: string[]
  lastUpdated: string | null
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

let storeState: SimulationStoreState = {
  stations: [],
  isLoading: false,
  errors: [],
  lastUpdated: null
}

const subscribers = new Set<() => void>()

function notifySubscribers(): void {
  subscribers.forEach(callback => callback())
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

export const simulationStore = {
  getState(): SimulationStoreState {
    return storeState
  },

  setStations(stations: StationContext[]): void {
    storeState = {
      ...storeState,
      stations,
      lastUpdated: new Date().toISOString()
    }
    notifySubscribers()
  },

  setLoading(isLoading: boolean): void {
    storeState = {
      ...storeState,
      isLoading
    }
    notifySubscribers()
  },

  setErrors(errors: string[]): void {
    storeState = {
      ...storeState,
      errors
    }
    notifySubscribers()
  },

  addError(error: string): void {
    storeState = {
      ...storeState,
      errors: [...storeState.errors, error]
    }
    notifySubscribers()
  },

  clearErrors(): void {
    storeState = {
      ...storeState,
      errors: []
    }
    notifySubscribers()
  },

  clear(): void {
    storeState = {
      stations: [],
      isLoading: false,
      errors: [],
      lastUpdated: null
    }
    notifySubscribers()
  },

  subscribe(callback: () => void): () => void {
    subscribers.add(callback)
    return () => subscribers.delete(callback)
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

const subscribe = simulationStore.subscribe
const getState = simulationStore.getState

const selectStations = (): StationContext[] => getState().stations
const selectLoading = (): boolean => getState().isLoading
const selectErrors = (): string[] => getState().errors

/**
 * Hook to access full simulation store state
 */
export function useSimulationStore(): SimulationStoreState {
  return useSyncExternalStore(subscribe, getState)
}

/**
 * Hook to access all stations
 * Only re-renders when stations reference changes
 */
export function useAllStations(): StationContext[] {
  return useSyncExternalStore(subscribe, selectStations)
}

/**
 * Hook to access loading state
 * Only re-renders when isLoading changes
 */
export function useSimulationLoading(): boolean {
  return useSyncExternalStore(subscribe, selectLoading)
}

/**
 * Hook to access errors
 * Only re-renders when errors reference changes
 */
export function useSimulationErrors(): string[] {
  return useSyncExternalStore(subscribe, selectErrors)
}

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/**
 * Hook to get unique programs
 */
export function usePrograms(): string[] {
  const stations = useAllStations()
  return useMemo(() => {
    const programs = new Set<string>()
    for (const station of stations) {
      programs.add(station.program)
    }
    return Array.from(programs).sort()
  }, [stations])
}

/**
 * Hook to get unique plants for a program
 */
export function usePlants(program: string | null): string[] {
  const stations = useAllStations()
  return useMemo(() => {
    if (program === null) return []

    const plants = new Set<string>()
    for (const station of stations) {
      if (station.program !== program) continue
      plants.add(station.plant)
    }
    return Array.from(plants).sort()
  }, [stations, program])
}

/**
 * Hook to get unique units for a plant
 */
export function useUnits(program: string | null, plant: string | null): string[] {
  const stations = useAllStations()
  return useMemo(() => {
    if (program === null) return []
    if (plant === null) return []

    const units = new Set<string>()
    for (const station of stations) {
      if (station.program !== program) continue
      if (station.plant !== plant) continue
      units.add(station.unit)
    }
    return Array.from(units).sort()
  }, [stations, program, plant])
}

/**
 * Hook to get unique lines for a unit
 */
export function useLines(program: string | null, plant: string | null, unit: string | null): string[] {
  const stations = useAllStations()
  return useMemo(() => {
    if (program === null) return []
    if (plant === null) return []
    if (unit === null) return []

    const lines = new Set<string>()
    for (const station of stations) {
      if (station.program !== program) continue
      if (station.plant !== plant) continue
      if (station.unit !== unit) continue
      lines.add(station.line)
    }
    return Array.from(lines).sort()
  }, [stations, program, plant, unit])
}

/**
 * Hook to get filtered stations by hierarchy
 */
export function useFilteredStations(filters: {
  program?: string | null
  plant?: string | null
  unit?: string | null
  line?: string | null
}): StationContext[] {
  const stations = useAllStations()
  return useMemo(() => {
    return stations.filter(station => {
      if (filters.program !== null && filters.program !== undefined && station.program !== filters.program) {
        return false
      }
      if (filters.plant !== null && filters.plant !== undefined && station.plant !== filters.plant) {
        return false
      }
      if (filters.unit !== null && filters.unit !== undefined && station.unit !== filters.unit) {
        return false
      }
      if (filters.line !== null && filters.line !== undefined && station.line !== filters.line) {
        return false
      }
      return true
    })
  }, [stations, filters.program, filters.plant, filters.unit, filters.line])
}

/**
 * Hook to get a station by context key
 */
export function useStationByKey(contextKey: string | null): StationContext | undefined {
  const stations = useAllStations()
  return useMemo(() => {
    if (contextKey === null) return undefined
    return stations.find(s => s.contextKey === contextKey)
  }, [stations, contextKey])
}

/**
 * Hook to build hierarchy tree
 */
export function useHierarchyTree(): HierarchyNode[] {
  const stations = useAllStations()
  return useMemo(() => buildHierarchyTree(stations), [stations])
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build hierarchy tree from stations
 */
function buildHierarchyTree(stations: StationContext[]): HierarchyNode[] {
  const programMap = new Map<string, Map<string, Map<string, Map<string, StationContext[]>>>>()

  // Group stations by hierarchy
  for (const station of stations) {
    const plantMap = programMap.get(station.program) ?? new Map()
    programMap.set(station.program, plantMap)

    const unitMap = plantMap.get(station.plant) ?? new Map()
    plantMap.set(station.plant, unitMap)

    const lineMap = unitMap.get(station.unit) ?? new Map()
    unitMap.set(station.unit, lineMap)

    const stationList = lineMap.get(station.line) ?? []
    stationList.push(station)
    lineMap.set(station.line, stationList)
  }

  // Build tree
  const programNodes: HierarchyNode[] = []

  for (const [programKey, plantMap] of programMap) {
    const plantNodes: HierarchyNode[] = []

    for (const [plantKey, unitMap] of plantMap) {
      const unitNodes: HierarchyNode[] = []

      for (const [unitKey, lineMap] of unitMap) {
        const lineNodes: HierarchyNode[] = []

        for (const [lineKey, stationList] of lineMap) {
          const stationNodes: HierarchyNode[] = stationList.map(s => ({
            key: s.contextKey,
            label: s.station,
            level: 'station' as const,
            children: [],
            stationCount: 1,
            context: s
          }))

          lineNodes.push({
            key: `${programKey}|${plantKey}|${unitKey}|${lineKey}`,
            label: lineKey,
            level: 'line',
            children: stationNodes,
            stationCount: stationList.length
          })
        }

        const unitStationCount = lineNodes.reduce((sum, n) => sum + n.stationCount, 0)
        unitNodes.push({
          key: `${programKey}|${plantKey}|${unitKey}`,
          label: unitKey,
          level: 'unit',
          children: lineNodes,
          stationCount: unitStationCount
        })
      }

      const plantStationCount = unitNodes.reduce((sum, n) => sum + n.stationCount, 0)
      plantNodes.push({
        key: `${programKey}|${plantKey}`,
        label: plantKey,
        level: 'plant',
        children: unitNodes,
        stationCount: plantStationCount
      })
    }

    const programStationCount = plantNodes.reduce((sum, n) => sum + n.stationCount, 0)
    programNodes.push({
      key: programKey,
      label: programKey,
      level: 'program',
      children: plantNodes,
      stationCount: programStationCount
    })
  }

  return programNodes.sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Generate context key from hierarchy
 */
export function generateContextKey(context: SimulationContext): string {
  return `${context.program}|${context.plant}|${context.unit}|${context.line}|${context.station}`
}

/**
 * Parse context key to hierarchy parts
 */
export function parseContextKey(contextKey: string): SimulationContext | null {
  const parts = contextKey.split('|')
  if (parts.length !== 5) return null

  return {
    program: parts[0],
    plant: parts[1],
    unit: parts[2],
    line: parts[3],
    station: parts[4]
  }
}
