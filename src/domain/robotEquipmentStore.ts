/**
 * Robot Equipment Store
 *
 * Manages robot equipment entities (individual robot specifications and delivery tracking)
 */

import { useState, useEffect, useMemo } from 'react'
import { RobotEquipmentEntity } from '../ingestion/robotEquipmentList/robotEquipmentListTypes'

// ============================================================================
// TYPES
// ============================================================================

export interface RobotEquipmentStoreState {
  entities: RobotEquipmentEntity[]
  lastUpdated: string | null
  sourceFiles: string[]
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

let storeState: RobotEquipmentStoreState = {
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

export const robotEquipmentStore = {
  getState(): RobotEquipmentStoreState {
    return storeState
  },

  /**
   * Add robot equipment entities from a file
   */
  addEntities(entities: RobotEquipmentEntity[], sourceFile: string): void {
    // Filter out duplicates
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
  replaceEntitiesFromFile(entities: RobotEquipmentEntity[], sourceFile: string): void {
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
  setEntities(entities: RobotEquipmentEntity[]): void {
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
 * Hook to access full robot equipment store state
 */
export function useRobotEquipmentStore(): RobotEquipmentStoreState {
  const [state, setState] = useState(storeState)

  useEffect(() => {
    const unsubscribe = robotEquipmentStore.subscribe(() => {
      setState(robotEquipmentStore.getState())
    })
    return unsubscribe
  }, [])

  return state
}

/**
 * Hook to access all robot equipment entities
 */
export function useRobotEquipmentEntities(): RobotEquipmentEntity[] {
  const state = useRobotEquipmentStore()
  return state.entities
}

/**
 * Hook to get a specific robot by ID
 */
export function useRobotEquipmentById(robotId: string): RobotEquipmentEntity | undefined {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    return entities.find(e => e.robotId === robotId)
  }, [entities, robotId])
}

/**
 * Hook to get robots by station
 */
export function useRobotEquipmentByStation(station: string): RobotEquipmentEntity[] {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    return entities.filter(e => e.station === station)
  }, [entities, station])
}

/**
 * Hook to get robots by area
 */
export function useRobotEquipmentByArea(area: string): RobotEquipmentEntity[] {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    return entities.filter(e => e.area === area || e.areaFull === area)
  }, [entities, area])
}

/**
 * Hook to get robots grouped by station
 */
export function useRobotEquipmentGroupedByStation(): Map<string, RobotEquipmentEntity[]> {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    const grouped = new Map<string, RobotEquipmentEntity[]>()

    for (const entity of entities) {
      const key = entity.station
      const list = grouped.get(key) ?? []
      list.push(entity)
      grouped.set(key, list)
    }

    return grouped
  }, [entities])
}

/**
 * Hook to get robots grouped by application type
 */
export function useRobotEquipmentGroupedByApplication(): Map<string, RobotEquipmentEntity[]> {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    const grouped = new Map<string, RobotEquipmentEntity[]>()

    for (const entity of entities) {
      const key = entity.application
      const list = grouped.get(key) ?? []
      list.push(entity)
      grouped.set(key, list)
    }

    return grouped
  }, [entities])
}

/**
 * Hook to get robots grouped by install status
 */
export function useRobotEquipmentGroupedByStatus(): Map<string, RobotEquipmentEntity[]> {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    const grouped = new Map<string, RobotEquipmentEntity[]>()

    for (const entity of entities) {
      const status = entity.installStatus || 'Unknown'
      const list = grouped.get(status) ?? []
      list.push(entity)
      grouped.set(status, list)
    }

    return grouped
  }, [entities])
}

/**
 * Hook to get unique stations
 */
export function useRobotEquipmentStations(): string[] {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    const stations = new Set<string>()
    for (const entity of entities) {
      stations.add(entity.station)
    }
    return Array.from(stations).sort((a, b) => {
      // Extract area and station number for natural sorting
      const matchA = a.match(/^([A-Z0-9]+)-(.+)$/)
      const matchB = b.match(/^([A-Z0-9]+)-(.+)$/)

      if (matchA && matchB) {
        const [, areaA, stationA] = matchA
        const [, areaB, stationB] = matchB

        if (areaA !== areaB) return areaA.localeCompare(areaB)

        const numA = parseInt(stationA, 10)
        const numB = parseInt(stationB, 10)
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB

        return stationA.localeCompare(stationB)
      }

      return a.localeCompare(b)
    })
  }, [entities])
}

/**
 * Hook to get unique areas
 */
export function useRobotEquipmentAreas(): string[] {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    const areas = new Set<string>()
    for (const entity of entities) {
      areas.add(entity.area)
    }
    return Array.from(areas).sort()
  }, [entities])
}

/**
 * Hook to get unique robot types
 */
export function useRobotEquipmentRobotTypes(): string[] {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    const types = new Set<string>()
    for (const entity of entities) {
      types.add(entity.robotType)
    }
    return Array.from(types).sort()
  }, [entities])
}

/**
 * Hook to get overall statistics
 */
export function useRobotEquipmentStats(): {
  totalRobots: number
  totalStations: number
  totalAreas: number
  delivered: number
  notDelivered: number
  poweredOn: number
  byApplication: Map<string, number>
  byStatus: Map<string, number>
} {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    const areas = new Set<string>()
    const stations = new Set<string>()
    const byApplication = new Map<string, number>()
    const byStatus = new Map<string, number>()

    let delivered = 0
    let notDelivered = 0
    let poweredOn = 0

    for (const entity of entities) {
      areas.add(entity.area)
      stations.add(entity.station)

      // Count by application
      const appCount = byApplication.get(entity.application) || 0
      byApplication.set(entity.application, appCount + 1)

      // Count by status
      const status = entity.installStatus || 'Unknown'
      const statusCount = byStatus.get(status) || 0
      byStatus.set(status, statusCount + 1)

      // Delivery status
      if (entity.serialNumber === 'Not Delivered' || entity.serialNumber === null) {
        notDelivered++
      } else {
        delivered++
      }

      // Install status
      if (entity.installStatus?.toLowerCase().includes('powered')) {
        poweredOn++
      }
    }

    return {
      totalRobots: entities.length,
      totalStations: stations.size,
      totalAreas: areas.size,
      delivered,
      notDelivered,
      poweredOn,
      byApplication,
      byStatus
    }
  }, [entities])
}

/**
 * Hook to get robots with ESOW concerns
 */
export function useRobotEquipmentWithESOWConcerns(): RobotEquipmentEntity[] {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    return entities.filter(e =>
      e.differsFromESOW ||
      e.applicationConcern !== null ||
      !e.ftfApprovedESOW
    )
  }, [entities])
}

/**
 * Hook to get robots missing equipment
 */
export function useRobotEquipmentMissingData(): RobotEquipmentEntity[] {
  const entities = useRobotEquipmentEntities()
  return useMemo(() => {
    return entities.filter(e =>
      !e.mainCable || !e.serialNumber
    )
  }, [entities])
}
