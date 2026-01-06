// Version Comparison & Conflict Detection
// Compares incoming data with existing data to detect changes

import { Project, Area, Cell, UnifiedAsset } from '../domain/core'
import { coreStore } from '../domain/coreStore'

// ============================================================================
// TYPES
// ============================================================================

export type ChangeType = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'UNCHANGED'

export interface EntityChange<T> {
  type: ChangeType
  entity: T
  oldEntity?: T  // For MODIFIED or REMOVED
  conflicts?: FieldConflict[]
}

export interface FieldConflict {
  field: string
  oldValue: any
  newValue: any
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface VersionComparisonResult {
  projects: EntityChange<Project>[]
  areas: EntityChange<Area>[]
  cells: EntityChange<Cell>[]
  robots: EntityChange<UnifiedAsset>[]
  tools: EntityChange<UnifiedAsset>[]

  summary: {
    totalChanges: number
    added: number
    modified: number
    removed: number
    conflicts: number
  }
}

// ============================================================================
// FIELD IMPORTANCE (for conflict severity)
// ============================================================================

const HIGH_IMPORTANCE_FIELDS = [
  'id',
  'name',
  'projectId',
  'areaId',
  'cellId',
  'stationNumber',
  'kind'
]

const MEDIUM_IMPORTANCE_FIELDS = [
  'status',
  'percentComplete',
  'assignedEngineer',
  'oemModel',
  'toolType'
]

// LOW importance = everything else

function getConflictSeverity(field: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (HIGH_IMPORTANCE_FIELDS.includes(field)) return 'HIGH'
  if (MEDIUM_IMPORTANCE_FIELDS.includes(field)) return 'MEDIUM'
  return 'LOW'
}

// ============================================================================
// COMPARISON LOGIC
// ============================================================================

/**
 * Compare two entities and detect field-level conflicts
 */
function compareEntities<T extends { id: string }>(
  oldEntity: T,
  newEntity: T,
  fieldsToCompare: (keyof T)[]
): FieldConflict[] {
  const conflicts: FieldConflict[] = []

  for (const field of fieldsToCompare) {
    const oldValue = oldEntity[field]
    const newValue = newEntity[field]

    // Skip if both are null/undefined
    if (oldValue == null && newValue == null) continue

    // Detect change
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      conflicts.push({
        field: String(field),
        oldValue,
        newValue,
        severity: getConflictSeverity(String(field))
      })
    }
  }

  return conflicts
}

/**
 * Compare a list of entities (old vs new) and categorize changes
 */
function compareEntityList<T extends { id: string }>(
  oldEntities: T[],
  newEntities: T[],
  fieldsToCompare: (keyof T)[]
): EntityChange<T>[] {
  const changes: EntityChange<T>[] = []

  // Build lookup maps
  const oldMap = new Map<string, T>()
  const newMap = new Map<string, T>()

  oldEntities.forEach(e => oldMap.set(e.id, e))
  newEntities.forEach(e => newMap.set(e.id, e))

  // Find ADDED and MODIFIED
  for (const newEntity of newEntities) {
    const oldEntity = oldMap.get(newEntity.id)

    if (!oldEntity) {
      // ADDED
      changes.push({
        type: 'ADDED',
        entity: newEntity
      })
    } else {
      // Check for MODIFIED
      const conflicts = compareEntities(oldEntity, newEntity, fieldsToCompare)

      if (conflicts.length > 0) {
        changes.push({
          type: 'MODIFIED',
          entity: newEntity,
          oldEntity,
          conflicts
        })
      } else {
        changes.push({
          type: 'UNCHANGED',
          entity: newEntity,
          oldEntity
        })
      }
    }
  }

  // Find REMOVED
  for (const oldEntity of oldEntities) {
    if (!newMap.has(oldEntity.id)) {
      changes.push({
        type: 'REMOVED',
        entity: oldEntity,
        oldEntity
      })
    }
  }

  return changes
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Compare incoming data with current store data
 *
 * @param newProjects - Incoming projects
 * @param newAreas - Incoming areas
 * @param newCells - Incoming cells
 * @param newAssets - Incoming assets (robots + tools)
 */
export function compareVersions(
  newProjects: Project[],
  newAreas: Area[],
  newCells: Cell[],
  newAssets: UnifiedAsset[]
): VersionComparisonResult {
  const currentState = coreStore.getState()

  // Separate robots and tools
  const currentRobots = currentState.assets.filter(a => a.kind === 'ROBOT')
  const currentTools = currentState.assets.filter(a => a.kind !== 'ROBOT')
  const newRobots = newAssets.filter(a => a.kind === 'ROBOT')
  const newTools = newAssets.filter(a => a.kind !== 'ROBOT')

  // Compare each entity type
  const projectChanges = compareEntityList(
    currentState.projects,
    newProjects,
    ['name', 'customer', 'status', 'manager', 'sopDate'] as (keyof Project)[]
  )

  const areaChanges = compareEntityList(
    currentState.areas,
    newAreas,
    ['name', 'code', 'projectId'] as (keyof Area)[]
  )

  const cellChanges = compareEntityList(
    currentState.cells,
    newCells,
    ['name', 'code', 'status', 'assignedEngineer', 'lineCode', 'areaId'] as (keyof Cell)[]
  )

  const robotChanges = compareEntityList(
    currentRobots,
    newRobots,
    ['name', 'kind', 'oemModel', 'areaName', 'stationNumber', 'sourcing'] as (keyof UnifiedAsset)[]
  )

  const toolChanges = compareEntityList(
    currentTools,
    newTools,
    ['name', 'kind', 'oemModel', 'areaName', 'stationNumber', 'sourcing', 'description'] as (keyof UnifiedAsset)[]
  )

  // Calculate summary
  const allChanges = [
    ...projectChanges,
    ...areaChanges,
    ...cellChanges,
    ...robotChanges,
    ...toolChanges
  ]

  const added = allChanges.filter(c => c.type === 'ADDED').length
  const modified = allChanges.filter(c => c.type === 'MODIFIED').length
  const removed = allChanges.filter(c => c.type === 'REMOVED').length
  const conflicts = allChanges.reduce((sum, c) => sum + (c.conflicts?.length || 0), 0)

  return {
    projects: projectChanges,
    areas: areaChanges,
    cells: cellChanges,
    robots: robotChanges,
    tools: toolChanges,
    summary: {
      totalChanges: added + modified + removed,
      added,
      modified,
      removed,
      conflicts
    }
  }
}

/**
 * Check if there are any significant changes that require user review
 */
export function hasSignificantChanges(comparison: VersionComparisonResult): boolean {
  const { summary } = comparison

  // Any high-severity conflicts require review
  const hasHighSeverityConflicts = [
    ...comparison.projects,
    ...comparison.areas,
    ...comparison.cells,
    ...comparison.robots,
    ...comparison.tools
  ].some(change =>
    change.conflicts?.some(c => c.severity === 'HIGH')
  )

  if (hasHighSeverityConflicts) return true

  // Many changes require review
  if (summary.totalChanges > 50) return true

  // Removals always require review
  if (summary.removed > 0) return true

  return false
}

/**
 * Get human-readable summary of changes
 */
export function getChangeSummary(comparison: VersionComparisonResult): string {
  const { summary } = comparison
  const lines: string[] = []

  lines.push(`📊 Version Comparison Summary`)
  lines.push(``)
  lines.push(`✅ Added: ${summary.added} entities`)
  lines.push(`📝 Modified: ${summary.modified} entities`)
  lines.push(`❌ Removed: ${summary.removed} entities`)
  lines.push(`⚠️  Conflicts: ${summary.conflicts} field changes`)
  lines.push(``)
  lines.push(`Total changes: ${summary.totalChanges}`)

  return lines.join('\n')
}
