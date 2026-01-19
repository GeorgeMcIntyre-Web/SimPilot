// Cross-Reference Data Hook
// Provides typed access to CrossRef data with derived aggregates for dashboard consumption

import { useState, useEffect, useMemo } from 'react'
import {
  CellSnapshot,
  CellHealthSummary,
  CrossRefFlag,
  CrossRefResult,
  CellRiskLevel
} from '../domain/crossRef/CrossRefTypes'
import { buildCellHealthSummaries } from '../domain/crossRef/CellHealthSummary'
import { log } from '../lib/log'

// ============================================================================
// TYPES
// ============================================================================

export interface CrossRefStats {
  totalCells: number
  cellsWithRisks: number
  totalFlags: number
  robotCount: number
  toolCount: number
  weldGunCount: number
  riserCount: number
}

export interface AreaSummary {
  areaKey: string
  stationCount: number
  criticalCount: number
  atRiskCount: number
  okCount: number
  totalFlags: number
}

export interface CrossRefDataResult {
  // Core data
  cells: CellSnapshot[]
  stats: CrossRefStats
  globalFlags: CrossRefFlag[]
  healthSummaries: CellHealthSummary[]

  // Derived aggregates
  areas: string[]
  byArea: Record<string, CellSnapshot[]>
  areaSummaries: AreaSummary[]

  // Status
  loading: boolean
  error: string | null
  hasData: boolean
}

// ============================================================================
// MOCK DATA STORE (temporary - will be replaced with real backend)
// ============================================================================

let crossRefStore: CrossRefResult | null = null
const crossRefSubscribers = new Set<() => void>()

/**
 * Set cross-reference data (called by ingestion pipeline)
 */
export const setCrossRefData = (result: CrossRefResult): void => {
  const uniqueAreas = result.cells.map(c => c.areaKey).filter((v, i, a) => a.indexOf(v) === i)
  log.info('[setCrossRefData] Setting CrossRef data:', {
    cellsCount: result.cells.length,
    subscribersCount: crossRefSubscribers.size,
    uniqueAreas: uniqueAreas.length,
    areaNames: uniqueAreas.slice(0, 10) // First 10 areas for debugging
  })
  crossRefStore = result
  crossRefSubscribers.forEach(cb => {
    log.debug('[setCrossRefData] Notifying subscriber')
    cb()
  })
  log.info(`[setCrossRefData] Notified ${crossRefSubscribers.size} subscribers`)
}

/**
 * Get current cross-reference data
 */
export const getCrossRefData = (): CrossRefResult | null => {
  return crossRefStore
}

/**
 * Clear cross-reference data
 */
export const clearCrossRefData = (): void => {
  crossRefStore = null
  crossRefSubscribers.forEach(cb => cb())
}

/**
 * Subscribe to cross-reference data changes
 */
const subscribeToCrossRef = (callback: () => void): (() => void) => {
  crossRefSubscribers.add(callback)
  return () => crossRefSubscribers.delete(callback)
}

// ============================================================================
// HELPER FUNCTIONS (pure, flat)
// ============================================================================

/**
 * Extract unique area keys from cells
 */
const extractAreas = (cells: CellSnapshot[]): string[] => {
  const areaSet = new Set<string>()

  for (const cell of cells) {
    const areaKey = cell.areaKey ?? 'Unknown'
    areaSet.add(areaKey)
  }

  return Array.from(areaSet).sort()
}

/**
 * Group cells by area key
 */
const groupByArea = (cells: CellSnapshot[]): Record<string, CellSnapshot[]> => {
  const result: Record<string, CellSnapshot[]> = {}

  for (const cell of cells) {
    const areaKey = cell.areaKey ?? 'Unknown'
    const list = result[areaKey] ?? []
    list.push(cell)
    result[areaKey] = list
  }

  return result
}

/**
 * Determine risk level from flags
 */
const getRiskLevel = (flags: CrossRefFlag[]): CellRiskLevel => {
  if (flags.length === 0) return 'OK'

  const hasError = flags.some(f => f.severity === 'ERROR')
  if (hasError) return 'CRITICAL'

  const hasWarning = flags.some(f => f.severity === 'WARNING')
  if (hasWarning) return 'AT_RISK'

  return 'OK'
}

/**
 * Build area summary from cells in that area
 */
const buildAreaSummary = (areaKey: string, cells: CellSnapshot[]): AreaSummary => {
  let criticalCount = 0
  let atRiskCount = 0
  let okCount = 0
  let totalFlags = 0

  for (const cell of cells) {
    const riskLevel = getRiskLevel(cell.flags)
    totalFlags += cell.flags.length

    if (riskLevel === 'CRITICAL') {
      criticalCount++
      continue
    }

    if (riskLevel === 'AT_RISK') {
      atRiskCount++
      continue
    }

    okCount++
  }

  return {
    areaKey,
    stationCount: cells.length,
    criticalCount,
    atRiskCount,
    okCount,
    totalFlags
  }
}

/**
 * Build summaries for all areas
 */
const buildAreaSummaries = (byArea: Record<string, CellSnapshot[]>): AreaSummary[] => {
  const summaries: AreaSummary[] = []

  for (const [areaKey, cells] of Object.entries(byArea)) {
    summaries.push(buildAreaSummary(areaKey, cells))
  }

  return summaries.sort((a, b) => a.areaKey.localeCompare(b.areaKey))
}

/**
 * Create empty stats object
 */
const emptyStats = (): CrossRefStats => ({
  totalCells: 0,
  cellsWithRisks: 0,
  totalFlags: 0,
  robotCount: 0,
  toolCount: 0,
  weldGunCount: 0,
  riserCount: 0
})

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook to access cross-reference data with derived aggregates
 *
 * Returns cells, stats, areas, and groupings for dashboard consumption.
 * Designed to be swappable with a real backend later.
 */
export function useCrossRefData(): CrossRefDataResult {
  const [data, setData] = useState<CrossRefResult | null>(crossRefStore)

  useEffect(() => {
    log.info('[useCrossRefData] Hook mounted, initial data:', crossRefStore ? `${crossRefStore.cells.length} cells` : 'null')

    // Sync with current store state
    setData(crossRefStore)

    // Subscribe to future changes
    const unsubscribe = subscribeToCrossRef(() => {
      const newData = getCrossRefData()
      log.info('[useCrossRefData] Store updated, refreshing component with', newData ? `${newData.cells.length} cells` : 'null')
      setData(newData)
    })

    return () => {
      log.info('[useCrossRefData] Hook unmounting')
      unsubscribe()
    }
  }, [])

  // Memoize derived data to avoid recalculation on every render
  const result = useMemo((): CrossRefDataResult => {
    // Guard: no data loaded
    if (data === null) {
      return {
        cells: [],
        stats: emptyStats(),
        globalFlags: [],
        healthSummaries: [],
        areas: [],
        byArea: {},
        areaSummaries: [],
        loading: false,
        error: null,
        hasData: false
      }
    }

    const cells = data.cells
    const areas = extractAreas(cells)
    const byArea = groupByArea(cells)
    const areaSummaries = buildAreaSummaries(byArea)
    const healthSummaries = data.cellHealthSummaries ?? buildCellHealthSummaries(cells)

    return {
      cells,
      stats: data.stats,
      globalFlags: data.globalFlags,
      healthSummaries,
      areas,
      byArea,
      areaSummaries,
      loading: false,
      error: null,
      hasData: cells.length > 0
    }
  }, [data])

  return result
}

// ============================================================================
// SELECTOR HOOKS (for specific data slices)
// ============================================================================

/**
 * Hook to get cells filtered by area
 */
export function useCrossRefCellsByArea(areaKey: string | null): CellSnapshot[] {
  const { byArea } = useCrossRefData()

  if (areaKey === null) return []

  return byArea[areaKey] ?? []
}

/**
 * Hook to get cells with specific risk level
 */
export function useCrossRefCellsByRisk(riskLevel: CellRiskLevel): CellSnapshot[] {
  const { cells } = useCrossRefData()

  return useMemo(() => {
    return cells.filter(cell => getRiskLevel(cell.flags) === riskLevel)
  }, [cells, riskLevel])
}

/**
 * Hook to get cells with any flags
 */
export function useCrossRefCellsWithFlags(): CellSnapshot[] {
  const { cells } = useCrossRefData()

  return useMemo(() => {
    return cells.filter(cell => cell.flags.length > 0)
  }, [cells])
}

/**
 * Hook to get health summary for a specific station
 */
export function useCrossRefHealthSummary(stationKey: string): CellHealthSummary | undefined {
  const { healthSummaries } = useCrossRefData()

  return useMemo(() => {
    return healthSummaries.find(h => h.stationKey === stationKey)
  }, [healthSummaries, stationKey])
}
