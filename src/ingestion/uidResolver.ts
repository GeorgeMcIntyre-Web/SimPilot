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
  generateStationUid,
  generateToolUid,
  generateRobotUid,
  EntityType
} from '../domain/uidTypes'

// ============================================================================
// TYPES
// ============================================================================

export interface UidResolutionContext {
  stationRecords: StationRecord[]
  toolRecords: ToolRecord[]
  robotRecords: RobotRecord[]
  aliasRules: AliasRule[]
}

export interface StationResolution {
  uid: StationUid
  isNew: boolean
  matchedVia: 'alias' | 'exact_key' | 'created'
}

export interface ToolResolution {
  uid: ToolUid
  isNew: boolean
  matchedVia: 'alias' | 'exact_key' | 'created'
}

export interface RobotResolution {
  uid: RobotUid
  isNew: boolean
  matchedVia: 'alias' | 'exact_key' | 'created'
}

// ============================================================================
// STATION RESOLUTION
// ============================================================================

/**
 * Resolve canonical station key to UID
 * Strategy:
 * 1. Check alias rules (fromKey -> toUid)
 * 2. Check existing records (key -> uid)
 * 3. Create new if not found
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
    rule => rule.entityType === 'station' && rule.fromKey === key
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
    record => record.key === key && record.status === 'active'
  )

  if (existingRecord) {
    return {
      uid: existingRecord.uid,
      isNew: false,
      matchedVia: 'exact_key'
    }
  }

  // Strategy 3: Create new
  const newUid = generateStationUid()

  const newRecord: StationRecord = {
    uid: newUid,
    key,
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
    matchedVia: 'created'
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
    rule => rule.entityType === 'tool' && rule.fromKey === key
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
    record => record.key === key && record.status === 'active'
  )

  if (existingRecord) {
    return {
      uid: existingRecord.uid,
      isNew: false,
      matchedVia: 'exact_key'
    }
  }

  // Strategy 3: Create new
  const newUid = generateToolUid()

  const newRecord: ToolRecord = {
    uid: newUid,
    key,
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
    matchedVia: 'created'
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
    rule => rule.entityType === 'robot' && rule.fromKey === key
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
    record => record.key === key && record.status === 'active'
  )

  if (existingRecord) {
    return {
      uid: existingRecord.uid,
      isNew: false,
      matchedVia: 'exact_key'
    }
  }

  // Strategy 3: Create new
  const newUid = generateRobotUid()

  const newRecord: RobotRecord = {
    uid: newUid,
    key,
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
    matchedVia: 'created'
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
