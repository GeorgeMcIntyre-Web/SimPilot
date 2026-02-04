/**
 * Converts normalized rows into Simulation Status entities.
 */
import {
  NormalizedSimulationRow,
  SimulationStatusEntity,
  SimulationStatusValidationAnomaly,
} from './simulationStatusTypes'
import {
  buildSimulationCanonicalKey,
  calculateMilestoneChecklistCompletion,
} from './parserUtils'

export function simulationRowToEntity(
  normalized: NormalizedSimulationRow,
  sheetName: string,
  anomalies: SimulationStatusValidationAnomaly[]
): SimulationStatusEntity | null {
  if (!normalized.stationFull) {
    anomalies.push({
      type: 'MISSING_STATION',
      row: normalized.rawRowIndex,
      message: 'Missing STATION field',
      data: { robotFullId: normalized.robotFullId },
    })
    return null
  }

  if (!normalized.robotFullId) {
    anomalies.push({
      type: 'MISSING_ROBOT',
      row: normalized.rawRowIndex,
      message: 'Missing ROBOT field',
      data: { stationFull: normalized.stationFull },
    })
    return null
  }

  if (!normalized.area || !normalized.station || !normalized.robot) {
    anomalies.push({
      type: 'INVALID_ROBOT_FORMAT',
      row: normalized.rawRowIndex,
      message: `Invalid robot identifier format: ${normalized.robotFullId}`,
      data: { robotFullId: normalized.robotFullId },
    })
    return null
  }

  const canonicalKey = buildSimulationCanonicalKey(
    normalized.area,
    normalized.station,
    normalized.robot
  )

  const overallCompletion = calculateMilestoneChecklistCompletion(normalized.milestones)

  return {
    canonicalKey,
    entityType: 'SIMULATION_STATUS',
    area: normalized.area,
    station: normalized.station,
    stationFull: normalized.stationFull,
    robot: normalized.robot,
    robotFullId: normalized.robotFullId,
    application: normalized.application,
    responsiblePerson: normalized.responsiblePerson,
    milestones: normalized.milestones,
    overallCompletion,
    linkedToolingEntityKeys: [],
    source: {
      file: normalized.sourceFile,
      sheet: sheetName,
      row: normalized.rawRowIndex,
    },
    raw: normalized.raw,
  }
}
