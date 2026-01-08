/**
 * Ambiguity Mutator
 *
 * Deterministically mutates entity identifiers to GUARANTEE ambiguous matches.
 * Unlike identifierMutator.ts which creates renames, this creates collisions
 * that force the fuzzy matcher to return multiple candidates.
 *
 * Strategy:
 * - Analyze existing records to find "collision zones" (entities with shared discriminators)
 * - Mutate incoming keys to land in these zones
 * - Guarantee at least N ambiguous items per run
 */

import {
  StationRecord,
  ToolRecord,
  RobotRecord,
  PlantKey,
  StationLabels,
  ToolLabels,
  RobotLabels
} from '../src/domain/uidTypes'
import { findStationCandidates, findToolCandidates, findRobotCandidates } from '../src/ingestion/fuzzyMatcher'
import { log } from './nodeLog'

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AmbiguityMutatorConfig {
  targetAmbiguous: number // Minimum number of ambiguous items to create
  seed: number // Random seed for determinism
  mutationRate?: number // Fallback rate if target can't be met
}

export interface AmbiguityMutationResult {
  stations: StationRecord[]
  tools: ToolRecord[]
  robots: RobotRecord[]
  ambiguousMutations: number
  renameMutations: number
  report: AmbiguityMutationReport
}

export interface AmbiguityMutationReport {
  targetAmbiguous: number
  actualAmbiguous: number
  stationMutations: number
  toolMutations: number
  robotMutations: number
  shortfall?: {
    reason: string
    missingCount: number
  }
}

// ============================================================================
// SEEDED RNG
// ============================================================================

class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
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
// COLLISION ZONE DETECTION
// ============================================================================

/**
 * Find groups of stations that share discriminators
 * These are prime targets for creating ambiguity
 */
function findStationCollisionZones(
  prevRecords: StationRecord[],
  plantKey: PlantKey
): Array<{ records: StationRecord[]; sharedDiscriminator: string }> {
  const zones: Array<{ records: StationRecord[]; sharedDiscriminator: string }> = []
  const byLineAndBay = new Map<string, StationRecord[]>()

  for (const record of prevRecords) {
    if (record.plantKey !== plantKey) continue
    if (record.status !== 'active') continue

    const discriminator = `${record.labels.line}_${record.labels.bay}`
    if (!byLineAndBay.has(discriminator)) {
      byLineAndBay.set(discriminator, [])
    }
    byLineAndBay.get(discriminator)!.push(record)
  }

  // Find groups with 2+ stations
  for (const [discriminator, records] of byLineAndBay.entries()) {
    if (records.length >= 2) {
      zones.push({ records, sharedDiscriminator: discriminator })
    }
  }

  return zones
}

/**
 * Find groups of tools that share discriminators
 */
function findToolCollisionZones(
  prevRecords: ToolRecord[],
  plantKey: PlantKey
): Array<{ records: ToolRecord[]; sharedDiscriminator: string }> {
  const zones: Array<{ records: ToolRecord[]; sharedDiscriminator: string }> = []
  const byToolCode = new Map<string, ToolRecord[]>()

  for (const record of prevRecords) {
    if (record.plantKey !== plantKey) continue
    if (record.status !== 'active') continue

    const code = record.labels.toolCode || record.labels.toolName
    if (!code) continue

    if (!byToolCode.has(code)) {
      byToolCode.set(code, [])
    }
    byToolCode.get(code)!.push(record)
  }

  // Find groups with 2+ tools
  for (const [code, records] of byToolCode.entries()) {
    if (records.length >= 2) {
      zones.push({ records, sharedDiscriminator: code })
    }
  }

  return zones
}

/**
 * Find groups of robots that share discriminators
 */
function findRobotCollisionZones(
  prevRecords: RobotRecord[],
  plantKey: PlantKey
): Array<{ records: RobotRecord[]; sharedDiscriminator: string }> {
  const zones: Array<{ records: RobotRecord[]; sharedDiscriminator: string }> = []
  const byCaption = new Map<string, RobotRecord[]>()

  for (const record of prevRecords) {
    if (record.plantKey !== plantKey) continue
    if (record.status !== 'active') continue

    const caption = record.labels.robotCaption
    if (!caption) continue

    // Group by caption prefix (first 3-5 chars)
    const prefix = caption.substring(0, Math.min(5, caption.length))
    if (!byCaption.has(prefix)) {
      byCaption.set(prefix, [])
    }
    byCaption.get(prefix)!.push(record)
  }

  // Find groups with 2+ robots
  for (const [prefix, records] of byCaption.entries()) {
    if (records.length >= 2) {
      zones.push({ records, sharedDiscriminator: prefix })
    }
  }

  return zones
}

// ============================================================================
// AMBIGUITY MUTATION STRATEGIES
// ============================================================================

/**
 * Mutate a station to collide with existing stations in a zone
 */
function mutateStationForCollision(
  record: StationRecord,
  zone: { records: StationRecord[]; sharedDiscriminator: string },
  rng: SeededRandom
): StationRecord {
  // Pick a target from the zone
  const target = zone.records[rng.nextInt(zone.records.length)]

  // Create a new key that will match both targets
  // Strategy: use the target's line+bay but a different station number
  const newKey = `${target.labels.line}_${target.labels.bay}-COLLISION${rng.nextInt(100)}`

  return {
    ...record,
    key: newKey,
    labels: {
      line: target.labels.line,
      bay: target.labels.bay,
      stationNo: `COLLISION${rng.nextInt(100)}`,
      fullLabel: `${target.labels.line} ${target.labels.bay} COLLISION`
    }
  }
}

/**
 * Mutate a tool to collide with existing tools in a zone
 */
function mutateToolForCollision(
  record: ToolRecord,
  zone: { records: ToolRecord[]; sharedDiscriminator: string },
  rng: SeededRandom
): ToolRecord {
  // Pick a target from the zone
  const target = zone.records[rng.nextInt(zone.records.length)]

  // Create a new key with same tool code but different suffix
  const newKey = `${target.labels.toolCode}_COLLISION${rng.nextInt(100)}`

  return {
    ...record,
    key: newKey,
    labels: {
      toolCode: target.labels.toolCode,
      toolName: `${target.labels.toolName || target.labels.toolCode} COLLISION`,
      gunNumber: `COLLISION${rng.nextInt(100)}`
    }
  }
}

/**
 * Mutate a robot to collide with existing robots in a zone
 */
function mutateRobotForCollision(
  record: RobotRecord,
  zone: { records: RobotRecord[]; sharedDiscriminator: string },
  rng: SeededRandom
): RobotRecord {
  // Pick a target from the zone
  const target = zone.records[rng.nextInt(zone.records.length)]

  // Create a new key with same caption prefix
  const newKey = `${zone.sharedDiscriminator}_COLLISION${rng.nextInt(100)}`

  return {
    ...record,
    key: newKey,
    labels: {
      robotNumber: `COLLISION${rng.nextInt(100)}`,
      robotCaption: `${zone.sharedDiscriminator} COLLISION`,
      eNumber: `E-COLLISION-${rng.nextInt(1000)}`
    }
  }
}

// ============================================================================
// MAIN AMBIGUITY MUTATION
// ============================================================================

/**
 * Apply ambiguity mutations to guarantee minimum ambiguous count
 */
export function applyAmbiguityMutations(
  newStationRecords: StationRecord[],
  newToolRecords: ToolRecord[],
  newRobotRecords: RobotRecord[],
  prevStationRecords: StationRecord[],
  prevToolRecords: ToolRecord[],
  prevRobotRecords: RobotRecord[],
  config: AmbiguityMutatorConfig,
  plantKey: PlantKey
): AmbiguityMutationResult {
  const rng = new SeededRandom(config.seed)
  const targetAmbiguous = config.targetAmbiguous
  let ambiguousMutations = 0

  log.info(`[AmbiguityMutator] Target: ${targetAmbiguous} ambiguous items`)

  // Find collision zones in existing data
  const stationZones = findStationCollisionZones(prevStationRecords, plantKey)
  const toolZones = findToolCollisionZones(prevToolRecords, plantKey)
  const robotZones = findRobotCollisionZones(prevRobotRecords, plantKey)

  log.info(`[AmbiguityMutator] Found collision zones: ${stationZones.length} station, ${toolZones.length} tool, ${robotZones.length} robot`)

  const mutatedStations = [...newStationRecords]
  const mutatedTools = [...newToolRecords]
  const mutatedRobots = [...newRobotRecords]

  let stationMutations = 0
  let toolMutations = 0
  let robotMutations = 0

  // Shuffle to avoid bias
  const shuffledStations = rng.shuffle([...Array(mutatedStations.length).keys()])
  const shuffledTools = rng.shuffle([...Array(mutatedTools.length).keys()])
  const shuffledRobots = rng.shuffle([...Array(mutatedRobots.length).keys()])

  // Mutate stations
  if (stationZones.length > 0) {
    const stationsNeeded = Math.ceil(targetAmbiguous / 3)
    for (let i = 0; i < Math.min(stationsNeeded, shuffledStations.length); i++) {
      const idx = shuffledStations[i]
      const zone = stationZones[i % stationZones.length]
      mutatedStations[idx] = mutateStationForCollision(mutatedStations[idx], zone, rng)
      stationMutations++
      ambiguousMutations++
    }
  }

  // Mutate tools
  if (toolZones.length > 0) {
    const toolsNeeded = Math.ceil(targetAmbiguous / 3)
    for (let i = 0; i < Math.min(toolsNeeded, shuffledTools.length); i++) {
      const idx = shuffledTools[i]
      const zone = toolZones[i % toolZones.length]
      mutatedTools[idx] = mutateToolForCollision(mutatedTools[idx], zone, rng)
      toolMutations++
      ambiguousMutations++
    }
  }

  // Mutate robots
  if (robotZones.length > 0) {
    const robotsNeeded = Math.ceil(targetAmbiguous / 3)
    for (let i = 0; i < Math.min(robotsNeeded, shuffledRobots.length); i++) {
      const idx = shuffledRobots[i]
      const zone = robotZones[i % robotZones.length]
      mutatedRobots[idx] = mutateRobotForCollision(mutatedRobots[idx], zone, rng)
      robotMutations++
      ambiguousMutations++
    }
  }

  const report: AmbiguityMutationReport = {
    targetAmbiguous,
    actualAmbiguous: ambiguousMutations,
    stationMutations,
    toolMutations,
    robotMutations
  }

  if (ambiguousMutations < targetAmbiguous) {
    report.shortfall = {
      reason: `Insufficient collision zones (${stationZones.length + toolZones.length + robotZones.length} total) or records (${newStationRecords.length + newToolRecords.length + newRobotRecords.length} total)`,
      missingCount: targetAmbiguous - ambiguousMutations
    }
    log.warn(`[AmbiguityMutator] Could not reach target: ${ambiguousMutations}/${targetAmbiguous}`)
    log.warn(`[AmbiguityMutator] Reason: ${report.shortfall.reason}`)
  } else {
    log.info(`[AmbiguityMutator] Successfully created ${ambiguousMutations} ambiguous mutations`)
  }

  return {
    stations: mutatedStations,
    tools: mutatedTools,
    robots: mutatedRobots,
    ambiguousMutations,
    renameMutations: 0,
    report
  }
}
