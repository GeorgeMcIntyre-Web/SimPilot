// Referential Integrity Validator
// Addresses DATA_INTEGRITY_ISSUES.md - Issue #4: Referential Integrity

import { Project, Area, Cell, Robot, Tool } from '../domain/core'

/**
 * Referential integrity error types
 */
export interface IntegrityError {
  entityType: 'Project' | 'Area' | 'Cell' | 'Robot' | 'Tool'
  entityId: string
  entityName?: string
  field: string
  referencedId: string
  message: string
}

/**
 * Result of referential integrity validation
 */
export interface IntegrityValidationResult {
  isValid: boolean
  errors: IntegrityError[]
  summary: {
    totalErrors: number
    danglingProjectRefs: number
    danglingAreaRefs: number
    danglingCellRefs: number
    orphanedAssets: number
  }
}

/**
 * Validate referential integrity of ingested data
 * Checks that all foreign key references point to existing entities
 */
export function validateReferentialIntegrity(data: {
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  robots: Robot[]
  tools: Tool[]
}): IntegrityValidationResult {
  const errors: IntegrityError[] = []

  // Create lookup sets for fast existence checks
  const projectIds = new Set(data.projects.map(p => p.id))
  const areaIds = new Set(data.areas.map(a => a.id))
  const cellIds = new Set(data.cells.map(c => c.id))

  // Validate Area.projectId references
  for (const area of data.areas) {
    if (area.projectId && !projectIds.has(area.projectId)) {
      errors.push({
        entityType: 'Area',
        entityId: area.id,
        entityName: area.name,
        field: 'projectId',
        referencedId: area.projectId,
        message: `Area "${area.name}" (${area.id}) references non-existent project: ${area.projectId}`
      })
    }
  }

  // Validate Cell.projectId references
  for (const cell of data.cells) {
    if (cell.projectId && !projectIds.has(cell.projectId)) {
      errors.push({
        entityType: 'Cell',
        entityId: cell.id,
        entityName: cell.name,
        field: 'projectId',
        referencedId: cell.projectId,
        message: `Cell "${cell.name}" (${cell.id}) references non-existent project: ${cell.projectId}`
      })
    }
  }

  // Validate Cell.areaId references
  for (const cell of data.cells) {
    if (cell.areaId && !areaIds.has(cell.areaId)) {
      errors.push({
        entityType: 'Cell',
        entityId: cell.id,
        entityName: cell.name,
        field: 'areaId',
        referencedId: cell.areaId,
        message: `Cell "${cell.name}" (${cell.id}) references non-existent area: ${cell.areaId}`
      })
    }
  }

  // Validate Robot.cellId references (optional field)
  for (const robot of data.robots) {
    if (robot.cellId && !cellIds.has(robot.cellId)) {
      errors.push({
        entityType: 'Robot',
        entityId: robot.id,
        entityName: robot.name,
        field: 'cellId',
        referencedId: robot.cellId,
        message: `Robot "${robot.name}" (${robot.id}) references non-existent cell: ${robot.cellId}`
      })
    }
  }

  // Validate Tool.cellId references (optional field)
  for (const tool of data.tools) {
    if (tool.cellId && !cellIds.has(tool.cellId)) {
      errors.push({
        entityType: 'Tool',
        entityId: tool.id,
        entityName: tool.name,
        field: 'cellId',
        referencedId: tool.cellId,
        message: `Tool "${tool.name}" (${tool.id}) references non-existent cell: ${tool.cellId}`
      })
    }
  }

  // Count orphaned assets (no cellId)
  const orphanedRobots = data.robots.filter(r => !r.cellId)
  const orphanedTools = data.tools.filter(t => !t.cellId)

  // Generate summary
  const summary = {
    totalErrors: errors.length,
    danglingProjectRefs: errors.filter(e => e.field === 'projectId').length,
    danglingAreaRefs: errors.filter(e => e.field === 'areaId').length,
    danglingCellRefs: errors.filter(e => e.field === 'cellId').length,
    orphanedAssets: orphanedRobots.length + orphanedTools.length
  }

  return {
    isValid: errors.length === 0,
    errors,
    summary
  }
}

/**
 * Find orphaned assets (assets with no cell linkage)
 */
export function findOrphanedAssets(data: {
  robots: Robot[]
  tools: Tool[]
}): { robots: Robot[]; tools: Tool[] } {
  return {
    robots: data.robots.filter(r => !r.cellId),
    tools: data.tools.filter(t => !t.cellId)
  }
}

/**
 * Validate that all required fields are present
 */
export function validateRequiredFields(data: {
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  robots: Robot[]
  tools: Tool[]
}): IntegrityError[] {
  const errors: IntegrityError[] = []

  // Validate Project required fields
  for (const project of data.projects) {
    if (!project.id || project.id.trim() === '') {
      errors.push({
        entityType: 'Project',
        entityId: project.id || 'unknown',
        entityName: project.name,
        field: 'id',
        referencedId: '',
        message: `Project "${project.name}" has empty or missing ID`
      })
    }
    if (!project.name || project.name.trim() === '') {
      errors.push({
        entityType: 'Project',
        entityId: project.id,
        field: 'name',
        referencedId: '',
        message: `Project ${project.id} has empty or missing name`
      })
    }
  }

  // Validate Area required fields
  for (const area of data.areas) {
    if (!area.id || area.id.trim() === '') {
      errors.push({
        entityType: 'Area',
        entityId: area.id || 'unknown',
        entityName: area.name,
        field: 'id',
        referencedId: '',
        message: `Area "${area.name}" has empty or missing ID`
      })
    }
    if (!area.name || area.name.trim() === '') {
      errors.push({
        entityType: 'Area',
        entityId: area.id,
        field: 'name',
        referencedId: '',
        message: `Area ${area.id} has empty or missing name`
      })
    }
  }

  // Validate Cell required fields
  for (const cell of data.cells) {
    if (!cell.id || cell.id.trim() === '') {
      errors.push({
        entityType: 'Cell',
        entityId: cell.id || 'unknown',
        entityName: cell.name,
        field: 'id',
        referencedId: '',
        message: `Cell "${cell.name}" has empty or missing ID`
      })
    }
  }

  return errors
}

/**
 * Log integrity errors to console for debugging
 */
export function logIntegrityErrors(result: IntegrityValidationResult): void {
  if (result.isValid) {
    console.log('[Integrity] ✓ All referential integrity checks passed')
    return
  }

  console.error('[Integrity] ✗ Referential integrity violations found:')
  console.error('[Integrity] Summary:', result.summary)

  // Group errors by type
  const byType = new Map<string, IntegrityError[]>()
  for (const error of result.errors) {
    const key = `${error.entityType}.${error.field}`
    if (!byType.has(key)) {
      byType.set(key, [])
    }
    byType.get(key)!.push(error)
  }

  // Log grouped errors
  for (const [key, errors] of byType.entries()) {
    console.error(`[Integrity] ${key}: ${errors.length} violations`)
    for (const error of errors.slice(0, 5)) { // Show first 5
      console.error(`  - ${error.message}`)
    }
    if (errors.length > 5) {
      console.error(`  ... and ${errors.length - 5} more`)
    }
  }
}
