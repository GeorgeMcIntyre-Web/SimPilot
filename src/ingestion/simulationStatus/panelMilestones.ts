import {
  PanelMilestones,
  MilestoneGroup,
  MilestoneValue,
  PanelType,
  ROBOT_SIMULATION_MILESTONES,
  SPOT_WELDING_MILESTONES,
  SEALER_MILESTONES,
  ALTERNATIVE_JOINING_MILESTONES,
  GRIPPER_MILESTONES,
  FIXTURE_MILESTONES,
  MRS_MILESTONES,
  OLP_MILESTONES,
  DOCUMENTATION_MILESTONES,
  LAYOUT_MILESTONES,
  SAFETY_MILESTONES,
  createEmptyPanelMilestones,
  calculateGroupCompletion,
} from './simulationStatusTypes'
import type { SimulationMetric, VacuumParsedRow } from './types'

/**
 * Mapping of panel types to their milestone column headers
 */
export const PANEL_TO_MILESTONES: Record<PanelType, Record<string, string>> = {
  robotSimulation: ROBOT_SIMULATION_MILESTONES,
  spotWelding: SPOT_WELDING_MILESTONES,
  sealer: SEALER_MILESTONES,
  alternativeJoining: ALTERNATIVE_JOINING_MILESTONES,
  gripper: GRIPPER_MILESTONES,
  fixture: FIXTURE_MILESTONES,
  mrs: MRS_MILESTONES,
  olp: OLP_MILESTONES,
  documentation: DOCUMENTATION_MILESTONES,
  layout: LAYOUT_MILESTONES,
  safety: SAFETY_MILESTONES,
}

/**
 * Check if a metric label matches a milestone definition (case-insensitive, trimmed)
 */
export function matchesMilestone(metricLabel: string, milestoneColumn: string): boolean {
  const normMetric = metricLabel.trim().toUpperCase()
  const normMilestone = milestoneColumn.trim().toUpperCase()

  // Exact match
  if (normMetric === normMilestone) return true

  // Handle sheet prefix (e.g., "MRS_OLP: FULL ROBOT PATHS CREATED WITH AUX DATA SET")
  if (normMetric.includes(': ')) {
    const afterColon = normMetric.split(': ').slice(1).join(': ')
    if (afterColon === normMilestone) return true
  }

  return false
}

/**
 * Extract milestones for a specific panel from vacuum-parsed metrics
 */
export function extractPanelGroup(
  metrics: SimulationMetric[],
  milestoneDefinitions: Record<string, string>,
): MilestoneGroup {
  const milestones: Record<string, MilestoneValue> = {}

  for (const [_key, columnName] of Object.entries(milestoneDefinitions)) {
    // Find matching metric
    const matchingMetric = metrics.find((m) => matchesMilestone(m.label, columnName))
    milestones[columnName] = matchingMetric?.percent ?? null
  }

  return {
    milestones,
    completion: calculateGroupCompletion(milestones),
  }
}

/**
 * Convert vacuum-parsed rows to PanelMilestones structure.
 * Groups all metrics by their corresponding panel.
 *
 * Returns a map that includes BOTH:
 * - Robot-level keys: "stationKey::robotCaption" (e.g., "8X-010::8X-010-01")
 * - Station-level keys: "stationKey" (e.g., "8X-010") - aggregated from all robots at that station
 */
export function convertVacuumRowsToPanelMilestones(
  vacuumRows: VacuumParsedRow[],
): Map<string, PanelMilestones> {
  const resultMap = new Map<string, PanelMilestones>()

  // Group vacuum rows by robot (using stationKey + robotCaption as key)
  const robotRowsMap = new Map<string, VacuumParsedRow[]>()
  // Also group by station for station-level aggregation
  const stationRowsMap = new Map<string, VacuumParsedRow[]>()

  for (const row of vacuumRows) {
    // Robot-level key
    const robotKey = row.robotCaption ? `${row.stationKey}::${row.robotCaption}` : row.stationKey

    const existingRobot = robotRowsMap.get(robotKey) || []
    existingRobot.push(row)
    robotRowsMap.set(robotKey, existingRobot)

    // Station-level key (always just the station)
    const stationKey = row.stationKey
    const existingStation = stationRowsMap.get(stationKey) || []
    existingStation.push(row)
    stationRowsMap.set(stationKey, existingStation)
  }

  // Process robot-level entries
  for (const [robotKey, rows] of robotRowsMap) {
    // Merge all metrics from all rows for this robot
    const allMetrics: SimulationMetric[] = []
    for (const row of rows) {
      allMetrics.push(...row.metrics)
    }

    // Create panel milestones
    const panels = createEmptyPanelMilestones()

    // Extract each panel's milestones
    for (const [panelKey, milestoneDefinitions] of Object.entries(PANEL_TO_MILESTONES)) {
      panels[panelKey as PanelType] = extractPanelGroup(allMetrics, milestoneDefinitions)
    }

    resultMap.set(robotKey, panels)
  }

  // Process station-level entries (aggregate all robots at a station)
  for (const [stationKey, rows] of stationRowsMap) {
    // Skip if station key is same as a robot key (no robot caption case)
    // In that case, the robot-level entry already serves as station-level
    if (resultMap.has(stationKey)) {
      continue
    }

    // Create panel milestones with station-level aggregation
    const panels = createEmptyPanelMilestones()

    for (const [panelKey, milestoneDefinitions] of Object.entries(PANEL_TO_MILESTONES)) {
      const aggregatedMilestones: Record<string, MilestoneValue> = {}

      for (const [_milestoneKey, columnName] of Object.entries(milestoneDefinitions)) {
        // Average milestone percent across unique robots to avoid double-counting
        // duplicate rows for the same robot (which can otherwise yield 200%).
        const perRobot = new Map<string, number>()

        for (const row of rows) {
          const robotKey = row.robotCaption?.trim() || `__row_${row.sourceRowIndex}`
          // Only take the first value seen per robot to avoid duplicates
          if (!perRobot.has(robotKey)) {
            const metric = row.metrics.find((m) => matchesMilestone(m.label, columnName))
            if (typeof metric?.percent === 'number') {
              perRobot.set(robotKey, metric.percent)
            }
          }
        }

        if (perRobot.size === 0) {
          aggregatedMilestones[columnName] = null
        } else {
          const sum = Array.from(perRobot.values()).reduce((s, v) => s + v, 0)
          aggregatedMilestones[columnName] = Math.round(sum / perRobot.size)
        }
      }

      panels[panelKey as PanelType] = {
        milestones: aggregatedMilestones,
        completion: calculateGroupCompletion(aggregatedMilestones),
      }
    }

    resultMap.set(stationKey, panels)
  }

  return resultMap
}

/**
 * Get panel milestones for a specific robot from vacuum rows.
 * Convenience function for use in ingestion coordinator.
 */
export function getPanelMilestonesForRobot(
  robotCaption: string,
  stationKey: string,
  panelMilestonesMap: Map<string, PanelMilestones>,
): PanelMilestones | undefined {
  // Try with robot caption first
  const robotKey = `${stationKey}::${robotCaption}`
  let panels = panelMilestonesMap.get(robotKey)

  if (!panels) {
    // Fallback to station-only key
    panels = panelMilestonesMap.get(stationKey)
  }

  return panels
}
