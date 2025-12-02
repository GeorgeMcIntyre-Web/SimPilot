// Simulation Selectors
// Derived selectors for simulation data - used by UI components
// Follows guard clauses, no else, max nesting 2

import { useMemo } from 'react'
import {
  useAllStations,
  useFilteredStations,
  type StationContext,
  type AssetCounts,
  type SourcingCounts
} from './simulationStore'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Station needing attention with reason
 */
export interface StationAttentionItem {
  station: StationContext
  reason: string
  severity: 'warning' | 'error' | 'info'
  metric?: number
}

/**
 * Summary statistics for filtered stations
 */
export interface StationsSummary {
  totalStations: number
  totalAssets: number
  totalRobots: number
  totalGuns: number
  totalReuse: number
  totalNewBuy: number
  totalUnknown: number
  avgCompletion: number | null
}

/**
 * Filter state for the simulation board
 */
export interface SimulationFilters {
  program: string | null
  plant: string | null
  unit: string | null
  searchTerm: string
}

// ============================================================================
// ATTENTION SELECTORS
// ============================================================================

/**
 * Get stations with high UNKNOWN sourcing count
 * These need attention because sourcing is unclear
 */
export function useStationsWithUnknownSourcing(threshold: number = 2): StationAttentionItem[] {
  const stations = useAllStations()
  
  return useMemo(() => {
    const items: StationAttentionItem[] = []
    
    for (const station of stations) {
      if (station.sourcingCounts.unknown < threshold) continue
      
      items.push({
        station,
        reason: `${station.sourcingCounts.unknown} assets with unknown sourcing`,
        severity: 'warning',
        metric: station.sourcingCounts.unknown
      })
    }
    
    return items.sort((a, b) => (b.metric ?? 0) - (a.metric ?? 0))
  }, [stations, threshold])
}

/**
 * Get stations where reuse was expected but none attached
 * Based on having robots/guns but zero reuse count
 */
export function useStationsExpectingReuse(): StationAttentionItem[] {
  const stations = useAllStations()
  
  return useMemo(() => {
    const items: StationAttentionItem[] = []
    
    for (const station of stations) {
      // Skip if no guns - less likely to need reuse tracking
      if (station.assetCounts.guns === 0) continue
      // Skip if already has reuse
      if (station.sourcingCounts.reuse > 0) continue
      if (station.sourcingCounts.freeIssue > 0) continue
      
      items.push({
        station,
        reason: `${station.assetCounts.guns} guns but no reuse tracked`,
        severity: 'info',
        metric: station.assetCounts.guns
      })
    }
    
    return items.sort((a, b) => (b.metric ?? 0) - (a.metric ?? 0))
  }, [stations])
}

/**
 * Get stations with low completion (incomplete simulation)
 */
export function useStationsLowCompletion(threshold: number = 30): StationAttentionItem[] {
  const stations = useAllStations()
  
  return useMemo(() => {
    const items: StationAttentionItem[] = []
    
    for (const station of stations) {
      const completion = station.simulationStatus?.firstStageCompletion
      if (completion === undefined) continue
      if (completion >= threshold) continue
      
      items.push({
        station,
        reason: `Only ${completion}% complete`,
        severity: 'error',
        metric: completion
      })
    }
    
    return items.sort((a, b) => (a.metric ?? 100) - (b.metric ?? 100))
  }, [stations, threshold])
}

/**
 * Get all stations needing attention for Dale's Today Panel
 */
export function useStationsNeedingAttention(): StationAttentionItem[] {
  const unknownSourcing = useStationsWithUnknownSourcing(2)
  const expectingReuse = useStationsExpectingReuse()
  const lowCompletion = useStationsLowCompletion(30)
  
  return useMemo(() => {
    // Combine and dedupe by station key
    const seen = new Set<string>()
    const combined: StationAttentionItem[] = []
    
    // Priority order: errors first, then warnings, then info
    const allItems = [
      ...lowCompletion,
      ...unknownSourcing,
      ...expectingReuse
    ]
    
    for (const item of allItems) {
      if (seen.has(item.station.contextKey)) continue
      seen.add(item.station.contextKey)
      combined.push(item)
    }
    
    return combined.slice(0, 10) // Top 10 items
  }, [unknownSourcing, expectingReuse, lowCompletion])
}

// ============================================================================
// SUMMARY SELECTORS
// ============================================================================

/**
 * Calculate summary statistics for a list of stations
 */
function calculateSummary(stations: StationContext[]): StationsSummary {
  let totalAssets = 0
  let totalRobots = 0
  let totalGuns = 0
  let totalReuse = 0
  let totalNewBuy = 0
  let totalUnknown = 0
  let completionSum = 0
  let completionCount = 0
  
  for (const station of stations) {
    totalAssets += station.assetCounts.total
    totalRobots += station.assetCounts.robots
    totalGuns += station.assetCounts.guns
    totalReuse += station.sourcingCounts.reuse + station.sourcingCounts.freeIssue
    totalNewBuy += station.sourcingCounts.newBuy
    totalUnknown += station.sourcingCounts.unknown
    
    const completion = station.simulationStatus?.firstStageCompletion
    if (completion !== undefined) {
      completionSum += completion
      completionCount++
    }
  }
  
  return {
    totalStations: stations.length,
    totalAssets,
    totalRobots,
    totalGuns,
    totalReuse,
    totalNewBuy,
    totalUnknown,
    avgCompletion: completionCount > 0 ? Math.round(completionSum / completionCount) : null
  }
}

/**
 * Hook to get summary for all stations
 */
export function useAllStationsSummary(): StationsSummary {
  const stations = useAllStations()
  return useMemo(() => calculateSummary(stations), [stations])
}

/**
 * Hook to get summary for filtered stations
 */
export function useFilteredStationsSummary(filters: {
  program?: string | null
  plant?: string | null
  unit?: string | null
  line?: string | null
}): StationsSummary {
  const stations = useFilteredStations(filters)
  return useMemo(() => calculateSummary(stations), [stations])
}

// ============================================================================
// SEARCH & FILTER HOOKS
// ============================================================================

/**
 * Hook to filter stations by search term
 */
export function useSearchedStations(
  stations: StationContext[],
  searchTerm: string
): StationContext[] {
  return useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (term === '') return stations
    
    return stations.filter(station => {
      // Search in station name
      if (station.station.toLowerCase().includes(term)) return true
      // Search in line
      if (station.line.toLowerCase().includes(term)) return true
      // Search in unit
      if (station.unit.toLowerCase().includes(term)) return true
      // Search in engineer name
      const engineer = station.simulationStatus?.engineer?.toLowerCase()
      if (engineer && engineer.includes(term)) return true
      
      return false
    })
  }, [stations, searchTerm])
}

/**
 * Combined filter and search hook for simulation board
 */
export function useSimulationBoardStations(filters: SimulationFilters): StationContext[] {
  const filteredByHierarchy = useFilteredStations({
    program: filters.program,
    plant: filters.plant,
    unit: filters.unit
  })
  
  return useSearchedStations(filteredByHierarchy, filters.searchTerm)
}

// ============================================================================
// GROUPING SELECTORS
// ============================================================================

/**
 * Group stations by line for display
 */
export function useStationsGroupedByLine(
  stations: StationContext[]
): Map<string, StationContext[]> {
  return useMemo(() => {
    const groups = new Map<string, StationContext[]>()
    
    for (const station of stations) {
      const lineKey = `${station.unit}|${station.line}`
      const existing = groups.get(lineKey) ?? []
      existing.push(station)
      groups.set(lineKey, existing)
    }
    
    return groups
  }, [stations])
}

/**
 * Get aggregated counts by line
 */
export interface LineAggregation {
  lineKey: string
  unit: string
  line: string
  stationCount: number
  assetCounts: AssetCounts
  sourcingCounts: SourcingCounts
}

export function useLineAggregations(stations: StationContext[]): LineAggregation[] {
  return useMemo(() => {
    const lineMap = new Map<string, StationContext[]>()
    
    for (const station of stations) {
      const lineKey = `${station.unit}|${station.line}`
      const existing = lineMap.get(lineKey) ?? []
      existing.push(station)
      lineMap.set(lineKey, existing)
    }
    
    const aggregations: LineAggregation[] = []
    
    for (const [lineKey, lineStations] of lineMap) {
      const assetCounts: AssetCounts = { total: 0, robots: 0, guns: 0, tools: 0, other: 0 }
      const sourcingCounts: SourcingCounts = { reuse: 0, freeIssue: 0, newBuy: 0, unknown: 0 }
      
      for (const station of lineStations) {
        assetCounts.total += station.assetCounts.total
        assetCounts.robots += station.assetCounts.robots
        assetCounts.guns += station.assetCounts.guns
        assetCounts.tools += station.assetCounts.tools
        assetCounts.other += station.assetCounts.other
        
        sourcingCounts.reuse += station.sourcingCounts.reuse
        sourcingCounts.freeIssue += station.sourcingCounts.freeIssue
        sourcingCounts.newBuy += station.sourcingCounts.newBuy
        sourcingCounts.unknown += station.sourcingCounts.unknown
      }
      
      aggregations.push({
        lineKey,
        unit: lineStations[0].unit,
        line: lineStations[0].line,
        stationCount: lineStations.length,
        assetCounts,
        sourcingCounts
      })
    }
    
    return aggregations.sort((a, b) => a.lineKey.localeCompare(b.lineKey))
  }, [stations])
}
