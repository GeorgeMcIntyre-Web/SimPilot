/**
 * Simulation Status Parser
 *
 * Parses Ford V801 Simulation Status Excel files.
 * Focuses on the SIMULATION sheet which tracks robot-by-robot milestone completion.
 */

import {
  SimulationStatusRawRow,
  NormalizedSimulationRow,
  SimulationStatusEntity,
  SimulationStatusValidationAnomaly,
  SimulationStatusValidationReport,
  SimulationMilestones,
  SIMULATION_MILESTONES
} from './simulationStatusTypes'
import { normalizeAreaName, normalizeStationCode } from '../normalizers'

// ============================================================================
// HELPERS
// ============================================================================

function normalizeStr(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function normalizeNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const num = Number(val)
  return isNaN(num) ? null : num
}

/**
 * Parse station identifier like "9B-100" into area and station
 */
function parseStationIdentifier(stationFull: string): { area: string; station: string } | null {
  const match = stationFull.match(/^([A-Z0-9]+)-(\d+)$/)
  if (!match) return null
  return { area: match[1], station: match[2] }
}

/**
 * Parse robot identifier like "9B-100-03" into area, station, and robot
 */
function parseRobotIdentifier(robotFullId: string): { area: string; station: string; robot: string } | null {
  const match = robotFullId.match(/^([A-Z0-9]+)-(\d+)-(\d+)$/)
  if (!match) return null
  return { area: match[1], station: match[2], robot: match[3] }
}

/**
 * Build canonical key for simulation status entity
 */
function buildSimulationCanonicalKey(area: string, station: string, robot: string): string {
  return `FORD|SIM|${area}-${station}|R${robot}`
}

/**
 * Calculate overall completion percentage across all milestones
 *
 * For checklist behavior:
 * - Counts how many milestones are checked (value === 100)
 * - Divides by total number of milestones
 * - Example: 10 checked out of 28 total = 36% completion
 */
function calculateOverallCompletion(milestones: SimulationMilestones): number {
  const allMilestones = Object.values(milestones)
  const totalCount = allMilestones.length

  if (totalCount === 0) return 0

  // Count how many milestones are checked (value === 100)
  const checkedCount = allMilestones.filter(v => v === 100).length

  return Math.round((checkedCount / totalCount) * 100)
}

// ============================================================================
// NORMALIZATION
// ============================================================================

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

    // Skip rows without station or robot (headers, empty rows)
    if (!stationFull || !robotFullId) {
      continue
    }

    // Parse identifiers
    const parsedRobot = parseRobotIdentifier(robotFullId)
    if (!parsedRobot) {
      // Invalid format, but still include with best-effort parsing
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
          raw
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
      raw
    })
  }

  return normalized
}

/**
 * Extract milestone values from raw row
 */
function extractMilestones(raw: SimulationStatusRawRow): SimulationMilestones {
  return {
    robotPositionStage1: normalizeNumber(raw[SIMULATION_MILESTONES.ROBOT_POSITION_STAGE_1]),
    coreCubicSConfigured: normalizeNumber(raw[SIMULATION_MILESTONES.CORE_CUBIC_S_CONFIGURED]),
    dressPackFryingPanStage1: normalizeNumber(raw[SIMULATION_MILESTONES.DRESS_PACK_FRYING_PAN_STAGE_1]),
    robotFlangePcdAdaptersChecked: normalizeNumber(raw[SIMULATION_MILESTONES.ROBOT_FLANGE_PCD_ADAPTERS_CHECKED]),
    allEoatPayloadsChecked: normalizeNumber(raw[SIMULATION_MILESTONES.ALL_EOAT_PAYLOADS_CHECKED]),
    robotTypeConfirmed: normalizeNumber(raw[SIMULATION_MILESTONES.ROBOT_TYPE_CONFIRMED]),
    robotRiserConfirmed: normalizeNumber(raw[SIMULATION_MILESTONES.ROBOT_RISER_CONFIRMED]),
    trackLengthCatracConfirmed: normalizeNumber(raw[SIMULATION_MILESTONES.TRACK_LENGTH_CATRAC_CONFIRMED]),
    collisionsCheckedStage1: normalizeNumber(raw[SIMULATION_MILESTONES.COLLISIONS_CHECKED_STAGE_1]),
    spotWeldsDistributedProjected: normalizeNumber(raw[SIMULATION_MILESTONES.SPOT_WELDS_DISTRIBUTED_PROJECTED]),
    referenceWeldGunSelected: normalizeNumber(raw[SIMULATION_MILESTONES.REFERENCE_WELD_GUN_SELECTED]),
    referenceWeldGunCollisionCheck: normalizeNumber(raw[SIMULATION_MILESTONES.REFERENCE_WELD_GUN_COLLISION_CHECK]),
    weldGunForceCheckedWis7: normalizeNumber(raw[SIMULATION_MILESTONES.WELD_GUN_FORCE_CHECKED_WIS7]),
    weldGunProposalCreated: normalizeNumber(raw[SIMULATION_MILESTONES.WELD_GUN_PROPOSAL_CREATED]),
    finalWeldGunCollisionCheck: normalizeNumber(raw[SIMULATION_MILESTONES.FINAL_WELD_GUN_COLLISION_CHECK]),
    finalWeldGunApproved: normalizeNumber(raw[SIMULATION_MILESTONES.FINAL_WELD_GUN_APPROVED]),
    weldGunEquipmentPlacedConfirmed: normalizeNumber(raw[SIMULATION_MILESTONES.WELD_GUN_EQUIPMENT_PLACED_CONFIRMED]),
    sealingDataImportedChecked: normalizeNumber(raw[SIMULATION_MILESTONES.SEALING_DATA_IMPORTED_CHECKED]),
    sealerProposalCreatedSent: normalizeNumber(raw[SIMULATION_MILESTONES.SEALER_PROPOSAL_CREATED_SENT]),
    sealerGunApproved: normalizeNumber(raw[SIMULATION_MILESTONES.SEALER_GUN_APPROVED]),
    sealerEquipmentPlacedConfirmed: normalizeNumber(raw[SIMULATION_MILESTONES.SEALER_EQUIPMENT_PLACED_CONFIRMED]),
    gripperEquipmentPrototypeCreated: normalizeNumber(raw[SIMULATION_MILESTONES.GRIPPER_EQUIPMENT_PROTOTYPE_CREATED]),
    finalGripperCollisionCheck: normalizeNumber(raw[SIMULATION_MILESTONES.FINAL_GRIPPER_COLLISION_CHECK]),
    gripperDesignFinalApproval: normalizeNumber(raw[SIMULATION_MILESTONES.GRIPPER_DESIGN_FINAL_APPROVAL]),
    toolChangeStandsPlaced: normalizeNumber(raw[SIMULATION_MILESTONES.TOOL_CHANGE_STANDS_PLACED]),
    fixtureEquipmentPrototypeCreated: normalizeNumber(raw[SIMULATION_MILESTONES.FIXTURE_EQUIPMENT_PROTOTYPE_CREATED]),
    finalFixtureCollisionCheck: normalizeNumber(raw[SIMULATION_MILESTONES.FINAL_FIXTURE_COLLISION_CHECK]),
    fixtureDesignFinalApproval: normalizeNumber(raw[SIMULATION_MILESTONES.FIXTURE_DESIGN_FINAL_APPROVAL]),
  }
}

// ============================================================================
// ENTITY CONVERSION
// ============================================================================

/**
 * Convert normalized row to simulation status entity
 */
export function simulationRowToEntity(
  normalized: NormalizedSimulationRow,
  sheetName: string,
  anomalies: SimulationStatusValidationAnomaly[]
): SimulationStatusEntity | null {
  // Validate required fields
  if (!normalized.stationFull) {
    anomalies.push({
      type: 'MISSING_STATION',
      row: normalized.rawRowIndex,
      message: 'Missing STATION field',
      data: { robotFullId: normalized.robotFullId }
    })
    return null
  }

  if (!normalized.robotFullId) {
    anomalies.push({
      type: 'MISSING_ROBOT',
      row: normalized.rawRowIndex,
      message: 'Missing ROBOT field',
      data: { stationFull: normalized.stationFull }
    })
    return null
  }

  // Validate robot identifier format
  if (!normalized.area || !normalized.station || !normalized.robot) {
    anomalies.push({
      type: 'INVALID_ROBOT_FORMAT',
      row: normalized.rawRowIndex,
      message: `Invalid robot identifier format: ${normalized.robotFullId}`,
      data: { robotFullId: normalized.robotFullId }
    })
    return null
  }

  // Build canonical key
  const canonicalKey = buildSimulationCanonicalKey(
    normalized.area,
    normalized.station,
    normalized.robot
  )

  // Calculate overall completion
  const overallCompletion = calculateOverallCompletion(normalized.milestones)

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
      row: normalized.rawRowIndex
    },
    raw: normalized.raw
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate simulation status entities and produce report
 */
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
    // Check for missing fields
    if (!entity.stationFull) {
      missingStationCount++
    }

    if (!entity.robotFullId) {
      missingRobotCount++
    }

    // Check for duplicate robots
    if (canonicalKeys.has(entity.canonicalKey)) {
      duplicateRobotCount++
      anomalies.push({
        type: 'DUPLICATE_ROBOT',
        row: entity.source.row,
        message: `Duplicate robot: ${entity.robotFullId}`,
        data: { canonicalKey: entity.canonicalKey }
      })
    }
    canonicalKeys.add(entity.canonicalKey)
  })

  // Count format errors
  invalidFormatCount = anomalies.filter(a => a.type === 'INVALID_ROBOT_FORMAT' || a.type === 'INVALID_STATION_FORMAT').length

  return {
    totalRowsRead,
    totalEntitiesProduced: entities.length,
    missingStationCount,
    missingRobotCount,
    invalidFormatCount,
    duplicateRobotCount,
    anomalies
  }
}

// ============================================================================
// STATION MATCHING
// ============================================================================

/**
 * Check if a simulation station matches a tool list station (handles ranges)
 */
export function stationMatches(simStation: string, toolStation: string): boolean {
  const normSim = normalizeStationCode(simStation)
  const normTool = normalizeStationCode(toolStation)

  if (!normSim || !normTool) return false

  // Exact match: "10" === "10"
  if (normSim === normTool) return true

  // Handle range in toolStation: "10-20"
  if (toolStation.includes('-')) {
    const parts = toolStation.split('-')
    if (parts.length === 2) {
      const start = parseInt(normalizeStationCode(parts[0]) || '', 10)
      const end = parseInt(normalizeStationCode(parts[1]) || '', 10)
      const simNum = parseInt(normSim, 10)

      if (!isNaN(start) && !isNaN(end) && !isNaN(simNum)) {
        return simNum >= start && simNum <= end
      }
    }
  }

  return false
}

/**
 * Link simulation status entities to tool list entities by station
 */
export function linkSimulationToTooling(
  simEntities: SimulationStatusEntity[],
  toolEntities: Array<{ canonicalKey: string; areaName: string; stationGroup: string }>
): void {
  for (const simEntity of simEntities) {
    const linkedKeys: string[] = []

    for (const toolEntity of toolEntities) {
      // Match by area (normalized)
      const normToolArea = normalizeAreaName(toolEntity.areaName)
      const normSimArea = normalizeAreaName(simEntity.area)
      
      if (normToolArea && normSimArea && normToolArea !== normSimArea) continue

      // Match by station (handle ranges, normalized)
      if (!stationMatches(simEntity.station, toolEntity.stationGroup)) continue

      // This tool entity is used at this station
      linkedKeys.push(toolEntity.canonicalKey)
    }

    simEntity.linkedToolingEntityKeys = linkedKeys
  }
}
