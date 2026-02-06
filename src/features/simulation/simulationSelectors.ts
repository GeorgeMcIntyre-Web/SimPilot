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
// COMPLETION THRESHOLDS
// ============================================================================

export const COMPLETION_HIGH = 80
export const COMPLETION_MID = 50
export const COMPLETION_LOW = 25

export type CompletionTier = 'high' | 'mid' | 'low' | 'critical' | 'none'

export function getCompletionTier(percent: number | null | undefined): CompletionTier {
  if (percent === null || percent === undefined) return 'none'
  if (percent >= COMPLETION_HIGH) return 'high'
  if (percent >= COMPLETION_MID) return 'mid'
  if (percent >= COMPLETION_LOW) return 'low'
  return 'critical'
}

const completionTextClasses: Record<CompletionTier, string> = {
  high: 'text-emerald-600 dark:text-emerald-400',
  mid: 'text-blue-600 dark:text-blue-400',
  low: 'text-amber-600 dark:text-amber-400',
  critical: 'text-red-600 dark:text-red-400',
  none: 'text-gray-500 dark:text-gray-400'
}

const completionBadgeClasses: Record<CompletionTier, string> = {
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  mid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  low: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  none: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
}

const completionBarClasses: Record<CompletionTier, string> = {
  high: 'bg-emerald-500',
  mid: 'bg-blue-500',
  low: 'bg-amber-500',
  critical: 'bg-red-500',
  none: 'bg-gray-400'
}

export function getCompletionTextClass(percent: number | null | undefined): string {
  return completionTextClasses[getCompletionTier(percent)]
}

export function getCompletionBadgeClass(percent: number | null | undefined): string {
  return completionBadgeClasses[getCompletionTier(percent)]
}

export function getCompletionBarClass(percent: number | null | undefined): string {
  return completionBarClasses[getCompletionTier(percent)]
}

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
  const expectingReuse = useStationsExpectingReuse()
  const lowCompletion = useStationsLowCompletion(30)
  
  return useMemo(() => {
    // Combine and dedupe by station key
    const seen = new Set<string>()
    const combined: StationAttentionItem[] = []
    
    // Priority order: errors first, then warnings, then info
    const allItems = [
      ...lowCompletion,
      ...expectingReuse
    ]
    
    for (const item of allItems) {
      if (seen.has(item.station.contextKey)) continue
      seen.add(item.station.contextKey)
      combined.push(item)
    }
    
    return combined.slice(0, 10) // Top 10 items
  }, [expectingReuse, lowCompletion])
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
 * Aggregated counts and stations grouped by line
 */
export interface LineAggregation {
  lineKey: string
  unit: string
  line: string
  stations: StationContext[]
  stationCount: number
  assetCounts: AssetCounts
  sourcingCounts: SourcingCounts
  avgCompletion: number | null
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
      let completionSum = 0
      let completionCount = 0

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

        const completion = station.simulationStatus?.firstStageCompletion
        if (completion !== undefined) {
          completionSum += completion
          completionCount++
        }
      }

      aggregations.push({
        lineKey,
        unit: lineStations[0].unit,
        line: lineStations[0].line,
        stations: lineStations,
        stationCount: lineStations.length,
        assetCounts,
        sourcingCounts,
        avgCompletion: completionCount > 0 ? Math.round(completionSum / completionCount) : null
      })
    }
    
    return aggregations.sort((a, b) => a.lineKey.localeCompare(b.lineKey))
  }, [stations])
}
