/**
 * Simulation Status Store
 *
 * Manages simulation status entities (robot-by-robot milestone tracking)
 * Integrates with tool list entities for station-level cross-referencing
 */

import { useState, useEffect, useMemo } from 'react'
import { SimulationStatusEntity } from '../ingestion/simulationStatus/simulationStatusTypes'

// ============================================================================
// TYPES
// ============================================================================

export interface SimulationStatusStoreState {
  entities: SimulationStatusEntity[]
  lastUpdated: string | null
  sourceFiles: string[]  // Track which files have been loaded
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

let storeState: SimulationStatusStoreState = {
  entities: [],
  lastUpdated: null,
  sourceFiles: []
}

const subscribers = new Set<() => void>()

function notifySubscribers(): void {
  subscribers.forEach(callback => callback())
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

export const simulationStatusStore = {
  getState(): SimulationStatusStoreState {
    return storeState
  },

  /**
   * Add simulation status entities from a file
   */
  addEntities(entities: SimulationStatusEntity[], sourceFile: string): void {
    // Filter out any duplicates (same canonical key from same source file)
    const existingKeys = new Set(
      storeState.entities
        .filter(e => e.source.file === sourceFile)
        .map(e => e.canonicalKey)
    )

    const newEntities = entities.filter(e => !existingKeys.has(e.canonicalKey))

    storeState = {
      entities: [...storeState.entities, ...newEntities],
      lastUpdated: new Date().toISOString(),
      sourceFiles: Array.from(new Set([...storeState.sourceFiles, sourceFile]))
    }
    notifySubscribers()
  },

  /**
   * Replace all entities from a specific file
   */
  replaceEntitiesFromFile(entities: SimulationStatusEntity[], sourceFile: string): void {
    // Remove existing entities from this file
    const otherEntities = storeState.entities.filter(e => e.source.file !== sourceFile)

    storeState = {
      entities: [...otherEntities, ...entities],
      lastUpdated: new Date().toISOString(),
      sourceFiles: Array.from(new Set([...storeState.sourceFiles, sourceFile]))
    }
    notifySubscribers()
  },

  /**
   * Replace all entities
   */
  setEntities(entities: SimulationStatusEntity[]): void {
    const sourceFiles = Array.from(new Set(entities.map(e => e.source.file)))

    storeState = {
      entities: [...entities],
      lastUpdated: new Date().toISOString(),
      sourceFiles
    }
    notifySubscribers()
  },

  /**
   * Clear all data
   */
  clear(): void {
    storeState = {
      entities: [],
      lastUpdated: null,
      sourceFiles: []
    }
    notifySubscribers()
  },

  /**
   * Clear entities from a specific file
   */
  clearFile(sourceFile: string): void {
    storeState = {
      entities: storeState.entities.filter(e => e.source.file !== sourceFile),
      lastUpdated: new Date().toISOString(),
      sourceFiles: storeState.sourceFiles.filter(f => f !== sourceFile)
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

/**
 * Hook to access full simulation status store state
 */
export function useSimulationStatusStore(): SimulationStatusStoreState {
  const [state, setState] = useState(storeState)

  useEffect(() => {
    const unsubscribe = simulationStatusStore.subscribe(() => {
      setState(simulationStatusStore.getState())
    })
    return unsubscribe
  }, [])

  return state
}

/**
 * Hook to access all simulation status entities
 */
export function useSimulationStatusEntities(): SimulationStatusEntity[] {
  const state = useSimulationStatusStore()
  return state.entities
}

/**
 * Hook to get entities for a specific station
 */
export function useSimulationStatusByStation(area: string, station: string): SimulationStatusEntity[] {
  const entities = useSimulationStatusEntities()
  return useMemo(() => {
    return entities.filter(e => e.area === area && e.station === station)
  }, [entities, area, station])
}

/**
 * Hook to get a specific robot entity
 */
export function useSimulationStatusByRobot(robotFullId: string): SimulationStatusEntity | undefined {
  const entities = useSimulationStatusEntities()
  return useMemo(() => {
    return entities.find(e => e.robotFullId === robotFullId)
  }, [entities, robotFullId])
}

/**
 * Hook to get entities grouped by station
 */
export function useSimulationStatusGroupedByStation(): Map<string, SimulationStatusEntity[]> {
  const entities = useSimulationStatusEntities()
  return useMemo(() => {
    const grouped = new Map<string, SimulationStatusEntity[]>()

    for (const entity of entities) {
      const key = `${entity.area}|${entity.station}`
      const list = grouped.get(key) ?? []
      list.push(entity)
      grouped.set(key, list)
    }

    return grouped
  }, [entities])
}

/**
 * Hook to get entities grouped by application type
 */
export function useSimulationStatusGroupedByApplication(): Map<string, SimulationStatusEntity[]> {
  const entities = useSimulationStatusEntities()
  return useMemo(() => {
    const grouped = new Map<string, SimulationStatusEntity[]>()

    for (const entity of entities) {
      const list = grouped.get(entity.application) ?? []
      list.push(entity)
      grouped.set(entity.application, list)
    }

    return grouped
  }, [entities])
}

/**
 * Hook to get unique areas
 */
export function useSimulationStatusAreas(): string[] {
  const entities = useSimulationStatusEntities()
  return useMemo(() => {
    const areas = new Set<string>()
    for (const entity of entities) {
      areas.add(entity.area)
    }
    return Array.from(areas).sort()
  }, [entities])
}

/**
 * Hook to get unique stations for an area
 */
export function useSimulationStatusStations(area: string | null): string[] {
  const entities = useSimulationStatusEntities()
  return useMemo(() => {
    if (area === null) return []

    const stations = new Set<string>()
    for (const entity of entities) {
      if (entity.area !== area) continue
      stations.add(entity.station)
    }
    return Array.from(stations).sort((a, b) => {
      const aNum = parseInt(a, 10)
      const bNum = parseInt(b, 10)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      return a.localeCompare(b)
    })
  }, [entities, area])
}

/**
 * Hook to get unique application types
 */
export function useSimulationStatusApplicationTypes(): string[] {
  const entities = useSimulationStatusEntities()
  return useMemo(() => {
    const types = new Set<string>()
    for (const entity of entities) {
      types.add(entity.application)
    }
    return Array.from(types).sort()
  }, [entities])
}

/**
 * Hook to get overall statistics
 */
export function useSimulationStatusStats(): {
  totalRobots: number
  totalStations: number
  totalAreas: number
  averageCompletion: number
  byApplication: Map<string, { count: number; avgCompletion: number }>
} {
  const entities = useSimulationStatusEntities()
  return useMemo(() => {
    const areas = new Set<string>()
    const stations = new Set<string>()
    let totalCompletion = 0
    const byApplication = new Map<string, { count: number; totalCompletion: number }>()

    for (const entity of entities) {
      areas.add(entity.area)
      stations.add(entity.stationFull)
      totalCompletion += entity.overallCompletion

      const appData = byApplication.get(entity.application) ?? { count: 0, totalCompletion: 0 }
      appData.count++
      appData.totalCompletion += entity.overallCompletion
      byApplication.set(entity.application, appData)
    }

    const byApplicationResult = new Map<string, { count: number; avgCompletion: number }>()
    for (const [app, data] of byApplication) {
      byApplicationResult.set(app, {
        count: data.count,
        avgCompletion: data.count > 0 ? Math.round(data.totalCompletion / data.count) : 0
      })
    }

    return {
      totalRobots: entities.length,
      totalStations: stations.size,
      totalAreas: areas.size,
      averageCompletion: entities.length > 0 ? Math.round(totalCompletion / entities.length) : 0,
      byApplication: byApplicationResult
    }
  }, [entities])
}

/**
 * Hook to get completion statistics for a station
 */
export function useStationCompletionStats(area: string, station: string): {
  robotCount: number
  averageCompletion: number
  robots: Array<{ robotFullId: string; completion: number; application: string }>
} {
  const entities = useSimulationStatusByStation(area, station)
  return useMemo(() => {
    const totalCompletion = entities.reduce((sum, e) => sum + e.overallCompletion, 0)

    return {
      robotCount: entities.length,
      averageCompletion: entities.length > 0 ? Math.round(totalCompletion / entities.length) : 0,
      robots: entities.map(e => ({
        robotFullId: e.robotFullId,
        completion: e.overallCompletion,
        application: e.application
      }))
    }
  }, [entities])
}
