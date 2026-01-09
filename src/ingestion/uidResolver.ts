// UID Resolver
// Resolves canonical keys to stable UIDs using alias rules and existing records

import {
  StationUid,
  ToolUid,
  RobotUid,
  StationRecord,
  ToolRecord,
  RobotRecord,
  AliasRule,
  StationLabels,
  ToolLabels,
  RobotLabels,
  PlantKey,
  generateStationUid,
  generateToolUid,
  generateRobotUid,
  EntityType
} from '../domain/uidTypes'
import {
  findStationCandidates,
  findToolCandidates,
  findRobotCandidates,
  FuzzyCandidate
} from './fuzzyMatcher'

// ============================================================================
// TYPES
// ============================================================================

export interface UidResolutionContext {
  stationRecords: StationRecord[]
  toolRecords: ToolRecord[]
  robotRecords: RobotRecord[]
  aliasRules: AliasRule[]
  plantKey: PlantKey
}

export interface StationResolution {
  uid: StationUid | null // null if ambiguous
  isNew: boolean
  matchedVia: 'alias' | 'exact_key' | 'created' | 'ambiguous'
  inactiveMatch?: {
    uid: StationUid
    key: string
    labels: StationLabels
  }
  candidates?: FuzzyCandidate[]
}

export interface ToolResolution {
  uid: ToolUid | null // null if ambiguous
  isNew: boolean
  matchedVia: 'alias' | 'exact_key' | 'created' | 'ambiguous'
  inactiveMatch?: {
    uid: ToolUid
    key: string
    labels: ToolLabels
  }
  candidates?: FuzzyCandidate[]
}

export interface RobotResolution {
  uid: RobotUid | null // null if ambiguous
  isNew: boolean
  matchedVia: 'alias' | 'exact_key' | 'created' | 'ambiguous'
  inactiveMatch?: {
    uid: RobotUid
    key: string
    labels: RobotLabels
  }
  candidates?: FuzzyCandidate[]
}

// ============================================================================
// STATION RESOLUTION
// ============================================================================

/**
 * Resolve canonical station key to UID
 * Strategy:
 * 1. Check alias rules (fromKey -> toUid)
 * 2. Check existing records (key -> uid)
 * 3. Check fuzzy matches - if found, return ambiguous (user must decide)
 * 4. Create new if no candidates
 */
export function resolveStationUid(
  key: string,
  labels: StationLabels,
  attributes: Record<string, any>,
  context: UidResolutionContext,
  sourceInfo: { sourceFile: string; sheetName?: string; rowIndex?: number }
): StationResolution {
  // Strategy 1: Check alias rules
  const aliasRule = context.aliasRules.find(
    rule => rule.entityType === 'station' && rule.fromKey === key &&
           (rule.plantKey === context.plantKey || rule.isGlobal)
  )

  if (aliasRule) {
    return {
      uid: aliasRule.toUid as StationUid,
      isNew: false,
      matchedVia: 'alias'
    }
  }

  // Strategy 2: Check existing records by key
  const existingRecord = context.stationRecords.find(
    record => record.key === key && record.status === 'active' && record.plantKey === context.plantKey
  )

  if (existingRecord) {
    return {
      uid: existingRecord.uid,
      isNew: false,
      matchedVia: 'exact_key'
    }
  }

  // Check for inactive match
  const inactiveRecord = context.stationRecords.find(
    record => record.key === key && record.status === 'inactive' && record.plantKey === context.plantKey
  )

  // Strategy 3: Check fuzzy matches - if found, return ambiguous
  const candidates = findStationCandidates(key, labels, context.plantKey, context.stationRecords)

  if (candidates.length > 0) {
    return {
      uid: null,
      isNew: false,
      matchedVia: 'ambiguous',
      candidates,
      inactiveMatch: inactiveRecord ? {
        uid: inactiveRecord.uid,
        key: inactiveRecord.key,
        labels: inactiveRecord.labels
      } : undefined
    }
  }

  // Strategy 4: Create new (no candidates found)
  const newUid = generateStationUid()

  const newRecord: StationRecord = {
    uid: newUid,
    key,
    plantKey: context.plantKey,
    labels,
    attributes,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...sourceInfo
  }

  context.stationRecords.push(newRecord)

  return {
    uid: newUid,
    isNew: true,
    matchedVia: 'created',
    inactiveMatch: inactiveRecord ? {
      uid: inactiveRecord.uid,
      key: inactiveRecord.key,
      labels: inactiveRecord.labels
    } : undefined
  }
}

// ============================================================================
// TOOL RESOLUTION
// ============================================================================

/**
 * Resolve canonical tool key to UID
 * Same strategy as station resolution
 */
export function resolveToolUid(
  key: string,
  labels: ToolLabels,
  stationUid: StationUid | null,
  attributes: Record<string, any>,
  context: UidResolutionContext,
  sourceInfo: { sourceFile: string; sheetName?: string; rowIndex?: number }
): ToolResolution {
  // Strategy 1: Check alias rules
  const aliasRule = context.aliasRules.find(
    rule => rule.entityType === 'tool' && rule.fromKey === key &&
           (rule.plantKey === context.plantKey || rule.isGlobal)
  )

  if (aliasRule) {
    return {
      uid: aliasRule.toUid as ToolUid,
      isNew: false,
      matchedVia: 'alias'
    }
  }

  // Strategy 2: Check existing records by key
  const existingRecord = context.toolRecords.find(
    record => record.key === key && record.status === 'active' && record.plantKey === context.plantKey
  )

  if (existingRecord) {
    return {
      uid: existingRecord.uid,
      isNew: false,
      matchedVia: 'exact_key'
    }
  }

  // Check for inactive match
  const inactiveRecord = context.toolRecords.find(
    record => record.key === key && record.status === 'inactive' && record.plantKey === context.plantKey
  )

  // Strategy 3: Check fuzzy matches
  const candidates = findToolCandidates(key, labels, context.plantKey, context.toolRecords)

  if (candidates.length > 0) {
    return {
      uid: null,
      isNew: false,
      matchedVia: 'ambiguous',
      candidates,
      inactiveMatch: inactiveRecord ? {
        uid: inactiveRecord.uid,
        key: inactiveRecord.key,
        labels: inactiveRecord.labels
      } : undefined
    }
  }

  // Strategy 4: Create new
  const newUid = generateToolUid()

  const newRecord: ToolRecord = {
    uid: newUid,
    key,
    plantKey: context.plantKey,
    stationUid,
    labels,
    attributes,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...sourceInfo
  }

  context.toolRecords.push(newRecord)

  return {
    uid: newUid,
    isNew: true,
    matchedVia: 'created',
    inactiveMatch: inactiveRecord ? {
      uid: inactiveRecord.uid,
      key: inactiveRecord.key,
      labels: inactiveRecord.labels
    } : undefined
  }
}

// ============================================================================
// ROBOT RESOLUTION
// ============================================================================

/**
 * Resolve canonical robot key to UID
 * Same strategy as station resolution
 */
export function resolveRobotUid(
  key: string,
  labels: RobotLabels,
  stationUid: StationUid | null,
  attributes: Record<string, any>,
  context: UidResolutionContext,
  sourceInfo: { sourceFile: string; sheetName?: string; rowIndex?: number }
): RobotResolution {
  // Strategy 1: Check alias rules
  const aliasRule = context.aliasRules.find(
    rule => rule.entityType === 'robot' && rule.fromKey === key &&
           (rule.plantKey === context.plantKey || rule.isGlobal)
  )

  if (aliasRule) {
    return {
      uid: aliasRule.toUid as RobotUid,
      isNew: false,
      matchedVia: 'alias'
    }
  }

  // Strategy 2: Check existing records by key
  const existingRecord = context.robotRecords.find(
    record => record.key === key && record.status === 'active' && record.plantKey === context.plantKey
  )

  if (existingRecord) {
    return {
      uid: existingRecord.uid,
      isNew: false,
      matchedVia: 'exact_key'
    }
  }

  // Check for inactive match
  const inactiveRecord = context.robotRecords.find(
    record => record.key === key && record.status === 'inactive' && record.plantKey === context.plantKey
  )

  // Strategy 3: Check fuzzy matches
  const candidates = findRobotCandidates(key, labels, context.plantKey, context.robotRecords)

  if (candidates.length > 0) {
    return {
      uid: null,
      isNew: false,
      matchedVia: 'ambiguous',
      candidates,
      inactiveMatch: inactiveRecord ? {
        uid: inactiveRecord.uid,
        key: inactiveRecord.key,
        labels: inactiveRecord.labels
      } : undefined
    }
  }

  // Strategy 4: Create new
  const newUid = generateRobotUid()

  const newRecord: RobotRecord = {
    uid: newUid,
    key,
    plantKey: context.plantKey,
    stationUid,
    labels,
    attributes,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...sourceInfo
  }

  context.robotRecords.push(newRecord)

  return {
    uid: newUid,
    isNew: true,
    matchedVia: 'created',
    inactiveMatch: inactiveRecord ? {
      uid: inactiveRecord.uid,
      key: inactiveRecord.key,
      labels: inactiveRecord.labels
    } : undefined
  }
}

// ============================================================================
// ALIAS RULE CREATION
// ============================================================================

/**
 * Create an alias rule mapping old key to existing UID
 * Used when user confirms a rename/move
 */
export function createAliasRule(
  fromKey: string,
  toUid: string,
  entityType: EntityType,
  reason: string,
  createdBy?: string
): AliasRule {
  return {
    id: crypto.randomUUID(),
    fromKey,
    toUid,
    entityType,
    reason,
    createdAt: new Date().toISOString(),
    createdBy
  }
}

// ============================================================================
// WARNING COLLECTION
// ============================================================================

/**
 * Collect inactive entity warnings from resolution results
 * Call this after resolving all UIDs to collect warnings
 */
export function collectInactiveWarnings(
  resolutions: Array<{
    resolution: StationResolution | ToolResolution | RobotResolution
    entityType: 'station' | 'tool' | 'robot'
    fileName: string
    sheetName?: string
    rowIndex?: number
  }>
): Array<{
  entityType: 'station' | 'tool' | 'robot'
  key: string
  inactiveUid: string
  fileName: string
  sheetName?: string
  rowIndex?: number
}> {
  const warnings: Array<{
    entityType: 'station' | 'tool' | 'robot'
    key: string
    inactiveUid: string
    fileName: string
    sheetName?: string
    rowIndex?: number
  }> = []

  for (const { resolution, entityType, fileName, sheetName, rowIndex } of resolutions) {
    if (resolution.inactiveMatch) {
      warnings.push({
        entityType,
        key: resolution.inactiveMatch.key,
        inactiveUid: resolution.inactiveMatch.uid,
        fileName,
        sheetName,
        rowIndex
      })
    }
  }

  return warnings
}
