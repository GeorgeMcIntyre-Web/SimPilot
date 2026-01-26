// Cell Health Summary
// Transforms CellSnapshot into UI-ready health summaries for Dale's dashboard

import {
  CellSnapshot,
  CellHealthSummary,
  CellRiskLevel,
  CrossRefFlag
} from './CrossRefTypes'

// ============================================================================
// RISK LEVEL CALCULATION
// ============================================================================

interface RiskResult {
  riskLevel: CellRiskLevel
  criticalReasons: string[]
  warningReasons: string[]
}

/**
 * Calculate risk level from flags
 *
 * Rules:
 * - No flags → OK
 * - At least one WARNING, no ERROR → AT_RISK
 * - Any ERROR → CRITICAL
 */
const getBaseRiskLevel = (flags: CrossRefFlag[]): RiskResult => {
  if (flags.length === 0) {
    return {
      riskLevel: 'OK',
      criticalReasons: [],
      warningReasons: []
    }
  }

  let riskLevel: CellRiskLevel = 'OK'
  const criticalReasons: string[] = []
  const warningReasons: string[] = []

  for (const flag of flags) {
    if (flag.severity === 'ERROR') {
      riskLevel = 'CRITICAL'
      criticalReasons.push(flag.message)
      continue
    }

    if (flag.severity === 'WARNING') {
      if (riskLevel === 'OK') {
        riskLevel = 'AT_RISK'
      }
      warningReasons.push(flag.message)
    }
  }

  return { riskLevel, criticalReasons, warningReasons }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Safely extract a completion percentage value
 */
const getCompletionValue = (value: unknown): number | undefined => {
  if (typeof value !== 'number') return undefined
  if (Number.isNaN(value)) return undefined
  return value
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Transform a CellSnapshot into a UI-ready CellHealthSummary
 */
export const summarizeCellHealth = (cell: CellSnapshot): CellHealthSummary => {
  const flags = cell.flags || []

  const simulationStatus = cell.simulationStatus
  const hasSimulationStatus = Boolean(simulationStatus)

  const firstStageCompletion = simulationStatus
    ? getCompletionValue(simulationStatus.firstStageCompletion)
    : undefined

  const finalDeliverablesCompletion = simulationStatus
    ? getCompletionValue(simulationStatus.finalDeliverablesCompletion)
    : undefined

  const dcsConfigured = simulationStatus
    ? simulationStatus.dcsConfigured
    : undefined

  const robotCount = cell.robots ? cell.robots.length : 0
  const toolCount = cell.tools ? cell.tools.length : 0
  const weldGunCount = cell.weldGuns ? cell.weldGuns.length : 0
  const gunForceCount = cell.gunForces ? cell.gunForces.length : 0
  const riserCount = cell.risers ? cell.risers.length : 0

  const { riskLevel, criticalReasons, warningReasons } = getBaseRiskLevel(flags)

  return {
    stationKey: cell.stationKey,
    displayCode: cell.displayCode,
    areaKey: cell.areaKey,

    hasSimulationStatus,

    firstStageCompletion,
    finalDeliverablesCompletion,
    dcsConfigured,

    robotCount,
    toolCount,
    weldGunCount,
    gunForceCount,
    riserCount,

    riskLevel,
    flags,
    criticalReasons,
    warningReasons
  }
}

/**
 * Build health summaries for all cells
 */
export const buildCellHealthSummaries = (
  cells: CellSnapshot[]
): CellHealthSummary[] => {
  if (cells.length === 0) return []

  return cells.map(c => summarizeCellHealth(c))
}
