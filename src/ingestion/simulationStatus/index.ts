/**
 * Simulation Status Module
 *
 * Complete module for parsing and managing Ford V801 Simulation Status files.
 * Tracks robot-by-robot simulation milestone completion.
 */

// Types
export type {
  SimulationStatusEntity,
  SimulationStatusRawRow,
  NormalizedSimulationRow,
  SimulationMilestones,
  MilestoneKey,
  MilestoneColumnName,
  MilestoneValue,
  RobotApplicationType,
  SimulationStatusValidationAnomaly,
  SimulationStatusValidationReport
} from './simulationStatusTypes'

export { SIMULATION_MILESTONES, calculateOverallCompletion } from './simulationStatusTypes'

// Parser
export {
  normalizeSimulationStatusRows,
  simulationRowToEntity,
  validateSimulationStatusEntities,
  stationMatches,
  linkSimulationToTooling
} from './simulationStatusParser'

// Ingestion
export type {
  SimulationStatusIngestionResult,
  SimulationStatusIngestionError
} from './simulationStatusIngestion'

export {
  ingestSimulationStatusFile,
  ingestAndStoreSimulationStatus,
  linkSimulationStatusToTools,
  getIngestionSummary
} from './simulationStatusIngestion'

// Store
export {
  simulationStatusStore,
  useSimulationStatusStore,
  useSimulationStatusEntities,
  useSimulationStatusByStation,
  useSimulationStatusByRobot,
  useSimulationStatusGroupedByStation,
  useSimulationStatusGroupedByApplication,
  useSimulationStatusAreas,
  useSimulationStatusStations,
  useSimulationStatusApplicationTypes,
  useSimulationStatusStats,
  useStationCompletionStats
} from '../../domain/simulationStatusStore'

export type {
  SimulationStatusStoreState
} from '../../domain/simulationStatusStore'
