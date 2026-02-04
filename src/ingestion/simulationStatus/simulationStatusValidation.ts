/**
 * Validation utilities for Simulation Status entities.
 */
import {
  SimulationStatusEntity,
  SimulationStatusValidationAnomaly,
  SimulationStatusValidationReport,
} from './simulationStatusTypes'

export function validateSimulationStatusEntities(
  entities: SimulationStatusEntity[],
  totalRowsRead: number,
  anomalies: SimulationStatusValidationAnomaly[]
): SimulationStatusValidationReport {
  const canonicalKeys = new Set<string>()
  let missingStationCount = 0
  let missingRobotCount = 0
  let invalidFormatCount = 0
  let duplicateRobotCount = 0

  entities.forEach(entity => {
    if (!entity.stationFull) missingStationCount++
    if (!entity.robotFullId) missingRobotCount++

    if (canonicalKeys.has(entity.canonicalKey)) {
      duplicateRobotCount++
      anomalies.push({
        type: 'DUPLICATE_ROBOT',
        row: entity.source.row,
        message: `Duplicate robot: ${entity.robotFullId}`,
        data: { canonicalKey: entity.canonicalKey },
      })
    }
    canonicalKeys.add(entity.canonicalKey)
  })

  invalidFormatCount = anomalies.filter(a => a.type === 'INVALID_ROBOT_FORMAT' || a.type === 'INVALID_STATION_FORMAT').length

  return {
    totalRowsRead,
    totalEntitiesProduced: entities.length,
    missingStationCount,
    missingRobotCount,
    invalidFormatCount,
    duplicateRobotCount,
    anomalies,
  }
}
