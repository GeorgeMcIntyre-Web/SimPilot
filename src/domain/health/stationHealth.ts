// Station Health Model
// Computes overall health score and traffic light for a station/cell

import {
  CellSnapshot,
  CrossRefFlag,
  SimulationStatusSnapshot
} from '../crossRef/CrossRefTypes'
import { describeFlag } from './flagMessages'

// ============================================================================
// TYPES
// ============================================================================

export type TrafficLight = 'RED' | 'AMBER' | 'GREEN'

export interface StationHealthResult {
  score: number
  trafficLight: TrafficLight
  reasons: string[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ERROR_PENALTY = 15
const WARNING_PENALTY = 5
const MIN_SCORE = 0
const MAX_SCORE = 100

// Traffic light thresholds
const RED_THRESHOLD = 50
const AMBER_THRESHOLD = 80

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract numeric metrics from simulation status (values between 0 and 100)
 */
const extractNumericMetrics = (simStatus: SimulationStatusSnapshot | undefined): number[] => {
  if (!simStatus) return []

  const raw = simStatus.raw
  if (!raw) return []

  const metrics: number[] = []

  // Check stageMetrics in raw if present (from ParsedSimulationRow)
  const stageMetrics = (raw as Record<string, unknown>)['stageMetrics']
  if (stageMetrics && typeof stageMetrics === 'object') {
    for (const value of Object.values(stageMetrics as Record<string, unknown>)) {
      if (!isValidMetricValue(value)) continue
      metrics.push(value as number)
    }
    return metrics
  }

  // Check metrics field directly
  const metricsField = (raw as Record<string, unknown>)['metrics']
  if (metricsField && typeof metricsField === 'object') {
    for (const value of Object.values(metricsField as Record<string, unknown>)) {
      if (!isValidMetricValue(value)) continue
      metrics.push(value as number)
    }
    return metrics
  }

  // Fallback: check firstStageCompletion and finalDeliverablesCompletion
  if (isValidMetricValue(simStatus.firstStageCompletion)) {
    metrics.push(simStatus.firstStageCompletion!)
  }
  if (isValidMetricValue(simStatus.finalDeliverablesCompletion)) {
    metrics.push(simStatus.finalDeliverablesCompletion!)
  }

  return metrics
}

/**
 * Check if a value is a valid numeric metric (number between 0 and 100)
 */
const isValidMetricValue = (value: unknown): value is number => {
  if (typeof value !== 'number') return false
  if (Number.isNaN(value)) return false
  if (value < 0 || value > 100) return false
  return true
}

/**
 * Calculate average of numeric values
 */
const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return sum / values.length
}

/**
 * Count flags by severity
 */
const countFlagsBySeverity = (flags: CrossRefFlag[]): { errors: number; warnings: number } => {
  let errors = 0
  let warnings = 0

  for (const flag of flags) {
    if (flag.severity === 'ERROR') {
      errors++
      continue
    }
    warnings++
  }

  return { errors, warnings }
}

/**
 * Clamp a value between min and max
 */
const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Determine traffic light from score
 */
const getTrafficLight = (score: number): TrafficLight => {
  if (score < RED_THRESHOLD) return 'RED'
  if (score < AMBER_THRESHOLD) return 'AMBER'
  return 'GREEN'
}

/**
 * Build reasons list from flags
 */
const buildReasons = (flags: CrossRefFlag[]): string[] => {
  const reasons: string[] = []

  for (const flag of flags) {
    const description = describeFlag(flag)
    reasons.push(description)
  }

  return reasons
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Compute the overall health of a station/cell
 *
 * Rules:
 * - Start from base completion (average of all numeric metrics 0-100)
 * - If simulationStatus is missing, base completion is 0
 * - Each ERROR reduces score by 15
 * - Each WARNING reduces score by 5
 * - Score is clamped between 0 and 100
 * - Traffic light: < 50 → RED, 50-79 → AMBER, >= 80 → GREEN
 */
export const computeStationHealth = (cell: CellSnapshot): StationHealthResult => {
  // Guard clause: handle missing simulation status
  if (!cell.simulationStatus) {
    const flags = cell.flags || []
    const { errors, warnings } = countFlagsBySeverity(flags)
    const penalty = (errors * ERROR_PENALTY) + (warnings * WARNING_PENALTY)
    const score = clamp(0 - penalty, MIN_SCORE, MAX_SCORE)

    return {
      score,
      trafficLight: getTrafficLight(score),
      reasons: buildReasons(flags)
    }
  }

  // Calculate base completion from metrics
  const numericMetrics = extractNumericMetrics(cell.simulationStatus)
  const baseCompletion = calculateAverage(numericMetrics)

  // Calculate penalty from flags
  const flags = cell.flags || []
  const { errors, warnings } = countFlagsBySeverity(flags)
  const penalty = (errors * ERROR_PENALTY) + (warnings * WARNING_PENALTY)

  // Calculate final score
  const rawScore = baseCompletion - penalty
  const score = clamp(Math.round(rawScore), MIN_SCORE, MAX_SCORE)

  return {
    score,
    trafficLight: getTrafficLight(score),
    reasons: buildReasons(flags)
  }
}
