// Dashboard Utility Functions
// Pure functions for deriving dashboard metrics and status

import { CellSnapshot, CrossRefFlag, CellRiskLevel } from '../../domain/crossRef/CrossRefTypes'

// ============================================================================
// RISK CALCULATION
// ============================================================================

/**
 * Determine risk level from flags
 */
export const getRiskLevel = (flags: CrossRefFlag[]): CellRiskLevel => {
  if (flags.length === 0) return 'OK'

  const hasError = flags.some(f => f.severity === 'ERROR')
  if (hasError) return 'CRITICAL'

  const hasWarning = flags.some(f => f.severity === 'WARNING')
  if (hasWarning) return 'AT_RISK'

  return 'OK'
}

/**
 * Get status text for display
 */
export const getStatusText = (riskLevel: CellRiskLevel): string => {
  if (riskLevel === 'CRITICAL') return 'Blocked'
  if (riskLevel === 'AT_RISK') return 'At Risk'
  return 'On Track'
}

// ============================================================================
// COMPLETION CALCULATION
// ============================================================================

/**
 * Calculate completion percentage from simulation status
 * Uses firstStageCompletion as primary metric
 */
export const getCompletionPercent = (cell: CellSnapshot): number | null => {
  const simStatus = cell.simulationStatus
  if (simStatus === undefined) return null

  const completion = simStatus.firstStageCompletion
  if (completion === undefined) return null
  if (typeof completion !== 'number') return null

  return Math.round(completion)
}

/**
 * Calculate approximate health score for a cell
 * Formula: 100 - (flags × 10), clamped to 0-100
 */
export const getHealthScore = (cell: CellSnapshot): number => {
  const flagCount = cell.flags.length
  const penalty = flagCount * 15
  const score = 100 - penalty

  if (score < 0) return 0
  if (score > 100) return 100

  return score
}

// ============================================================================
// AREA COUNTS
// ============================================================================

export interface AreaCounts {
  total: number
  critical: number
  atRisk: number
  ok: number
}

/**
 * Count stations by risk level for an area
 */
export const countByRisk = (cells: CellSnapshot[]): AreaCounts => {
  let critical = 0
  let atRisk = 0
  let ok = 0

  for (const cell of cells) {
    const risk = getRiskLevel(cell.flags)

    if (risk === 'CRITICAL') {
      critical++
      continue
    }

    if (risk === 'AT_RISK') {
      atRisk++
      continue
    }

    ok++
  }

  return {
    total: cells.length,
    critical,
    atRisk,
    ok
  }
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export type SeverityFilter = 'all' | 'error' | 'warning' | 'none'

/**
 * Filter cells by severity
 */
export const filterBySeverity = (cells: CellSnapshot[], filter: SeverityFilter): CellSnapshot[] => {
  if (filter === 'all') return cells

  if (filter === 'error') {
    return cells.filter(c => c.flags.some(f => f.severity === 'ERROR'))
  }

  if (filter === 'warning') {
    return cells.filter(c => {
      const hasWarning = c.flags.some(f => f.severity === 'WARNING')
      const hasError = c.flags.some(f => f.severity === 'ERROR')
      return hasWarning && !hasError
    })
  }

  // 'none' - no flags
  return cells.filter(c => c.flags.length === 0)
}

/**
 * Filter cells by area
 */
export const filterByArea = (cells: CellSnapshot[], areaKey: string | null): CellSnapshot[] => {
  if (areaKey === null) return cells

  return cells.filter(c => (c.areaKey ?? 'Unknown') === areaKey)
}

/**
 * Filter cells by search term (matches station key)
 */
export const filterBySearch = (cells: CellSnapshot[], searchTerm: string): CellSnapshot[] => {
  if (searchTerm.trim() === '') return cells

  const term = searchTerm.toLowerCase()
  return cells.filter(c => c.stationKey.toLowerCase().includes(term))
}

// ============================================================================
// SORTING
// ============================================================================

export type SortKey = 'station' | 'area' | 'application' | 'robots' | 'completion' | 'flags' | 'risk'
export type SortDirection = 'asc' | 'desc'

/**
 * Sort cells by a given key
 */
export const sortCells = (
  cells: CellSnapshot[],
  sortKey: SortKey,
  direction: SortDirection
): CellSnapshot[] => {
  const sorted = [...cells].sort((a, b) => {
    let comparison = 0

    if (sortKey === 'station') {
      comparison = a.stationKey.localeCompare(b.stationKey)
    }

    if (sortKey === 'area') {
      const areaA = a.areaKey ?? 'Unknown'
      const areaB = b.areaKey ?? 'Unknown'
      comparison = areaA.localeCompare(areaB)
    }

    if (sortKey === 'application') {
      const appA = a.simulationStatus?.application ?? ''
      const appB = b.simulationStatus?.application ?? ''
      comparison = appA.localeCompare(appB)
    }

    if (sortKey === 'robots') {
      const robotsA = a.robots?.length ?? 0
      const robotsB = b.robots?.length ?? 0
      comparison = robotsA - robotsB
    }

    if (sortKey === 'completion') {
      const compA = getCompletionPercent(a) ?? -1
      const compB = getCompletionPercent(b) ?? -1
      comparison = compA - compB
    }

    if (sortKey === 'flags') {
      comparison = a.flags.length - b.flags.length
    }

    if (sortKey === 'risk') {
      const riskOrder = { OK: 0, AT_RISK: 1, CRITICAL: 2 }
      const riskA = riskOrder[getRiskLevel(a.flags)]
      const riskB = riskOrder[getRiskLevel(b.flags)]
      comparison = riskA - riskB
    }

    return comparison
  })

  if (direction === 'desc') {
    return sorted.reverse()
  }

  return sorted
}

// ============================================================================
// FOCUS ITEMS (Today s Overview)
// ============================================================================

export interface FocusItem {
  id: string
  title: string
  count: number
  severity: 'info' | 'warning' | 'danger'
  description: string
}

/**
 * Generate focus items for "Today s Overview" section
 */
export const generateFocusItems = (cells: CellSnapshot[]): FocusItem[] => {
  const items: FocusItem[] = []

  // Count stations without simulation status
  const missingSimStatus = cells.filter(c => c.simulationStatus === undefined)
  if (missingSimStatus.length > 0) {
    items.push({
      id: 'missing-sim-status',
      title: 'Missing Sim Status',
      count: missingSimStatus.length,
      severity: 'warning',
      description: 'Stations found in asset lists but not in Simulation Status sheet'
    })
  }

  // Count guns without force data
  const gunsWithoutForce = cells.filter(c =>
    c.flags.some(f => f.type === 'MISSING_GUN_FORCE_FOR_WELD_GUN')
  )
  if (gunsWithoutForce.length > 0) {
    items.push({
      id: 'guns-without-force',
      title: 'Guns Without Force',
      count: gunsWithoutForce.length,
      severity: 'warning',
      description: 'Weld guns without corresponding force data in Zangenpool'
    })
  }

  // Count robots missing dress pack info
  const robotsMissingDressPack = cells.filter(c =>
    c.flags.some(f => f.type === 'ROBOT_MISSING_DRESS_PACK_INFO')
  )
  if (robotsMissingDressPack.length > 0) {
    items.push({
      id: 'robots-missing-dress-pack',
      title: 'Robots Missing Dress Pack',
      count: robotsMissingDressPack.length,
      severity: 'info',
      description: 'Robots without Dress Pack or Order Code information'
    })
  }

  // Count tools without owner
  const toolsWithoutOwner = cells.filter(c =>
    c.flags.some(f => f.type === 'TOOL_WITHOUT_OWNER')
  )
  if (toolsWithoutOwner.length > 0) {
    items.push({
      id: 'tools-without-owner',
      title: 'Unassigned Tools',
      count: toolsWithoutOwner.length,
      severity: 'info',
      description: 'Tools without Sim Leader or Team Leader assigned'
    })
  }

  // Count critical stations
  const criticalStations = cells.filter(c => getRiskLevel(c.flags) === 'CRITICAL')
  if (criticalStations.length > 0) {
    items.push({
      id: 'critical-stations',
      title: 'Critical Stations',
      count: criticalStations.length,
      severity: 'danger',
      description: 'Stations with blocking issues that need immediate attention'
    })
  }

  return items.slice(0, 4) // Limit to top 4 focus items
}
