/**
 * Shared helpers for Simulation Status parsing.
 * Provides normalization, identifier parsing, and common calculations.
 */
import { SimulationMilestones } from './simulationStatusTypes'

export function normalizeStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

export function normalizeNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const num = Number(val)
  return isNaN(num) ? null : num
}

/**
 * Safely read a column value from a raw Excel row, handling stray spacing/case
 * in header names (common in vendor spreadsheets).
 */
export function getColumnValue(raw: Record<string, unknown>, columnName: string): unknown {
  if (raw[columnName] !== undefined) return raw[columnName]

  const target = columnName.trim().toUpperCase()
  for (const [rawKey, rawValue] of Object.entries(raw)) {
    if (rawKey.trim().toUpperCase() === target) {
      return rawValue
    }
  }
  return undefined
}

/**
 * Parse station identifier like "9B-100" into area and station
 */
export function parseStationIdentifier(stationFull: string): { area: string; station: string } | null {
  const match = stationFull.match(/^([A-Z0-9]+)-(\d+)$/)
  if (!match) return null
  return { area: match[1], station: match[2] }
}

/**
 * Parse robot identifier like "9B-100-03" into area, station, and robot
 */
export function parseRobotIdentifier(robotFullId: string): { area: string; station: string; robot: string } | null {
  const match = robotFullId.match(/^([A-Z0-9]+)-(\d+)-(\d+)$/)
  if (!match) return null
  return { area: match[1], station: match[2], robot: match[3] }
}

/**
 * Build canonical key for simulation status entity
 */
export function buildSimulationCanonicalKey(area: string, station: string, robot: string): string {
  return `FORD|SIM|${area}-${station}|R${robot}`
}

/**
 * Calculate overall completion percentage across all milestones treated as checklist.
 * Counts entries with value === 100 and divides by total milestone count.
 */
export function calculateMilestoneChecklistCompletion(milestones: SimulationMilestones): number {
  const allMilestones = Object.values(milestones).filter((v): v is number => typeof v === 'number')
  const totalCount = allMilestones.length

  if (totalCount === 0) return 0

  const checkedCount = allMilestones.filter(v => v === 100).length
  return Math.round((checkedCount / totalCount) * 100)
}
