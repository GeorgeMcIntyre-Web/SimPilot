/**
 * Normalization utilities for Simulation Status ingestion.
 */
import {
  SimulationStatusRawRow,
  NormalizedSimulationRow,
  SimulationMilestones,
  SIMULATION_MILESTONES,
} from './simulationStatusTypes'
import {
  normalizeStr,
  normalizeNumber,
  getColumnValue,
  parseRobotIdentifier,
  parseStationIdentifier,
} from './parserUtils'

/**
 * Extract milestone values from raw row
 */
export function extractMilestones(raw: SimulationStatusRawRow): SimulationMilestones {
  return {
    robotPositionStage1: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.ROBOT_POSITION_STAGE_1)),
    dcsConfigured: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.DCS_CONFIGURED)),
    dressPackFryingPanStage1: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.DRESS_PACK_FRYING_PAN_STAGE_1)),
    robotFlangePcdAdaptersChecked: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.ROBOT_FLANGE_PCD_ADAPTERS_CHECKED)),
    allEoatPayloadsChecked: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.ALL_EOAT_PAYLOADS_CHECKED)),
    robotTypeConfirmed: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.ROBOT_TYPE_CONFIRMED)),
    robotRiserConfirmed: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.ROBOT_RISER_CONFIRMED)),
    trackLengthCatracConfirmed: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.TRACK_LENGTH_CATRAC_CONFIRMED)),
    collisionsCheckedStage1: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.COLLISIONS_CHECKED_STAGE_1)),
    spotWeldsDistributedProjected: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.SPOT_WELDS_DISTRIBUTED_PROJECTED)),
    referenceWeldGunSelected: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.REFERENCE_WELD_GUN_SELECTED)),
    referenceWeldGunCollisionCheck: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.REFERENCE_WELD_GUN_COLLISION_CHECK)),
    weldGunForceCheckedWis7: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.WELD_GUN_FORCE_CHECKED_WIS7)),
    weldGunProposalCreated: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.WELD_GUN_PROPOSAL_CREATED)),
    finalWeldGunCollisionCheck: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.FINAL_WELD_GUN_COLLISION_CHECK)),
    finalWeldGunApproved: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.FINAL_WELD_GUN_APPROVED)),
    weldGunEquipmentPlacedConfirmed: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.WELD_GUN_EQUIPMENT_PLACED_CONFIRMED)),
    sealingDataImportedChecked: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.SEALING_DATA_IMPORTED_CHECKED)),
    sealerProposalCreatedSent: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.SEALER_PROPOSAL_CREATED_SENT)),
    sealerGunApproved: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.SEALER_GUN_APPROVED)),
    sealerEquipmentPlacedConfirmed: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.SEALER_EQUIPMENT_PLACED_CONFIRMED)),
    gripperEquipmentPrototypeCreated: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.GRIPPER_EQUIPMENT_PROTOTYPE_CREATED)),
    finalGripperCollisionCheck: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.FINAL_GRIPPER_COLLISION_CHECK)),
    gripperDesignFinalApproval: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.GRIPPER_DESIGN_FINAL_APPROVAL)),
    toolChangeStandsPlaced: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.TOOL_CHANGE_STANDS_PLACED)),
    fixtureEquipmentPrototypeCreated: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.FIXTURE_EQUIPMENT_PROTOTYPE_CREATED)),
    finalFixtureCollisionCheck: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.FINAL_FIXTURE_COLLISION_CHECK)),
    fixtureDesignFinalApproval: normalizeNumber(getColumnValue(raw, SIMULATION_MILESTONES.FIXTURE_DESIGN_FINAL_APPROVAL)),
  }
}

/**
 * Normalize raw simulation status rows
 */
export function normalizeSimulationStatusRows(
  rawRows: SimulationStatusRawRow[],
  sourceFile: string,
  startRowIndex: number
): NormalizedSimulationRow[] {
  const normalized: NormalizedSimulationRow[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i]
    const rowIndex = startRowIndex + i

    const responsiblePerson = normalizeStr(raw['PERS. RESPONSIBLE'])
    const stationFull = normalizeStr(raw['STATION'])
    const robotFullId = normalizeStr(raw['ROBOT'])
    const application = normalizeStr(raw['APPLICATION'])

    if (!stationFull || !robotFullId) {
      continue
    }

    const parsedRobot = parseRobotIdentifier(robotFullId)
    if (!parsedRobot) {
      const parsedStation = parseStationIdentifier(stationFull)
      if (parsedStation) {
        normalized.push({
          sourceFile,
          rawRowIndex: rowIndex,
          responsiblePerson,
          stationFull,
          robotFullId,
          application,
          area: parsedStation.area,
          station: parsedStation.station,
          robot: '',
          milestones: extractMilestones(raw),
          raw,
        })
      }
      continue
    }

    normalized.push({
      sourceFile,
      rawRowIndex: rowIndex,
      responsiblePerson,
      stationFull,
      robotFullId,
      application,
      area: parsedRobot.area,
      station: parsedRobot.station,
      robot: parsedRobot.robot,
      milestones: extractMilestones(raw),
      raw,
    })
  }

  return normalized
}
