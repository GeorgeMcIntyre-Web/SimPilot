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
  SIMULATION_MILESTONES,
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
 * Safely read a column value from a raw Excel row, handling stray spacing/case
 * in header names (common in vendor spreadsheets).
 */
function getColumnValue(raw: Record<string, unknown>, columnName: string): unknown {
  // Exact match first
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
  const allMilestones = Object.values(milestones).filter((v): v is number => typeof v === 'number')
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

// ============================================================================
// MULTI-SHEET PANEL MILESTONE EXTRACTION
// ============================================================================

/**
 * Extract milestone values for a specific panel from a raw row
 */
function extractPanelMilestones(
  raw: Record<string, unknown>,
  milestoneDefinitions: Record<string, string>
): MilestoneGroup {
  const milestones: Record<string, MilestoneValue> = {}

  for (const [_key, columnName] of Object.entries(milestoneDefinitions)) {
    const value = getColumnValue(raw, columnName)
    milestones[columnName] = normalizeNumber(value)
  }

  return {
    milestones,
    completion: calculateGroupCompletion(milestones),
  }
}

/**
 * Extract all panel milestones from a SIMULATION sheet row
 * Covers: Robot Simulation, Spot Welding, Sealer, Alternative Joining, Gripper, Fixture
 */
export function extractSimulationSheetPanels(raw: Record<string, unknown>): Partial<PanelMilestones> {
  return {
    robotSimulation: extractPanelMilestones(raw, ROBOT_SIMULATION_MILESTONES),
    spotWelding: extractPanelMilestones(raw, SPOT_WELDING_MILESTONES),
    sealer: extractPanelMilestones(raw, SEALER_MILESTONES),
    alternativeJoining: extractPanelMilestones(raw, ALTERNATIVE_JOINING_MILESTONES),
    gripper: extractPanelMilestones(raw, GRIPPER_MILESTONES),
    fixture: extractPanelMilestones(raw, FIXTURE_MILESTONES),
  }
}

/**
 * Extract MRS and OLP panel milestones from a MRS_OLP sheet row
 */
export function extractMrsOlpSheetPanels(raw: Record<string, unknown>): Partial<PanelMilestones> {
  return {
    mrs: extractPanelMilestones(raw, MRS_MILESTONES),
    olp: extractPanelMilestones(raw, OLP_MILESTONES),
  }
}

/**
 * Extract Documentation panel milestones from a DOCUMENTATION sheet row
 */
export function extractDocumentationSheetPanels(raw: Record<string, unknown>): Partial<PanelMilestones> {
  return {
    documentation: extractPanelMilestones(raw, DOCUMENTATION_MILESTONES),
  }
}

/**
 * Extract Safety and Layout panel milestones from a SAFETY_LAYOUT sheet row
 */
export function extractSafetyLayoutSheetPanels(raw: Record<string, unknown>): Partial<PanelMilestones> {
  return {
    safety: extractPanelMilestones(raw, SAFETY_MILESTONES),
    layout: extractPanelMilestones(raw, LAYOUT_MILESTONES),
  }
}

/**
 * Result of parsing a single sheet with panel data
 */
export interface SheetPanelParseResult {
  robotKey: string
  stationKey: string
  area: string
  responsiblePerson: string
  application: string
  panels: Partial<PanelMilestones>
}

/**
 * Parse rows from any simulation status sheet and extract panel milestones
 */
export function parseSheetForPanels(
  rows: Record<string, unknown>[],
  sheetType: 'SIMULATION' | 'MRS_OLP' | 'DOCUMENTATION' | 'SAFETY_LAYOUT'
): SheetPanelParseResult[] {
  const results: SheetPanelParseResult[] = []

  for (const raw of rows) {
    const robotFullId = normalizeStr(raw['ROBOT'])
    const stationFull = normalizeStr(raw['STATION'])

    // Skip header rows or empty rows
    if (!robotFullId || !stationFull) continue

    const parsedRobot = parseRobotIdentifier(robotFullId)
    if (!parsedRobot) continue

    let panels: Partial<PanelMilestones>
    switch (sheetType) {
      case 'SIMULATION':
        panels = extractSimulationSheetPanels(raw)
        break
      case 'MRS_OLP':
        panels = extractMrsOlpSheetPanels(raw)
        break
      case 'DOCUMENTATION':
        panels = extractDocumentationSheetPanels(raw)
        break
      case 'SAFETY_LAYOUT':
        panels = extractSafetyLayoutSheetPanels(raw)
        break
    }

    results.push({
      robotKey: robotFullId,
      stationKey: stationFull,
      area: parsedRobot.area,
      responsiblePerson: normalizeStr(raw['PERS. RESPONSIBLE']),
      application: normalizeStr(raw['APPLICATION']),
      panels,
    })
  }

  return results
}

/**
 * Merge panel milestones from multiple sheets by robot key
 * Returns a map of robotKey -> complete PanelMilestones
 */
export function mergePanelMilestonesByRobot(
  sheetResults: SheetPanelParseResult[][]
): Map<string, PanelMilestones> {
  const robotPanels = new Map<string, PanelMilestones>()

  for (const results of sheetResults) {
    for (const result of results) {
      let existing = robotPanels.get(result.robotKey)

      if (!existing) {
        existing = createEmptyPanelMilestones()
        robotPanels.set(result.robotKey, existing)
      }

      // Merge panels from this sheet
      for (const [panelKey, panelData] of Object.entries(result.panels)) {
        if (panelData) {
          existing[panelKey as PanelType] = panelData
        }
      }
    }
  }

  return robotPanels
}

/**
 * Calculate overall completion across all panels
 */
export function calculateOverallPanelCompletion(panels: PanelMilestones): number {
  const allMilestones: number[] = []

  for (const panel of Object.values(panels)) {
    const milestoneValues = Object.values(panel.milestones).filter((v): v is number => typeof v === 'number')
    allMilestones.push(...milestoneValues)
  }

  if (allMilestones.length === 0) return 0

  const completedCount = allMilestones.filter(v => v === 100).length
  return Math.round((completedCount / allMilestones.length) * 100)
}

/**
 * Attach panel milestones to existing simulation status entities
 */
export function attachPanelMilestonesToEntities(
  entities: SimulationStatusEntity[],
  robotPanels: Map<string, PanelMilestones>
): void {
  for (const entity of entities) {
    const panels = robotPanels.get(entity.robotFullId)
    if (panels) {
      entity.panelMilestones = panels
    }
  }
}
