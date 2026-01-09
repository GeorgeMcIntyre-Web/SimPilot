// Diff Engine
// Computes CRUD deltas + rename/move detection for imports

import {
  StationRecord,
  ToolRecord,
  DiffResult,
  DiffCreate,
  DiffUpdate,
  DiffDelete,
  DiffRenameOrMove,
  DiffAmbiguous,
  ImportSourceType
} from '../domain/uidTypes'

// ============================================================================
// STATION DIFF
// ============================================================================

/**
 * Compute diff for station records
 * Detects creates, updates, deletes, and potential renames
 */
export function diffStationRecords(
  prevRecords: StationRecord[],
  newRecords: StationRecord[]
): {
  creates: DiffCreate[]
  updates: DiffUpdate[]
  deletes: DiffDelete[]
  renamesOrMoves: DiffRenameOrMove[]
} {
  const creates: DiffCreate[] = []
  const updates: DiffUpdate[] = []
  const deletes: DiffDelete[] = []
  const renamesOrMoves: DiffRenameOrMove[] = []

  // Build lookup maps
  const prevByUid = new Map(prevRecords.map(r => [r.uid, r]))
  const newByUid = new Map(newRecords.map(r => [r.uid, r]))

  // Detect creates and updates
  for (const newRecord of newRecords) {
    const prevRecord = prevByUid.get(newRecord.uid)

    if (!prevRecord) {
      // New UID -> create
      creates.push({
        key: newRecord.key,
        plantKey: newRecord.plantKey,
        entityType: 'station',
        attributes: newRecord.attributes,
        suggestedName: newRecord.labels.fullLabel || newRecord.key
      })
      continue
    }

    // Same UID exists -> check for updates
    if (prevRecord.key !== newRecord.key) {
      // Key changed -> rename/move
      renamesOrMoves.push({
        oldKey: prevRecord.key,
        newKey: newRecord.key,
        plantKey: newRecord.plantKey,
        entityType: 'station',
        uid: newRecord.uid,
        confidence: 100, // Same UID = 100% confidence
        matchReasons: ['Same UID'],
        requiresUserDecision: false
      })
    }

    // Check attribute changes
    const changedFields = detectChangedFields(prevRecord.attributes, newRecord.attributes)
    if (changedFields.length > 0) {
      updates.push({
        uid: newRecord.uid,
        key: newRecord.key,
        plantKey: newRecord.plantKey,
        entityType: 'station',
        oldAttributes: prevRecord.attributes,
        newAttributes: newRecord.attributes,
        changedFields
      })
    }
  }

  // Detect deletes
  for (const prevRecord of prevRecords) {
    if (!newByUid.has(prevRecord.uid)) {
      deletes.push({
        uid: prevRecord.uid,
        key: prevRecord.key,
        plantKey: prevRecord.plantKey,
        entityType: 'station',
        lastSeen: prevRecord.updatedAt
      })
    }
  }

  return { creates, updates, deletes, renamesOrMoves }
}

// ============================================================================
// TOOL DIFF
// ============================================================================

/**
 * Compute diff for tool records
 * Same logic as station diff
 */
export function diffToolRecords(
  prevRecords: ToolRecord[],
  newRecords: ToolRecord[]
): {
  creates: DiffCreate[]
  updates: DiffUpdate[]
  deletes: DiffDelete[]
  renamesOrMoves: DiffRenameOrMove[]
} {
  const creates: DiffCreate[] = []
  const updates: DiffUpdate[] = []
  const deletes: DiffDelete[] = []
  const renamesOrMoves: DiffRenameOrMove[] = []

  const prevByUid = new Map(prevRecords.map(r => [r.uid, r]))
  const newByUid = new Map(newRecords.map(r => [r.uid, r]))

  // Detect creates and updates
  for (const newRecord of newRecords) {
    const prevRecord = prevByUid.get(newRecord.uid)

    if (!prevRecord) {
      creates.push({
        key: newRecord.key,
        plantKey: newRecord.plantKey,
        entityType: 'tool',
        attributes: newRecord.attributes,
        suggestedName: newRecord.labels.toolName || newRecord.labels.toolCode || newRecord.key
      })
      continue
    }

    // Check key changes
    if (prevRecord.key !== newRecord.key) {
      renamesOrMoves.push({
        oldKey: prevRecord.key,
        newKey: newRecord.key,
        plantKey: newRecord.plantKey,
        entityType: 'tool',
        uid: newRecord.uid,
        confidence: 100,
        matchReasons: ['Same UID'],
        requiresUserDecision: false
      })
    }

    // Check attribute changes
    const changedFields = detectChangedFields(prevRecord.attributes, newRecord.attributes)
    if (changedFields.length > 0) {
      updates.push({
        uid: newRecord.uid,
        key: newRecord.key,
        plantKey: newRecord.plantKey,
        entityType: 'tool',
        oldAttributes: prevRecord.attributes,
        newAttributes: newRecord.attributes,
        changedFields
      })
    }
  }

  // Detect deletes
  for (const prevRecord of prevRecords) {
    if (!newByUid.has(prevRecord.uid)) {
      deletes.push({
        uid: prevRecord.uid,
        key: prevRecord.key,
        plantKey: prevRecord.plantKey,
        entityType: 'tool',
        lastSeen: prevRecord.updatedAt
      })
    }
  }

  return { creates, updates, deletes, renamesOrMoves }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Detect which fields changed between two attribute objects
 */
function detectChangedFields(
  oldAttrs: Record<string, any>,
  newAttrs: Record<string, any>
): string[] {
  const changed: string[] = []
  const allKeys = new Set([...Object.keys(oldAttrs), ...Object.keys(newAttrs)])

  for (const key of allKeys) {
    if (oldAttrs[key] !== newAttrs[key]) {
      changed.push(key)
    }
  }

  return changed
}

// ============================================================================
// COMBINED DIFF
// ============================================================================

/**
 * Compute complete diff result for an import
 */
export function computeImportDiff(
  importRunId: string,
  sourceFile: string,
  sourceType: ImportSourceType,
  prevStationRecords: StationRecord[],
  prevToolRecords: ToolRecord[],
  newStationRecords: StationRecord[],
  newToolRecords: ToolRecord[],
  ambiguous: DiffAmbiguous[] = []
): DiffResult {
  const stationDiff = diffStationRecords(prevStationRecords, newStationRecords)
  const toolDiff = diffToolRecords(prevToolRecords, newToolRecords)

  const creates = [...stationDiff.creates, ...toolDiff.creates]
  const updates = [...stationDiff.updates, ...toolDiff.updates]
  const deletes = [...stationDiff.deletes, ...toolDiff.deletes]
  const renamesOrMoves = [...stationDiff.renamesOrMoves, ...toolDiff.renamesOrMoves]

  return {
    importRunId,
    sourceFile,
    sourceType,
    plantKey: 'PLANT_UNKNOWN',
    computedAt: new Date().toISOString(),
    creates,
    updates,
    deletes,
    renamesOrMoves,
    ambiguous,
    summary: {
      totalRows: newStationRecords.length + newToolRecords.length,
      created: creates.length,
      updated: updates.length,
      deleted: deletes.length,
      renamed: renamesOrMoves.length,
      ambiguous: ambiguous.length,
      skipped: 0
    }
  }
}
