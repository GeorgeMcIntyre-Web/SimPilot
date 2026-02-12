// Dashboard Utility Functions
// Pure functions for deriving dashboard metrics and status

import { CellSnapshot, CellRiskLevel } from '../../domain/crossRef/CrossRefTypes'
import { normalizeStationCode } from '../../ingestion/normalizers'

const APPLICATION_KEYS = [
  'applicationCode',
  'Code',
  'function',
  'Function',
  'application',
  'robotApplication',
  'Robot Application',
]

const extractApplicationValues = (raw: unknown): string[] => {
  const values: string[] = []
  const source = (raw ?? {}) as Record<string, unknown>
  const metadata = (source.metadata ?? {}) as Record<string, unknown>

  for (const key of APPLICATION_KEYS) {
    const fromMetadata = metadata[key]
    if (fromMetadata !== undefined && fromMetadata !== null) {
      values.push(String(fromMetadata).trim())
      continue
    }

    const fromRoot = source[key]
    if (fromRoot !== undefined && fromRoot !== null) {
      values.push(String(fromRoot).trim())
    }
  }

  return values.filter((v) => v.length > 0)
}

const collectApplications = (cell: CellSnapshot): string[] => {
  const applications: string[] = []
  const seen = new Set<string>()

  const add = (value: string) => {
    const normalized = value.trim()
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    applications.push(normalized)
  }

  for (const robot of cell.robots || []) {
    extractApplicationValues(robot.raw).forEach(add)
  }

  for (const tool of cell.tools || []) {
    extractApplicationValues(tool.raw).forEach(add)
  }

  return applications
}

export const getApplicationDisplay = (cell: CellSnapshot): string => {
  const applications = collectApplications(cell)
  if (applications.length === 0) return '-'
  return applications.join(' + ')
}

// ============================================================================
// RISK CALCULATION
// ============================================================================

/**
 * Determine risk level combining flags + simulation signals
 * Completed stations (100%) are considered OK unless they have ERROR-level flags
 */
export const getRiskLevel = (cell: CellSnapshot): CellRiskLevel => {
  const flags = cell.flags || []
  const completion = getCompletionPercent(cell)
  const isComplete = completion === 100

  const hasError = flags.some((f) => f.severity === 'ERROR')
  if (hasError) return 'CRITICAL'

  // Completed stations are OK - warnings are informational only
  if (isComplete) return 'OK'

  // Simulation signals push to At Risk even without flags
  if (cell.simulationStatus?.hasIssues) {
    return 'AT_RISK'
  }

  const hasWarning = flags.some((f) => f.severity === 'WARNING')
  if (hasWarning) return 'AT_RISK'

  // Very low completion without other signals is still At Risk
  if (completion !== null && completion > 0 && completion < 50) {
    return 'AT_RISK'
  }

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
    const risk = getRiskLevel(cell)

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
    ok,
  }
}

// ============================================================================
// STATUS LABELS
// ============================================================================

export type StatusLabel =
  | 'Complete'
  | 'Nearly Complete'
  | 'On Track'
  | 'In Progress'
  | 'Starting'
  | 'Not Started'
  | 'No data'

/**
 * Derives status label from completion percentage
 */
export const getStatusLabel = (completion: number | null): StatusLabel => {
  if (completion === null) return 'No data'
  if (completion === 100) return 'Complete'
  if (completion >= 90) return 'Nearly Complete'
  if (completion >= 70) return 'On Track'
  if (completion >= 30) return 'In Progress'
  if (completion > 0) return 'Starting'
  return 'Not Started'
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export type StatusFilter = 'all' | StatusLabel

/**
 * Filter cells by progress status label
 */
export const filterByStatus = (cells: CellSnapshot[], filter: StatusFilter): CellSnapshot[] => {
  if (filter === 'all') return cells

  // Handle status label filtering
  return cells.filter((c) => {
    const completion = getCompletionPercent(c)
    return getStatusLabel(completion) === filter
  })
}

/**
 * Filter cells by area
 */
export const filterByArea = (cells: CellSnapshot[], areaKey: string | null): CellSnapshot[] => {
  if (areaKey === null) return cells

  return cells.filter((c) => (c.areaKey ?? 'Unknown') === areaKey)
}

/**
 * Filter cells by search term (matches station key)
 */
export const filterBySearch = (cells: CellSnapshot[], searchTerm: string): CellSnapshot[] => {
  if (searchTerm.trim() === '') return cells

  const normTerm = normalizeStationCode(searchTerm)
  const searchLower = searchTerm.toLowerCase()

  return cells.filter((c) => {
    // Try matching by normalized station code first (e.g., "010" matches "10")
    if (normTerm) {
      const normStation = normalizeStationCode(c.stationKey)
      if (normStation && normStation.includes(normTerm)) return true
    }

    // Fallback: check if search term is in raw station key or display code
    const lowerTerm = searchLower
    return (
      c.stationKey.toLowerCase().includes(lowerTerm) ||
      c.displayCode.toLowerCase().includes(lowerTerm)
    )
  })
}

// ============================================================================
// SORTING
// ============================================================================

export type SortKey =
  | 'station'
  | 'area'
  | 'application'
  | 'simulator'
  | 'robots'
  | 'completion'
  | 'risk'
export type SortDirection = 'asc' | 'desc'

/**
 * Sort cells by a given key
 */
export const sortCells = (
  cells: CellSnapshot[],
  sortKey: SortKey,
  direction: SortDirection,
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
      const appA = getApplicationDisplay(a)
      const appB = getApplicationDisplay(b)
      const safeA = appA === '-' ? '' : appA
      const safeB = appB === '-' ? '' : appB
      comparison = safeA.localeCompare(safeB)
    }

    if (sortKey === 'simulator') {
      const simA = a.simulationStatus?.engineer?.trim() || 'UNASSIGNED'
      const simB = b.simulationStatus?.engineer?.trim() || 'UNASSIGNED'
      comparison = simA.localeCompare(simB)
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

    if (sortKey === 'risk') {
      const riskOrder = { OK: 0, AT_RISK: 1, CRITICAL: 2 }
      const riskA = riskOrder[getRiskLevel(a)]
      const riskB = riskOrder[getRiskLevel(b)]
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
  const missingSimStatus = cells.filter((c) => c.simulationStatus === undefined)
  if (missingSimStatus.length > 0) {
    items.push({
      id: 'missing-sim-status',
      title: 'Missing Sim Status',
      count: missingSimStatus.length,
      severity: 'warning',
      description: 'Stations found in asset lists but not in Simulation Status sheet',
    })
  }

  // Count guns without force data
  const gunsWithoutForce = cells.filter((c) =>
    c.flags.some((f) => f.type === 'MISSING_GUN_FORCE_FOR_WELD_GUN'),
  )
  if (gunsWithoutForce.length > 0) {
    items.push({
      id: 'guns-without-force',
      title: 'Guns Without Force',
      count: gunsWithoutForce.length,
      severity: 'warning',
      description: 'Weld guns without corresponding force data in Zangenpool',
    })
  }

  // Count robots missing dress pack info
  const robotsMissingDressPack = cells.filter((c) =>
    c.flags.some((f) => f.type === 'ROBOT_MISSING_DRESS_PACK_INFO'),
  )
  if (robotsMissingDressPack.length > 0) {
    items.push({
      id: 'robots-missing-dress-pack',
      title: 'Robots Missing Dress Pack',
      count: robotsMissingDressPack.length,
      severity: 'info',
      description: 'Robots without Dress Pack or Order Code information',
    })
  }

  // Count tools without owner
  const toolsWithoutOwner = cells.filter((c) =>
    c.flags.some((f) => f.type === 'TOOL_WITHOUT_OWNER'),
  )
  if (toolsWithoutOwner.length > 0) {
    items.push({
      id: 'tools-without-owner',
      title: 'Unassigned Tools',
      count: toolsWithoutOwner.length,
      severity: 'info',
      description: 'Tools without Sim Leader or Team Leader assigned',
    })
  }

  // Count critical stations
  const criticalStations = cells.filter((c) => getRiskLevel(c) === 'CRITICAL')
  if (criticalStations.length > 0) {
    items.push({
      id: 'critical-stations',
      title: 'Critical Stations',
      count: criticalStations.length,
      severity: 'danger',
      description: 'Stations with blocking issues that need immediate attention',
    })
  }

  return items.slice(0, 4) // Limit to top 4 focus items
}
