/**
 * Identifier Mutator
 *
 * Mutates entity identifiers in-memory to simulate real-world data drift
 * and test ambiguity detection logic.
 *
 * Does NOT modify Excel files - only mutates parsed data structures.
 */

import { StationRecord, ToolRecord, RobotRecord } from '../src/domain/uidTypes'
import { log } from './nodeLog'

// ============================================================================
// MUTATION CONFIG
// ============================================================================

export interface MutationConfig {
  mutationRate: number // Percentage of entities to mutate (0.01 = 1%, 0.02 = 2%)
  seed?: number        // Random seed for reproducibility
  ambiguityMode?: boolean // If true, create collisions instead of clean renames
  ambiguityTarget?: number // Target number of ambiguous items (requires ambiguityMode)
}

const DEFAULT_CONFIG: MutationConfig = {
  mutationRate: 0.10, // 10% mutation rate (for guaranteed mutations in testing)
  seed: 42
}

// ============================================================================
// RANDOM NUMBER GENERATOR (seeded)
// ============================================================================

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    // Linear congruential generator
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296
    return this.seed / 4294967296
  }
}

// ============================================================================
// MUTATION STRATEGIES
// ============================================================================

/**
 * Station mutations: stationNo normalization drift
 * "010" -> "10", "008" -> "8", add/remove prefixes
 */
function mutateStationKey(key: string): string {
  const strategies = [
    // Remove leading zeros: "AL_010-010" -> "AL_10-10"
    (k: string) => k.replace(/(\d+)/g, (match) => String(parseInt(match, 10))),

    // Add ST prefix: "AL_010-010" -> "AL_ST010-ST010"
    (k: string) => k.replace(/(\d+)/g, 'ST$1'),

    // Add OP prefix: "AL_010-010" -> "AL_OP010-OP010"
    (k: string) => k.replace(/(\d+)/g, 'OP$1'),

    // Remove underscores: "AL_010-010" -> "AL010-010"
    (k: string) => k.replace(/_/g, ''),

    // Change separator: "AL_010-010" -> "AL_010_010"
    (k: string) => k.replace(/-/g, '_')
  ]

  const strategy = strategies[Math.floor(Math.random() * strategies.length)]
  return strategy(key)
}

/**
 * Tool mutations: spacing/formatting drift
 * "GUN01" <-> "GUN 01", "SEALER_01" <-> "SEALER 01"
 */
function mutateToolKey(key: string): string {
  const strategies = [
    // Add space before numbers: "GUN01" -> "GUN 01"
    (k: string) => k.replace(/([A-Z]+)(\d+)/g, '$1 $2'),

    // Remove spaces: "GUN 01" -> "GUN01"
    (k: string) => k.replace(/\s+/g, ''),

    // Replace underscore with space: "SEALER_01" -> "SEALER 01"
    (k: string) => k.replace(/_/g, ' '),

    // Replace space with underscore: "GUN 01" -> "GUN_01"
    (k: string) => k.replace(/\s+/g, '_'),

    // Remove leading zeros: "GUN01" -> "GUN1"
    (k: string) => k.replace(/0+(\d)/g, '$1')
  ]

  const strategy = strategies[Math.floor(Math.random() * strategies.length)]
  return strategy(key)
}

/**
 * Robot mutations: caption/number formatting drift
 * "R01" -> "R1", "ROBOT_01" -> "ROBOT01"
 */
function mutateRobotKey(key: string): string {
  const strategies = [
    // Remove leading zeros: "R01" -> "R1"
    (k: string) => k.replace(/0+(\d)/g, '$1'),

    // Add ROBOT prefix: "R01" -> "ROBOT_R01"
    (k: string) => `ROBOT_${k}`,

    // Remove underscores: "ROBOT_01" -> "ROBOT01"
    (k: string) => k.replace(/_/g, ''),

    // Add space: "R01" -> "R 01"
    (k: string) => k.replace(/([A-Z]+)(\d+)/g, '$1 $2'),

    // Change to lowercase: "R01" -> "r01"
    (k: string) => k.toLowerCase()
  ]

  const strategy = strategies[Math.floor(Math.random() * strategies.length)]
  return strategy(key)
}

// ============================================================================
// MAIN MUTATION FUNCTIONS
// ============================================================================

/**
 * Mutate station records in-memory
 */
export function mutateStationRecords(
  records: StationRecord[],
  config: MutationConfig = DEFAULT_CONFIG
): { mutated: StationRecord[]; mutationLog: string[] } {
  const rng = new SeededRandom(config.seed || 42)
  const mutated: StationRecord[] = []
  const mutationLog: string[] = []

  for (const record of records) {
    if (rng.next() < config.mutationRate) {
      const oldKey = record.key
      const newKey = mutateStationKey(oldKey)

      if (newKey !== oldKey) {
        mutationLog.push(`Station: "${oldKey}" -> "${newKey}"`)
        mutated.push({
          ...record,
          key: newKey
        })
      } else {
        // Strategy didn't change key, keep original
        mutated.push(record)
      }
    } else {
      mutated.push(record)
    }
  }

  return { mutated, mutationLog }
}

/**
 * Mutate tool records in-memory
 */
export function mutateToolRecords(
  records: ToolRecord[],
  config: MutationConfig = DEFAULT_CONFIG
): { mutated: ToolRecord[]; mutationLog: string[] } {
  const rng = new SeededRandom(config.seed || 42)
  const mutated: ToolRecord[] = []
  const mutationLog: string[] = []

  for (const record of records) {
    if (rng.next() < config.mutationRate) {
      const oldKey = record.key
      const newKey = mutateToolKey(oldKey)

      if (newKey !== oldKey) {
        mutationLog.push(`Tool: "${oldKey}" -> "${newKey}"`)
        mutated.push({
          ...record,
          key: newKey
        })
      } else {
        mutated.push(record)
      }
    } else {
      mutated.push(record)
    }
  }

  return { mutated, mutationLog }
}

/**
 * Mutate robot records in-memory
 */
export function mutateRobotRecords(
  records: RobotRecord[],
  config: MutationConfig = DEFAULT_CONFIG
): { mutated: RobotRecord[]; mutationLog: string[] } {
  const rng = new SeededRandom(config.seed || 42)
  const mutated: RobotRecord[] = []
  const mutationLog: string[] = []

  for (const record of records) {
    if (rng.next() < config.mutationRate) {
      const oldKey = record.key
      const newKey = mutateRobotKey(oldKey)

      if (newKey !== oldKey) {
        mutationLog.push(`Robot: "${oldKey}" -> "${newKey}"`)
        mutated.push({
          ...record,
          key: newKey
        })
      } else {
        mutated.push(record)
      }
    } else {
      mutated.push(record)
    }
  }

  return { mutated, mutationLog }
}

/**
 * Apply mutations to all entity types and log changes
 */
export function applyMutations(
  stationRecords: StationRecord[],
  toolRecords: ToolRecord[],
  robotRecords: RobotRecord[],
  config: MutationConfig = DEFAULT_CONFIG
): {
  stations: StationRecord[]
  tools: ToolRecord[]
  robots: RobotRecord[]
  totalMutations: number
} {
  log.info(`[Mutator] Applying identifier mutations (rate: ${(config.mutationRate * 100).toFixed(1)}%)`)

  const { mutated: stations, mutationLog: stationLog } = mutateStationRecords(stationRecords, config)
  const { mutated: tools, mutationLog: toolLog } = mutateToolRecords(toolRecords, config)
  const { mutated: robots, mutationLog: robotLog } = mutateRobotRecords(robotRecords, config)

  const allLogs = [...stationLog, ...toolLog, ...robotLog]

  if (allLogs.length > 0) {
    log.info(`[Mutator] Applied ${allLogs.length} mutations:`)
    allLogs.forEach(entry => log.info(`  - ${entry}`))
  } else {
    log.info(`[Mutator] No mutations applied (random selection)`)
  }

  return {
    stations,
    tools,
    robots,
    totalMutations: allLogs.length
  }
}

// ============================================================================
// PRE-RESOLUTION MUTATIONS (for Cells/Tools/Robots)
// ============================================================================

import type { Cell, Tool, Robot } from '../src/domain/core'

/**
 * Mutate parsed Cell IDs BEFORE UID resolution
 * This allows the fuzzy matcher to detect ambiguity
 */
export function mutateCellIds(
  cells: Cell[],
  config: MutationConfig = DEFAULT_CONFIG
): { mutated: Cell[]; mutationLog: string[] } {
  const rng = new SeededRandom(config.seed || 42)
  const mutated: Cell[] = []
  const mutationLog: string[] = []

  for (const cell of cells) {
    if (rng.next() < config.mutationRate) {
      const oldId = cell.id
      // Apply same mutation strategies as stations
      const newId = mutateStationKey(oldId)

      if (newId !== oldId) {
        mutationLog.push(`Cell: "${oldId}" -> "${newId}"`)
        mutated.push({ ...cell, id: newId })
      } else {
        mutated.push(cell)
      }
    } else {
      mutated.push(cell)
    }
  }

  return { mutated, mutationLog }
}

/**
 * Mutate parsed Tool IDs BEFORE UID resolution
 */
export function mutateToolIds(
  tools: Tool[],
  config: MutationConfig = DEFAULT_CONFIG
): { mutated: Tool[]; mutationLog: string[] } {
  const rng = new SeededRandom(config.seed || 42)
  const mutated: Tool[] = []
  const mutationLog: string[] = []

  for (const tool of tools) {
    if (rng.next() < config.mutationRate) {
      const oldId = tool.id
      const newId = mutateToolKey(oldId)

      if (newId !== oldId) {
        mutationLog.push(`Tool: "${oldId}" -> "${newId}"`)
        mutated.push({ ...tool, id: newId })
      } else {
        mutated.push(tool)
      }
    } else {
      mutated.push(tool)
    }
  }

  return { mutated, mutationLog }
}

/**
 * Mutate parsed Robot IDs BEFORE UID resolution
 */
export function mutateRobotIds(
  robots: Robot[],
  config: MutationConfig = DEFAULT_CONFIG
): { mutated: Robot[]; mutationLog: string[] } {
  const rng = new SeededRandom(config.seed || 42)
  const mutated: Robot[] = []
  const mutationLog: string[] = []

  for (const robot of robots) {
    if (rng.next() < config.mutationRate) {
      const oldId = robot.id
      const newId = mutateRobotKey(oldId)

      if (newId !== oldId) {
        mutationLog.push(`Robot: "${oldId}" -> "${newId}"`)
        mutated.push({ ...robot, id: newId })
      } else {
        mutated.push(robot)
      }
    } else {
      mutated.push(robot)
    }
  }

  return { mutated, mutationLog }
}
