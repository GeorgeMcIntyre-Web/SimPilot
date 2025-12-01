// Cross-Reference Engine
// Unifies ingested data from multiple Excel files into a coherent station view
// Identifies discrepancies, missing data, and validation issues

import {
  CrossRefInput,
  CrossRefResult,
  CellSnapshot,
  CrossRefFlag,
  StationKey,
  GunKey,
  GunForceSnapshot,
  SimulationStatusSnapshot,
  ToolSnapshot,
  RobotSnapshot,
  WeldGunSnapshot,
  RiserSnapshot
} from './CrossRefTypes'
import { normalizeStationId, normalizeGunKey } from './CrossRefUtils'

// ============================================================================
// INTERNAL TYPES
// ============================================================================

interface Indices {
  stations: Map<StationKey, CellSnapshot>
  gunForcesByGun: Map<GunKey, GunForceSnapshot[]>
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Build a cross-reference result from ingested data
 * 
 * This function:
 * 1. Indexes all stations from all input sources
 * 2. Populates each station with its related data
 * 3. Validates and flags discrepancies
 * 
 * @param input - The ingested data from all Excel files
 * @returns CrossRefResult with unified cells and validation flags
 */
export const buildCrossRef = (input: CrossRefInput): CrossRefResult => {
  const indices = buildIndices(input)

  populateCells(input, indices)

  const cells = Array.from(indices.stations.values())
  const globalFlags = validateCells(cells)

  const stats = calculateStats(cells, globalFlags)

  return { cells, globalFlags, stats }
}

// ============================================================================
// PHASE 1: INDEXING & SEEDING
// ============================================================================

/**
 * Build indices for fast lookup during population
 */
const buildIndices = (input: CrossRefInput): Indices => {
  const stations = new Map<StationKey, CellSnapshot>()
  const gunForcesByGun = new Map<GunKey, GunForceSnapshot[]>()

  // Seed stations from all sources
  seedStations(input.simulationStatusRows, stations)
  seedStationsFromTools(input.toolingRows, stations)
  seedStationsFromRobots(input.robotSpecsRows, stations)
  seedStationsFromGuns(input.weldGunRows, stations)
  seedStationsFromRisers(input.riserRows, stations)

  // Index gun forces for lookup
  indexGunForces(input.gunForceRows, gunForcesByGun)

  return { stations, gunForcesByGun }
}

/**
 * Get or create a cell snapshot for a station
 */
const getOrCreateCell = (
  stations: Map<StationKey, CellSnapshot>,
  rawStation: string | undefined,
  rawArea: string | undefined,
  lineCode?: string
): CellSnapshot | null => {
  const key = normalizeStationId(rawStation)
  if (!key) return null

  const existing = stations.get(key)
  if (existing) {
    // Update area/line if not already set
    if (!existing.areaKey && rawArea) {
      existing.areaKey = rawArea
    }
    if (!existing.lineCode && lineCode) {
      existing.lineCode = lineCode
    }
    return existing
  }

  const newCell: CellSnapshot = {
    stationKey: key,
    areaKey: rawArea,
    lineCode,
    tools: [],
    robots: [],
    weldGuns: [],
    gunForces: [],
    risers: [],
    flags: []
  }

  stations.set(key, newCell)
  return newCell
}

/**
 * Seed stations from simulation status rows
 */
const seedStations = (
  rows: SimulationStatusSnapshot[],
  stations: Map<StationKey, CellSnapshot>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    getOrCreateCell(stations, row.stationKey, row.areaKey, row.lineCode)
  }
}

/**
 * Seed stations from tooling rows
 */
const seedStationsFromTools = (
  rows: ToolSnapshot[],
  stations: Map<StationKey, CellSnapshot>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    getOrCreateCell(stations, row.stationKey, row.areaKey)
  }
}

/**
 * Seed stations from robot specs
 */
const seedStationsFromRobots = (
  rows: RobotSnapshot[],
  stations: Map<StationKey, CellSnapshot>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    getOrCreateCell(stations, row.stationKey, undefined)
  }
}

/**
 * Seed stations from weld guns
 */
const seedStationsFromGuns = (
  rows: WeldGunSnapshot[],
  stations: Map<StationKey, CellSnapshot>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    getOrCreateCell(stations, row.stationKey, undefined)
  }
}

/**
 * Seed stations from risers
 */
const seedStationsFromRisers = (
  rows: RiserSnapshot[],
  stations: Map<StationKey, CellSnapshot>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    getOrCreateCell(stations, row.stationKey, row.areaKey)
  }
}

/**
 * Index gun forces by gun key for fast lookup
 */
const indexGunForces = (
  rows: GunForceSnapshot[],
  index: Map<GunKey, GunForceSnapshot[]>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    const key = normalizeGunKey(row.gunKey)
    if (!key) continue

    const list = index.get(key) ?? []
    list.push(row)
    index.set(key, list)
  }
}

// ============================================================================
// PHASE 2: POPULATION
// ============================================================================

/**
 * Populate cells with data from all sources
 */
const populateCells = (input: CrossRefInput, indices: Indices): void => {
  attachSimulationStatus(input.simulationStatusRows, indices.stations)
  attachTools(input.toolingRows, indices.stations)
  attachRobots(input.robotSpecsRows, indices.stations)
  attachWeldGuns(input.weldGunRows, indices.stations, indices.gunForcesByGun)
  attachRisers(input.riserRows, indices.stations)
}

/**
 * Attach simulation status to cells
 */
const attachSimulationStatus = (
  rows: SimulationStatusSnapshot[],
  stations: Map<StationKey, CellSnapshot>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    const key = normalizeStationId(row.stationKey)
    if (!key) continue

    const cell = stations.get(key)
    if (!cell) continue

    cell.simulationStatus = row
  }
}

/**
 * Attach tools to cells
 */
const attachTools = (
  rows: ToolSnapshot[],
  stations: Map<StationKey, CellSnapshot>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    const key = normalizeStationId(row.stationKey)
    if (!key) continue

    const cell = stations.get(key)
    if (!cell) continue

    cell.tools.push(row)
  }
}

/**
 * Attach robots to cells
 */
const attachRobots = (
  rows: RobotSnapshot[],
  stations: Map<StationKey, CellSnapshot>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    const key = normalizeStationId(row.stationKey)
    if (!key) continue

    const cell = stations.get(key)
    if (!cell) continue

    cell.robots.push(row)
  }
}

/**
 * Attach weld guns to cells and link gun forces
 */
const attachWeldGuns = (
  rows: WeldGunSnapshot[],
  stations: Map<StationKey, CellSnapshot>,
  gunForcesIndex: Map<GunKey, GunForceSnapshot[]>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    const stationKey = normalizeStationId(row.stationKey)
    if (!stationKey) continue

    const cell = stations.get(stationKey)
    if (!cell) continue

    cell.weldGuns.push(row)

    // Link gun forces
    const gunKey = normalizeGunKey(row.gunKey)
    if (!gunKey) continue

    const forces = gunForcesIndex.get(gunKey)

    if (!forces || forces.length === 0) {
      cell.flags.push({
        type: 'MISSING_GUN_FORCE_FOR_WELD_GUN',
        stationKey,
        gunKey,
        message: `Weld Gun ${gunKey} has no corresponding force data record`,
        severity: 'WARNING'
      })
      continue
    }

    if (forces.length > 1) {
      cell.flags.push({
        type: 'AMBIGUOUS_GUN_MATCH',
        stationKey,
        gunKey,
        message: `Weld Gun ${gunKey} matches ${forces.length} records in force list`,
        severity: 'WARNING'
      })
    }

    for (const force of forces) {
      cell.gunForces.push(force)
    }
  }
}

/**
 * Attach risers to cells
 */
const attachRisers = (
  rows: RiserSnapshot[],
  stations: Map<StationKey, CellSnapshot>
): void => {
  if (rows.length === 0) return

  for (const row of rows) {
    const key = normalizeStationId(row.stationKey)
    if (!key) continue

    const cell = stations.get(key)
    if (!cell) continue

    cell.risers.push(row)
  }
}

// ============================================================================
// PHASE 3: VALIDATION & FLAGGING
// ============================================================================

/**
 * Validate cells and generate flags
 */
const validateCells = (cells: CellSnapshot[]): CrossRefFlag[] => {
  const globalFlags: CrossRefFlag[] = []

  for (const cell of cells) {
    validateCell(cell)
  }

  return globalFlags
}

/**
 * Validate a single cell
 */
const validateCell = (cell: CellSnapshot): void => {
  // Check for missing simulation status
  if (!cell.simulationStatus) {
    cell.flags.push({
      type: 'STATION_WITHOUT_SIMULATION_STATUS',
      stationKey: cell.stationKey,
      message: `Station ${cell.stationKey} found in asset lists but missing from Simulation Status`,
      severity: 'WARNING'
    })
  }

  // Check robots for missing dress pack info
  for (const robot of cell.robots) {
    if (!robot.hasDressPackInfo) {
      cell.flags.push({
        type: 'ROBOT_MISSING_DRESS_PACK_INFO',
        stationKey: cell.stationKey,
        robotKey: robot.robotKey,
        message: `Robot ${robot.robotKey} is missing Dress Pack / Order Code info`,
        severity: 'WARNING'
      })
    }
  }

  // Check tools for missing ownership
  for (const tool of cell.tools) {
    const hasOwner = tool.simLeader || tool.teamLeader
    if (!hasOwner) {
      cell.flags.push({
        type: 'TOOL_WITHOUT_OWNER',
        stationKey: cell.stationKey,
        message: `Tool record in ${cell.stationKey} has no Sim Leader or Team Leader assigned`,
        severity: 'WARNING'
      })
    }
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Calculate statistics from the cross-reference result
 */
const calculateStats = (
  cells: CellSnapshot[],
  globalFlags: CrossRefFlag[]
): CrossRefResult['stats'] => {
  let totalFlags = globalFlags.length
  let cellsWithRisks = 0
  let robotCount = 0
  let toolCount = 0
  let weldGunCount = 0
  let riserCount = 0

  for (const cell of cells) {
    totalFlags += cell.flags.length

    if (cell.flags.length > 0) {
      cellsWithRisks++
    }

    robotCount += cell.robots.length
    toolCount += cell.tools.length
    weldGunCount += cell.weldGuns.length
    riserCount += cell.risers.length
  }

  return {
    totalCells: cells.length,
    cellsWithRisks,
    totalFlags,
    robotCount,
    toolCount,
    weldGunCount,
    riserCount
  }
}
