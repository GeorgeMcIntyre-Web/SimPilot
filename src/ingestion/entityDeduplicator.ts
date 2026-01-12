// Entity Deduplicator
// Addresses DATA_INTEGRITY_ISSUES.md - Issue #6: Deduplication

import { Project, Area, Cell, Robot, Tool } from '../domain/core'
import { log } from '../lib/log'

/**
 * Duplicate detection result
 */
export interface DuplicateDetection<T> {
  existing: T
  incoming: T
  conflictType: 'exact' | 'id_collision' | 'semantic'
}

/**
 * Deduplication result
 */
export interface DeduplicationResult<T> {
  deduplicated: T[]
  duplicates: DuplicateDetection<T>[]
  stats: {
    incoming: number
    deduplicated: number
    exactDuplicates: number
    idCollisions: number
  }
}

/**
 * Check if two objects are deeply equal
 */
function isDeepEqual(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

/**
 * Deduplicate entities based on ID
 * Strategy: Keep first occurrence, detect conflicts
 */
export function deduplicateById<T extends { id: string }>(
  existing: T[],
  incoming: T[]
): DeduplicationResult<T> {
  const duplicates: DuplicateDetection<T>[] = []
  const idMap = new Map<string, T>()

  // Add existing entities to map
  for (const entity of existing) {
    idMap.set(entity.id, entity)
  }

  // Process incoming entities
  const deduplicated: T[] = []

  for (const incomingEntity of incoming) {
    const existingEntity = idMap.get(incomingEntity.id)

    if (!existingEntity) {
      // New entity, add it
      deduplicated.push(incomingEntity)
      idMap.set(incomingEntity.id, incomingEntity)
    } else {
      // Duplicate detected
      if (isDeepEqual(existingEntity, incomingEntity)) {
        // Exact duplicate, skip
        duplicates.push({
          existing: existingEntity,
          incoming: incomingEntity,
          conflictType: 'exact'
        })
      } else {
        // ID collision with different data
        duplicates.push({
          existing: existingEntity,
          incoming: incomingEntity,
          conflictType: 'id_collision'
        })
        // Keep existing by default (KEEP_FIRST strategy)
      }
    }
  }

  return {
    deduplicated: [...existing, ...deduplicated],
    duplicates,
    stats: {
      incoming: incoming.length,
      deduplicated: deduplicated.length,
      exactDuplicates: duplicates.filter(d => d.conflictType === 'exact').length,
      idCollisions: duplicates.filter(d => d.conflictType === 'id_collision').length
    }
  }
}

/**
 * Deduplicate projects by customer + name
 */
export function deduplicateProjects(
  existing: Project[],
  incoming: Project[]
): DeduplicationResult<Project> {
  const duplicates: DuplicateDetection<Project>[] = []
  const keyMap = new Map<string, Project>()

  // Add existing projects
  for (const project of existing) {
    const key = `${project.customer}:${project.name}`
    keyMap.set(key, project)
  }

  const deduplicated: Project[] = []

  for (const incomingProject of incoming) {
    const key = `${incomingProject.customer}:${incomingProject.name}`
    const existingProject = keyMap.get(key)

    if (!existingProject) {
      deduplicated.push(incomingProject)
      keyMap.set(key, incomingProject)
    } else {
      // Check if IDs match
      if (existingProject.id === incomingProject.id) {
        // Same ID and same key - exact duplicate
        duplicates.push({
          existing: existingProject,
          incoming: incomingProject,
          conflictType: 'exact'
        })
      } else {
        // Different IDs but same name - semantic duplicate
        duplicates.push({
          existing: existingProject,
          incoming: incomingProject,
          conflictType: 'semantic'
        })
      }
    }
  }

  return {
    deduplicated: [...existing, ...deduplicated],
    duplicates,
    stats: {
      incoming: incoming.length,
      deduplicated: deduplicated.length,
      exactDuplicates: duplicates.filter(d => d.conflictType === 'exact').length,
      idCollisions: duplicates.filter(d => d.conflictType === 'id_collision').length
    }
  }
}

/**
 * Deduplicate areas by ID (deterministic ID generation should prevent most duplicates)
 */
export function deduplicateAreas(
  existing: Area[],
  incoming: Area[]
): DeduplicationResult<Area> {
  return deduplicateById(existing, incoming)
}

/**
 * Deduplicate cells by ID
 */
export function deduplicateCells(
  existing: Cell[],
  incoming: Cell[]
): DeduplicationResult<Cell> {
  return deduplicateById(existing, incoming)
}

/**
 * Deduplicate robots by ID
 */
export function deduplicateRobots(
  existing: Robot[],
  incoming: Robot[]
): DeduplicationResult<Robot> {
  return deduplicateById(existing, incoming)
}

/**
 * Deduplicate tools by ID
 */
export function deduplicateTools(
  existing: Tool[],
  incoming: Tool[]
): DeduplicationResult<Tool> {
  return deduplicateById(existing, incoming)
}

/**
 * Deduplicate all entities in a dataset
 */
export function deduplicateAll(
  existing: {
    projects: Project[]
    areas: Area[]
    cells: Cell[]
    robots: Robot[]
    tools: Tool[]
  },
  incoming: {
    projects: Project[]
    areas: Area[]
    cells: Cell[]
    robots: Robot[]
    tools: Tool[]
  }
): {
  projects: DeduplicationResult<Project>
  areas: DeduplicationResult<Area>
  cells: DeduplicationResult<Cell>
  robots: DeduplicationResult<Robot>
  tools: DeduplicationResult<Tool>
} {
  return {
    projects: deduplicateProjects(existing.projects, incoming.projects),
    areas: deduplicateAreas(existing.areas, incoming.areas),
    cells: deduplicateCells(existing.cells, incoming.cells),
    robots: deduplicateRobots(existing.robots, incoming.robots),
    tools: deduplicateTools(existing.tools, incoming.tools)
  }
}

/**
 * Log deduplication statistics
 */
export function logDeduplicationStats(results: {
  projects: DeduplicationResult<Project>
  areas: DeduplicationResult<Area>
  cells: DeduplicationResult<Cell>
  robots: DeduplicationResult<Robot>
  tools: DeduplicationResult<Tool>
}): void {
  log.debug('[Deduplication] Statistics:')

  const logEntityStats = (name: string, result: DeduplicationResult<any>) => {
    if (result.stats.exactDuplicates > 0 || result.stats.idCollisions > 0) {
      log.debug(`  ${name}:`)
      log.debug(`    - Incoming: ${result.stats.incoming}`)
      log.debug(`    - Added: ${result.stats.deduplicated}`)
      log.debug(`    - Exact duplicates skipped: ${result.stats.exactDuplicates}`)
      log.debug(`    - ID collisions detected: ${result.stats.idCollisions}`)
    }
  }

  logEntityStats('Projects', results.projects)
  logEntityStats('Areas', results.areas)
  logEntityStats('Cells', results.cells)
  logEntityStats('Robots', results.robots)
  logEntityStats('Tools', results.tools)
}
