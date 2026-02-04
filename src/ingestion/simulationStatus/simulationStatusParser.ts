/**
 * Simulation Status Parser Public API
 *
 * This file now aggregates focused modules so each concern stays small and
 * testable. Consumers import from here without worrying about internal
 * organization.
 */

export { normalizeSimulationStatusRows, extractMilestones } from './simulationStatusNormalization'
export { simulationRowToEntity } from './simulationStatusEntityFactory'
export { validateSimulationStatusEntities } from './simulationStatusValidation'
export { stationMatches, linkSimulationToTooling } from './simulationStatusLinking'
export {
  extractSimulationSheetPanels,
  extractMrsOlpSheetPanels,
  extractDocumentationSheetPanels,
  extractSafetyLayoutSheetPanels,
  parseSheetForPanels,
  mergePanelMilestonesByRobot,
  calculateOverallPanelCompletion,
  attachPanelMilestonesToEntities,
} from './panelMilestoneExtraction'
