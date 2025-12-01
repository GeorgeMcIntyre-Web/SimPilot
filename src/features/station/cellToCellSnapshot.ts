// Cell to CellSnapshot Converter
// Converts domain Cell to cross-ref CellSnapshot for use with StationDetailPanel

import { Cell } from '../../domain/core'
import { CellSnapshot, SimulationStatusSnapshot } from '../../domain/crossRef/CrossRefTypes'

/**
 * Convert a domain Cell to a CellSnapshot for use with the StationDetailPanel
 *
 * Note: This creates a minimal CellSnapshot from the Cell data.
 * Full CellSnapshots with assets and flags come from the cross-reference engine.
 */
export const cellToCellSnapshot = (cell: Cell): CellSnapshot => {
  // Build simulation status if present
  let simulationStatus: SimulationStatusSnapshot | undefined

  if (cell.simulation) {
    simulationStatus = {
      stationKey: cell.code,
      areaKey: cell.lineCode,
      lineCode: cell.lineCode,
      firstStageCompletion: cell.simulation.percentComplete,
      finalDeliverablesCompletion: cell.simulation.percentComplete,
      engineer: cell.assignedEngineer,
      raw: {
        ...cell.simulation,
        metrics: cell.simulation.metrics
      }
    }
  }

  return {
    stationKey: cell.code,
    areaKey: cell.lineCode,
    lineCode: cell.lineCode,
    simulationStatus,
    tools: [],
    robots: [],
    weldGuns: [],
    gunForces: [],
    risers: [],
    flags: cell.simulation?.hasIssues
      ? [
          {
            type: 'STATION_WITHOUT_SIMULATION_STATUS',
            stationKey: cell.code,
            message: 'Station has issues flagged in simulation status',
            severity: 'WARNING'
          }
        ]
      : []
  }
}
