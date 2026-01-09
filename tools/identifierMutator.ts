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

export interface CollisionMutationConfig {
  seed: number
  targetAmbiguous: number // Minimum number of ambiguous items to create
  plantKey: string // Plant key for scoping collision zones
}

const DEFAULT_CONFIG: MutationConfig = {
  mutationRate: 0.02, // 2% mutation rate by default
  seed: 1
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

  nextInt(max: number): number {
    return Math.floor(this.next() * max)
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1)
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
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

// ============================================================================
// COLLISION-ZONE AMBIGUITY MUTATIONS (Pre-Resolution)
// ============================================================================

/**
 * Mutate parsed Cells to GUARANTEE ambiguous matches
 * Strategy: Find existing stations with shared line+bay, mutate incoming cells
 * to share those discriminators but with different station numbers
 */
export function mutateCollisionCells(
  cells: Cell[],
  prevRecords: StationRecord[],
  config: CollisionMutationConfig
): { mutated: Cell[]; mutationLog: string[] } {
  const rng = new SeededRandom(config.seed)
  const mutated: Cell[] = [...cells]
  const mutationLog: string[] = []

  if (cells.length === 0 || prevRecords.length === 0) {
    return { mutated, mutationLog }
  }

  // Build collision zone index: group prevRecords by (line+bay)
  const zoneIndex = new Map<string, StationRecord[]>()
  for (const record of prevRecords) {
    if (record.plantKey !== config.plantKey) continue
    if (record.status !== 'active') continue
    const { line, bay } = record.labels
    if (!line || !bay) continue

    const zoneKey = `${line}_${bay}`
    if (!zoneIndex.has(zoneKey)) {
      zoneIndex.set(zoneKey, [])
    }
    zoneIndex.get(zoneKey)!.push(record)
  }

  // Find zones with 2+ stations (collision candidates)
  const collisionZones = Array.from(zoneIndex.entries())
    .filter(([_, records]) => records.length >= 2)

  if (collisionZones.length === 0) {
    log.debug(`[CollisionMutator] No collision zones found for cells (need zones with 2+ stations)`)
    return { mutated, mutationLog }
  }

  // Shuffle cells deterministically
  const indices = rng.shuffle([...Array(mutated.length).keys()])

  // Mutate up to targetAmbiguous cells
  let mutationCount = 0
  for (let i = 0; i < indices.length && mutationCount < config.targetAmbiguous; i++) {
    const idx = indices[i]
    const cell = mutated[idx]
    const zone = collisionZones[mutationCount % collisionZones.length]
    const [zoneKey, zoneRecords] = zone

    // Pick a random target from the zone
    const target = zoneRecords[rng.nextInt(zoneRecords.length)]

    // Parse existing cell id to extract components (assuming format like "proj-TMS-STLA-S-area-X-cell-Y")
    const oldId = cell.id
    const oldArea = cell.area || ''
    const oldLocation = cell.location || ''
    const oldStation = cell.station || ''

    // Create new station number that differs from all existing in the zone
    const existingStationNos = zoneRecords.map(r => r.labels.stationNo)
    const newStationNo = generateCollisionStationNo(existingStationNos, rng)

    // Mutate cell to match target's line+bay but different station
    const newArea = target.labels.line
    const newLocation = target.labels.bay
    const newStation = newStationNo

    // Reconstruct cell id (simplified - matches keyDerivation pattern)
    const newId = `proj-${config.plantKey}-area-${newArea}-cell-${newLocation}-${newStation}`

    mutated[idx] = {
      ...cell,
      id: newId,
      area: newArea,
      location: newLocation,
      station: newStation
    }

    mutationLog.push(`Cell: "${oldId}" -> "${newId}" (collision zone: ${zoneKey})`)
    mutationCount++
  }

  if (mutationCount > 0) {
    log.info(`[CollisionMutator] Created ${mutationCount} collision cell mutations`)
  }

  return { mutated, mutationLog }
}

/**
 * Mutate parsed Tools to GUARANTEE ambiguous matches
 * Strategy: Find existing tools with shared toolCode, mutate incoming tools
 * to share toolCode but with different keys/names
 */
export function mutateCollisionTools(
  tools: Tool[],
  prevRecords: ToolRecord[],
  config: CollisionMutationConfig
): { mutated: Tool[]; mutationLog: string[] } {
  // Guard: always return valid arrays
  if (!tools || !Array.isArray(tools)) {
    log.warn(`[CollisionMutator] Invalid tools input: ${typeof tools}`)
    return { mutated: [], mutationLog: [] }
  }

  const rng = new SeededRandom(config.seed)
  const mutated: Tool[] = [...tools]
  const mutationLog: string[] = []

  if (tools.length === 0) {
    return { mutated, mutationLog }
  }

  // Build collision zone index from BOTH prevRecords AND current tools
  const zoneIndex = new Map<string, { id: string; name: string }[]>()

  // Add prevRecords to zone index
  if (prevRecords && prevRecords.length > 0) {
    for (const record of prevRecords) {
      if (!record || !record.plantKey || !record.labels) continue
      if (record.plantKey !== config.plantKey) continue
      if (record.status !== 'active') continue
      const toolCode = record.labels.toolCode
      if (!toolCode) continue

      if (!zoneIndex.has(toolCode)) {
        zoneIndex.set(toolCode, [])
      }
      const zone = zoneIndex.get(toolCode)
      if (zone) {
        zone.push({ id: record.key, name: record.labels.toolName || toolCode })
      }
    }
  }

  // CRITICAL: Also index the CURRENT batch of tools to find intra-file collisions
  // Extract tool codes from current tools
  const toolCodePattern = /^tool[-_]([A-Z0-9]+)/i
  for (const tool of tools) {
    if (!tool.id) continue
    const match = tool.id.match(toolCodePattern)
    const toolCode = match ? match[1] : (tool.name || tool.id).split(/[\s_-]/)[0]
    if (!toolCode) continue

    if (!zoneIndex.has(toolCode)) {
      zoneIndex.set(toolCode, [])
    }
    const zone = zoneIndex.get(toolCode)
    if (zone) {
      zone.push({ id: tool.id, name: tool.name || tool.id })
    }
  }

  // Find zones with 2+ tools
  const collisionZones = Array.from(zoneIndex.entries())
    .filter(([_, items]) => items.length >= 2)

  if (collisionZones.length === 0) {
    log.debug(`[CollisionMutator] No collision zones found for tools (need zones with 2+ tools sharing toolCode). Checked ${tools.length} tools and ${prevRecords?.length || 0} prevRecords.`)
    return { mutated, mutationLog }
  }

  log.debug(`[CollisionMutator] Found ${collisionZones.length} tool collision zones from ${zoneIndex.size} unique tool codes`)

  // NEW STRATEGY: For each collision zone, find tools WITHIN the current batch that belong to that zone
  // and mutate them to create duplicates with different IDs but same toolCode
  let mutationCount = 0
  const shuffledZones = rng.shuffle([...collisionZones])

  for (const [sharedToolCode, zoneMembers] of shuffledZones) {
    if (mutationCount >= config.targetAmbiguous) break

    // Find tools in the current batch that have this toolCode (from indexing above)
    // Look for tools whose extracted toolCode matches this zone's toolCode
    const candidateIndices: number[] = []
    for (let i = 0; i < mutated.length; i++) {
      const tool = mutated[i]
      if (!tool.id) continue

      // Extract toolCode same way as when building zones
      const match = tool.id.match(/^tool[-_]([A-Z0-9]+)/i)
      const extractedCode = match ? match[1] : (tool.name || tool.id).split(/[\s_-]/)[0]
      if (extractedCode && extractedCode.toUpperCase() === sharedToolCode.toUpperCase()) {
        candidateIndices.push(i)
      }
    }

    if (candidateIndices.length === 0) continue

    // Pick ONE tool from this zone to mutate
    const idx = candidateIndices[rng.nextInt(candidateIndices.length)]
    const tool = mutated[idx]

    const oldId = tool.id
    const oldName = tool.name || ''
    const oldToolNo = tool.toolNo || ''

    // Create a variant: different ID but same toolNo so it shares toolCode
    const suffix = `COL${rng.nextInt(1000)}`
    const newId = `tool-${sharedToolCode}-${suffix}`
    const newToolNo = oldToolNo || sharedToolCode  // Preserve existing toolNo if present, else use sharedToolCode
    const newName = `${sharedToolCode} ${suffix}`

    mutated[idx] = {
      ...tool,
      id: newId,
      toolNo: newToolNo,  // This will be used for labels.toolCode extraction
      name: newName,
      description: tool.description ? `${tool.description} (collision test)` : `(collision test)`
    }

    mutationLog.push(`Tool: "${oldId}" (toolNo="${oldToolNo}") -> "${newId}" (toolNo="${newToolNo}", zone: ${sharedToolCode})`)
    mutationCount++
  }

  if (mutationCount > 0) {
    log.info(`[CollisionMutator] Created ${mutationCount} collision tool mutations`)
    // TEMP DEBUG: Verify mutations are in the array
    const colToolsInArray = mutated.filter(t => t.id && t.id.includes('COL')).length
    console.log(`>>> DEBUG: mutated array contains ${colToolsInArray} tools with COL in id (out of ${mutated.length} total)`)
  }

  return { mutated, mutationLog }
}

/**
 * Mutate parsed Robots to GUARANTEE ambiguous matches
 * Strategy: Find existing robots with shared caption prefix, mutate incoming robots
 * to share prefix but with different full captions
 */
export function mutateCollisionRobots(
  robots: Robot[],
  prevRecords: RobotRecord[],
  config: CollisionMutationConfig
): { mutated: Robot[]; mutationLog: string[] } {
  const rng = new SeededRandom(config.seed)
  const mutated: Robot[] = [...robots]
  const mutationLog: string[] = []

  if (robots.length === 0 || prevRecords.length === 0) {
    return { mutated, mutationLog }
  }

  // Build collision zone index: group by robotCaption prefix (first 5 chars)
  const zoneIndex = new Map<string, RobotRecord[]>()
  for (const record of prevRecords) {
    if (record.plantKey !== config.plantKey) continue
    if (record.status !== 'active') continue
    const caption = record.labels.robotCaption
    if (!caption || caption.length < 3) continue

    const prefix = caption.substring(0, Math.min(5, caption.length))
    if (!zoneIndex.has(prefix)) {
      zoneIndex.set(prefix, [])
    }
    zoneIndex.get(prefix)!.push(record)
  }

  // Find zones with 2+ robots
  const collisionZones = Array.from(zoneIndex.entries())
    .filter(([_, records]) => records.length >= 2)

  if (collisionZones.length === 0) {
    log.debug(`[CollisionMutator] No collision zones found for robots (need zones with 2+ robots sharing caption prefix)`)
    return { mutated, mutationLog }
  }

  // Shuffle robots deterministically
  const indices = rng.shuffle([...Array(mutated.length).keys()])

  // Mutate up to targetAmbiguous robots
  let mutationCount = 0
  for (let i = 0; i < indices.length && mutationCount < config.targetAmbiguous; i++) {
    const idx = indices[i]
    const robot = mutated[idx]
    const zone = collisionZones[mutationCount % collisionZones.length]
    const [prefix, zoneRecords] = zone

    const oldId = robot.id
    const oldName = robot.name || ''

    // Create new id with same prefix but different suffix
    const suffix = `COLLISION${rng.nextInt(1000)}`
    const newId = `robot-${prefix}-${suffix}`
    const newName = `${prefix} ${suffix}`

    mutated[idx] = {
      ...robot,
      id: newId,
      name: newName,
      oemModel: `${robot.oemModel || prefix} COLLISION`,
      description: `${robot.description || ''} (collision test)`.trim()
    }

    mutationLog.push(`Robot: "${oldId}" -> "${newId}" (collision zone: ${prefix})`)
    mutationCount++
  }

  if (mutationCount > 0) {
    log.info(`[CollisionMutator] Created ${mutationCount} collision robot mutations`)
  }

  return { mutated, mutationLog }
}

/**
 * Generate a station number that will collide with existing stations
 * but is not an exact match
 */
function generateCollisionStationNo(existingStationNos: string[], rng: SeededRandom): string {
  // Try to create a variant that's close but different
  if (existingStationNos.length > 0) {
    const base = existingStationNos[rng.nextInt(existingStationNos.length)]
    // Add a suffix to make it different but similar
    return `${base}-COL${rng.nextInt(10)}`
  }
  // Fallback
  return `COLLISION${rng.nextInt(100)}`
}
