// Snapshot Diff Engine
// Computes Git-style diffs between two DailySnapshots
// Uses guard-clause, flat architecture

import {
  DailySnapshot,
  SnapshotDiff,
  CellDelta,
  MetricDelta,
  DiffSummary
} from './snapshotTypes'
import {
  CellSnapshot,
  CrossRefFlag,
  StationKey
} from '../crossRef/CrossRefTypes'

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Build a diff between two snapshots (old → new)
 * 
 * This gives Dale a daily changelog:
 * - "OP_020: −8 hours remaining (Weld gun collision check + gripper approval completed)"
 * - "OP_050: Owner changed from Werner to Dale."
 */
export const buildSnapshotDiff = (
  oldSnapshot: DailySnapshot,
  newSnapshot: DailySnapshot
): SnapshotDiff => {
  const oldCellsByStation = buildCellMap(oldSnapshot.cells)
  const newCellsByStation = buildCellMap(newSnapshot.cells)
  
  const allStationKeys = getUnionOfKeys(oldCellsByStation, newCellsByStation)
  
  const cellDeltas: CellDelta[] = []
  
  for (const stationKey of allStationKeys) {
    const oldCell = oldCellsByStation.get(stationKey)
    const newCell = newCellsByStation.get(stationKey)
    
    const delta = computeCellDelta(stationKey, oldCell, newCell)
    if (!delta) continue
    
    cellDeltas.push(delta)
  }
  
  const summary = computeDiffSummary(cellDeltas, oldSnapshot, newSnapshot)
  
  return {
    fromId: oldSnapshot.id,
    toId: newSnapshot.id,
    fromCapturedAt: oldSnapshot.capturedAt,
    toCapturedAt: newSnapshot.capturedAt,
    cells: cellDeltas,
    summary
  }
}

// ============================================================================
// CELL MAP BUILDING
// ============================================================================

/**
 * Build a Map of stationKey → CellSnapshot for fast lookup
 */
const buildCellMap = (cells: CellSnapshot[]): Map<StationKey, CellSnapshot> => {
  const map = new Map<StationKey, CellSnapshot>()
  
  for (const cell of cells) {
    if (!cell.stationKey) continue
    map.set(cell.stationKey, cell)
  }
  
  return map
}

/**
 * Get the union of keys from both maps
 */
const getUnionOfKeys = (
  oldMap: Map<StationKey, CellSnapshot>,
  newMap: Map<StationKey, CellSnapshot>
): StationKey[] => {
  const allKeys = new Set<StationKey>()
  
  for (const key of oldMap.keys()) {
    allKeys.add(key)
  }
  
  for (const key of newMap.keys()) {
    allKeys.add(key)
  }
  
  return Array.from(allKeys).sort()
}

// ============================================================================
// CELL DELTA COMPUTATION
// ============================================================================

/**
 * Compute the delta for a single station
 * Returns null if no meaningful changes
 */
const computeCellDelta = (
  stationKey: StationKey,
  oldCell: CellSnapshot | undefined,
  newCell: CellSnapshot | undefined
): CellDelta | null => {
  // Case 1: Station added (only in new)
  if (!oldCell && newCell) {
    return {
      stationKey,
      areaKey: newCell.areaKey,
      added: true,
      removed: false,
      metricDeltas: [],
      flagsAdded: newCell.flags || [],
      flagsRemoved: [],
      assetChanges: {
        robotsDelta: newCell.robots.length,
        toolsDelta: newCell.tools.length,
        weldGunsDelta: newCell.weldGuns.length,
        risersDelta: newCell.risers.length
      }
    }
  }
  
  // Case 2: Station removed (only in old)
  if (oldCell && !newCell) {
    return {
      stationKey,
      areaKey: oldCell.areaKey,
      added: false,
      removed: true,
      metricDeltas: [],
      flagsAdded: [],
      flagsRemoved: oldCell.flags || [],
      assetChanges: {
        robotsDelta: -oldCell.robots.length,
        toolsDelta: -oldCell.tools.length,
        weldGunsDelta: -oldCell.weldGuns.length,
        risersDelta: -oldCell.risers.length
      }
    }
  }
  
  // Case 3: Both exist - compare them
  if (!oldCell || !newCell) return null
  
  const metricDeltas = computeMetricDeltas(oldCell, newCell)
  const ownerChange = computeOwnerChange(oldCell, newCell)
  const completionChange = computeCompletionChange(oldCell, newCell)
  const { flagsAdded, flagsRemoved } = computeFlagChanges(oldCell, newCell)
  const assetChanges = computeAssetChanges(oldCell, newCell)
  
  // Skip if nothing changed
  const hasChanges =
    metricDeltas.length > 0 ||
    ownerChange !== undefined ||
    completionChange !== undefined ||
    flagsAdded.length > 0 ||
    flagsRemoved.length > 0 ||
    hasAssetChanges(assetChanges)
  
  if (!hasChanges) return null
  
  return {
    stationKey,
    areaKey: newCell.areaKey,
    added: false,
    removed: false,
    metricDeltas,
    ownerChange,
    completionChange,
    flagsAdded,
    flagsRemoved,
    assetChanges
  }
}

// ============================================================================
// METRIC DELTA COMPUTATION
// ============================================================================

/**
 * Compare metrics between old and new cell
 */
const computeMetricDeltas = (
  oldCell: CellSnapshot,
  newCell: CellSnapshot
): MetricDelta[] => {
  const deltas: MetricDelta[] = []
  
  const oldMetrics = oldCell.simulationStatus?.raw as Record<string, unknown> | undefined
  const newMetrics = newCell.simulationStatus?.raw as Record<string, unknown> | undefined
  
  if (!oldMetrics && !newMetrics) return deltas
  
  // Get all metric keys
  const allKeys = new Set<string>()
  if (oldMetrics) {
    for (const key of Object.keys(oldMetrics)) {
      if (isMetricKey(key)) allKeys.add(key)
    }
  }
  if (newMetrics) {
    for (const key of Object.keys(newMetrics)) {
      if (isMetricKey(key)) allKeys.add(key)
    }
  }
  
  for (const metricKey of allKeys) {
    const oldValue = extractPercentValue(oldMetrics?.[metricKey])
    const newValue = extractPercentValue(newMetrics?.[metricKey])
    
    // Skip if no change
    if (oldValue === newValue) continue
    if (oldValue === null && newValue === null) continue
    
    deltas.push({
      metricLabel: metricKey,
      fromPercent: oldValue,
      toPercent: newValue
    })
  }
  
  return deltas
}

/**
 * Check if a key looks like a metric (contains stage, completion, etc.)
 */
const isMetricKey = (key: string): boolean => {
  const lower = key.toLowerCase()
  return (
    lower.includes('stage') ||
    lower.includes('completion') ||
    lower.includes('configured') ||
    lower.includes('confirmed') ||
    lower.includes('check') ||
    lower.includes('percent') ||
    lower.includes('%')
  )
}

/**
 * Extract a percentage value from various formats
 */
const extractPercentValue = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  
  const str = String(value).trim()
  if (str === '' || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a') {
    return null
  }
  
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

// ============================================================================
// OWNER CHANGE COMPUTATION
// ============================================================================

/**
 * Detect change in owner (simLeader / teamLeader)
 */
const computeOwnerChange = (
  oldCell: CellSnapshot,
  newCell: CellSnapshot
): { from: string | null; to: string | null } | undefined => {
  const oldOwner = getOwnerFromCell(oldCell)
  const newOwner = getOwnerFromCell(newCell)
  
  if (oldOwner === newOwner) return undefined
  
  return {
    from: oldOwner,
    to: newOwner
  }
}

/**
 * Get owner from cell (check tools for simLeader/teamLeader)
 */
const getOwnerFromCell = (cell: CellSnapshot): string | null => {
  // Check simulation status first
  if (cell.simulationStatus?.engineer) {
    return cell.simulationStatus.engineer
  }
  
  // Check tools for owner
  for (const tool of cell.tools) {
    if (tool.simLeader) return tool.simLeader
    if (tool.teamLeader) return tool.teamLeader
  }
  
  return null
}

// ============================================================================
// COMPLETION CHANGE COMPUTATION
// ============================================================================

/**
 * Compute changes in completion percentages
 */
const computeCompletionChange = (
  oldCell: CellSnapshot,
  newCell: CellSnapshot
): CellDelta['completionChange'] | undefined => {
  const oldFirstStage = oldCell.simulationStatus?.firstStageCompletion ?? null
  const newFirstStage = newCell.simulationStatus?.firstStageCompletion ?? null
  const oldFinalDeliverables = oldCell.simulationStatus?.finalDeliverablesCompletion ?? null
  const newFinalDeliverables = newCell.simulationStatus?.finalDeliverablesCompletion ?? null
  
  const hasChange =
    oldFirstStage !== newFirstStage ||
    oldFinalDeliverables !== newFinalDeliverables
  
  if (!hasChange) return undefined
  
  return {
    fromFirstStage: oldFirstStage,
    toFirstStage: newFirstStage,
    fromFinalDeliverables: oldFinalDeliverables,
    toFinalDeliverables: newFinalDeliverables
  }
}

// ============================================================================
// FLAG CHANGE COMPUTATION
// ============================================================================

/**
 * Compute which flags were added/removed
 */
const computeFlagChanges = (
  oldCell: CellSnapshot,
  newCell: CellSnapshot
): { flagsAdded: CrossRefFlag[]; flagsRemoved: CrossRefFlag[] } => {
  const oldFlags = oldCell.flags || []
  const newFlags = newCell.flags || []
  
  // Build sets of flag identifiers
  const oldFlagIds = new Set(oldFlags.map(flagId))
  const newFlagIds = new Set(newFlags.map(flagId))
  
  const flagsAdded = newFlags.filter(f => !oldFlagIds.has(flagId(f)))
  const flagsRemoved = oldFlags.filter(f => !newFlagIds.has(flagId(f)))
  
  return { flagsAdded, flagsRemoved }
}

/**
 * Create a unique identifier for a flag
 */
const flagId = (flag: CrossRefFlag): string => {
  return `${flag.type}:${flag.stationKey || ''}:${flag.robotKey || ''}:${flag.gunKey || ''}`
}

// ============================================================================
// ASSET CHANGE COMPUTATION
// ============================================================================

/**
 * Compute changes in asset counts
 */
const computeAssetChanges = (
  oldCell: CellSnapshot,
  newCell: CellSnapshot
): CellDelta['assetChanges'] => {
  return {
    robotsDelta: newCell.robots.length - oldCell.robots.length,
    toolsDelta: newCell.tools.length - oldCell.tools.length,
    weldGunsDelta: newCell.weldGuns.length - oldCell.weldGuns.length,
    risersDelta: newCell.risers.length - oldCell.risers.length
  }
}

/**
 * Check if any asset counts changed
 */
const hasAssetChanges = (changes: CellDelta['assetChanges']): boolean => {
  if (!changes) return false
  return (
    changes.robotsDelta !== 0 ||
    changes.toolsDelta !== 0 ||
    changes.weldGunsDelta !== 0 ||
    changes.risersDelta !== 0
  )
}

// ============================================================================
// DIFF SUMMARY COMPUTATION
// ============================================================================

/**
 * Compute summary statistics for the diff
 */
const computeDiffSummary = (
  cellDeltas: CellDelta[],
  oldSnapshot: DailySnapshot,
  newSnapshot: DailySnapshot
): DiffSummary => {
  let cellsAdded = 0
  let cellsRemoved = 0
  let cellsModified = 0
  let metricsImproved = 0
  let metricsRegressed = 0
  let newFlagsCount = 0
  let resolvedFlagsCount = 0
  
  for (const delta of cellDeltas) {
    if (delta.added) {
      cellsAdded++
      continue
    }
    
    if (delta.removed) {
      cellsRemoved++
      continue
    }
    
    cellsModified++
    
    // Count metric improvements/regressions
    for (const metricDelta of delta.metricDeltas) {
      if (metricDelta.fromPercent === null || metricDelta.toPercent === null) {
        continue
      }
      
      if (metricDelta.toPercent > metricDelta.fromPercent) {
        metricsImproved++
      } else if (metricDelta.toPercent < metricDelta.fromPercent) {
        metricsRegressed++
      }
    }
    
    newFlagsCount += delta.flagsAdded.length
    resolvedFlagsCount += delta.flagsRemoved.length
  }
  
  // Calculate unchanged cells
  const totalOldCells = oldSnapshot.stats.totalCells
  const cellsUnchanged = totalOldCells - cellsRemoved - cellsModified
  
  // Calculate avg completion delta
  const oldAvg = oldSnapshot.stats.avgCompletion
  const newAvg = newSnapshot.stats.avgCompletion
  const avgCompletionDelta =
    oldAvg !== undefined && newAvg !== undefined ? newAvg - oldAvg : undefined
  
  return {
    cellsAdded,
    cellsRemoved,
    cellsModified,
    cellsUnchanged: Math.max(0, cellsUnchanged),
    metricsImproved,
    metricsRegressed,
    avgCompletionDelta,
    newFlagsCount,
    resolvedFlagsCount
  }
}

// ============================================================================
// HUMAN-READABLE DESCRIPTIONS
// ============================================================================

/**
 * Generate a human-readable description of a cell delta
 * For Dale's changelog display
 */
export const describeCellDelta = (delta: CellDelta): string[] => {
  const descriptions: string[] = []
  
  if (delta.added) {
    descriptions.push(`Station ${delta.stationKey} added`)
    return descriptions
  }
  
  if (delta.removed) {
    descriptions.push(`Station ${delta.stationKey} removed`)
    return descriptions
  }
  
  // Owner change
  if (delta.ownerChange) {
    const from = delta.ownerChange.from || 'Unassigned'
    const to = delta.ownerChange.to || 'Unassigned'
    descriptions.push(`Owner changed from ${from} to ${to}`)
  }
  
  // Completion changes
  if (delta.completionChange) {
    const { fromFirstStage, toFirstStage } = delta.completionChange
    if (fromFirstStage !== null && toFirstStage !== null) {
      const diff = toFirstStage - fromFirstStage
      if (diff > 0) {
        descriptions.push(`First stage: +${diff}% (${fromFirstStage}% → ${toFirstStage}%)`)
      } else if (diff < 0) {
        descriptions.push(`First stage: ${diff}% (${fromFirstStage}% → ${toFirstStage}%)`)
      }
    }
  }
  
  // Metric changes (group improvements)
  const improvements = delta.metricDeltas.filter(
    m => m.fromPercent !== null && m.toPercent !== null && m.toPercent > m.fromPercent
  )
  
  if (improvements.length > 0) {
    const labels = improvements.map(m => m.metricLabel).join(', ')
    descriptions.push(`Completed: ${labels}`)
  }
  
  // Flag changes
  if (delta.flagsAdded.length > 0) {
    descriptions.push(`${delta.flagsAdded.length} new warning(s) detected`)
  }
  
  if (delta.flagsRemoved.length > 0) {
    descriptions.push(`${delta.flagsRemoved.length} warning(s) resolved`)
  }
  
  return descriptions
}

/**
 * Generate a summary description for a diff
 */
export const describeDiffSummary = (summary: DiffSummary): string => {
  const parts: string[] = []
  
  if (summary.cellsAdded > 0) {
    parts.push(`+${summary.cellsAdded} station${summary.cellsAdded === 1 ? '' : 's'}`)
  }
  
  if (summary.cellsRemoved > 0) {
    parts.push(`−${summary.cellsRemoved} station${summary.cellsRemoved === 1 ? '' : 's'}`)
  }
  
  if (summary.cellsModified > 0) {
    parts.push(`${summary.cellsModified} modified`)
  }
  
  if (summary.avgCompletionDelta !== undefined && summary.avgCompletionDelta !== 0) {
    const sign = summary.avgCompletionDelta > 0 ? '+' : ''
    parts.push(`${sign}${summary.avgCompletionDelta.toFixed(1)}% avg completion`)
  }
  
  if (summary.resolvedFlagsCount > 0) {
    parts.push(`${summary.resolvedFlagsCount} issues resolved`)
  }
  
  if (summary.newFlagsCount > 0) {
    parts.push(`${summary.newFlagsCount} new issues`)
  }
  
  return parts.length > 0 ? parts.join(' · ') : 'No changes'
}
