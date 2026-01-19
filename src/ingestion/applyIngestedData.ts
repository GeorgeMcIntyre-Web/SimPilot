// Apply Ingested Data
// Merges parsed Excel data into domain stores with intelligent linking

import { Project, Area, Cell, Robot, Tool, IngestionWarning } from '../domain/core'
import { SimulationStatusResult } from './simulationStatusParser'
import { RobotListResult } from './robotListParser'
import { ToolListResult } from './toolListParser'
import { createLinkingMissingTargetWarning, createParserErrorWarning } from './warningUtils'
import { linkAssetsToSimulation } from './relationshipLinker'
import { buildStationId, normalizeAreaName, normalizeStationCode } from './normalizers'
import { log } from '../lib/log'
import { deduplicateAll, logDeduplicationStats, type DeduplicationResult, type DuplicateDetection } from './entityDeduplicator'
import { coreStore } from '../domain/coreStore'

// ============================================================================
// TYPES
// ============================================================================

export interface IngestedData {
  simulation?: SimulationStatusResult
  robots?: RobotListResult
  tools?: ToolListResult
}

export interface ApplyResult {
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  robots: Robot[]
  tools: Tool[]
  warnings: IngestionWarning[]
  linkStats?: {
    linkedCells: number
    totalCells: number
    orphanedAssets: number
  }
}

// ============================================================================
// HELPERS
// ============================================================================

type DedupResults = {
  projects: DeduplicationResult<Project>
  areas: DeduplicationResult<Area>
  cells: DeduplicationResult<Cell>
  robots: DeduplicationResult<Robot>
  tools: DeduplicationResult<Tool>
}

function describeEntity(entity: Project | Area | Cell | Robot | Tool): string {
  const id = entity.id
  const name = (entity as any).name ?? (entity as any).code ?? ''
  const station =
    (entity as any).stationNumber ?? (entity as any).stationCode ?? (entity as any).stationId ?? ''
  const withStation = station ? ` @${station}` : ''
  const cleanedName = name !== '' ? name : id

  return `${cleanedName}${withStation}`
}

function buildCollisionSummary(results: DedupResults): {
  messageSuffix: string
  details: Record<string, string | number | boolean>
} {
  const breakdown = {
    projects: results.projects.stats.idCollisions,
    areas: results.areas.stats.idCollisions,
    cells: results.cells.stats.idCollisions,
    robots: results.robots.stats.idCollisions,
    tools: results.tools.stats.idCollisions
  }

  const breakdownParts = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${key}=${count}`)

  const examples: string[] = []
  const addExamples = <T>(label: string, dupes: DuplicateDetection<T>[]) => {
    for (const dup of dupes) {
      if (examples.length >= 3) break
      if (dup.conflictType !== 'id_collision') continue
      const example = `${label}:${(dup.incoming as any).id} (existing=${describeEntity(dup.existing as any)}, incoming=${describeEntity(dup.incoming as any)})`
      examples.push(example)
    }
  }

  addExamples('project', results.projects.duplicates)
  addExamples('area', results.areas.duplicates)
  addExamples('cell', results.cells.duplicates)
  addExamples('robot', results.robots.duplicates)
  addExamples('tool', results.tools.duplicates)

  const messageSuffix =
    breakdownParts.length === 0 && examples.length === 0
      ? ''
      : ` Breakdown: ${breakdownParts.join(', ')}${examples.length ? `. Examples: ${examples.join(' | ')}` : ''}`

  return {
    messageSuffix,
    details: {
      projects: breakdown.projects,
      areas: breakdown.areas,
      cells: breakdown.cells,
      robots: breakdown.robots,
      tools: breakdown.tools,
      examples: examples.join(' | ') || 'n/a'
    }
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Apply ingested data from parsers, linking entities intelligently
 */
export function applyIngestedData(data: IngestedData): ApplyResult {
  const warnings: IngestionWarning[] = []

  // Collect all entities
  const projects: Project[] = []
  const areas: Area[] = []
  const cells: Cell[] = []
  const robots: Robot[] = []
  const tools: Tool[] = []

  // Add simulation data
  if (data.simulation) {
    projects.push(...data.simulation.projects)
    areas.push(...data.simulation.areas)
    cells.push(...data.simulation.cells)
    warnings.push(...data.simulation.warnings)
  }

  // Add robots
  if (data.robots) {
    robots.push(...data.robots.robots)
    warnings.push(...data.robots.warnings)
  }

  // Add tools (filter out inactive/cancelled tools)
  if (data.tools) {
    // Only add active tools (isActive !== false)
    // Inactive tools are cancelled/historical (strikethrough in Excel with "REMOVED FROM BOM" or "SIM TO SPEC")
    const activeTools = data.tools.tools.filter(tool => tool.isActive !== false)
    tools.push(...activeTools)
    warnings.push(...data.tools.warnings)
  }

  // Deduplicate against existing store data
  const currentState = coreStore.getState()
  const deduplicationResults = deduplicateAll(
    {
      projects: currentState.projects,
      areas: currentState.areas,
      cells: currentState.cells,
      robots: currentState.assets.filter(a => a.kind === 'ROBOT') as Robot[],
      tools: currentState.assets.filter(a => a.kind !== 'ROBOT') as Tool[]
    },
    {
      projects,
      areas,
      cells,
      robots,
      tools
    }
  )

  // Log deduplication statistics
  logDeduplicationStats(deduplicationResults)

  // Add warnings for ID collisions
  const totalCollisions =
    deduplicationResults.projects.stats.idCollisions +
    deduplicationResults.areas.stats.idCollisions +
    deduplicationResults.cells.stats.idCollisions +
    deduplicationResults.robots.stats.idCollisions +
    deduplicationResults.tools.stats.idCollisions

  if (totalCollisions > 0) {
    const collisionSummary = buildCollisionSummary(deduplicationResults)

    warnings.push({
      id: 'id-collisions',
      kind: 'PARSER_ERROR',
      fileName: '',
      message: `Detected ${totalCollisions} ID collisions (same ID, different data). Keeping existing data to prevent overwrites.${collisionSummary.messageSuffix}`,
      details: collisionSummary.details,
      createdAt: new Date().toISOString()
    })
  }

  // Use deduplicated entities
  projects.length = 0
  projects.push(...deduplicationResults.projects.deduplicated)
  areas.length = 0
  areas.push(...deduplicationResults.areas.deduplicated)
  cells.length = 0
  cells.push(...deduplicationResults.cells.deduplicated)
  robots.length = 0
  robots.push(...deduplicationResults.robots.deduplicated)
  tools.length = 0
  tools.push(...deduplicationResults.tools.deduplicated)

  // IMPORTANT: When new cells are loaded (e.g., from simulation status), we need to
  // re-link ALL existing equipment to the new cells. The deduplication above only
  // includes NEW entities, but existing equipment in the store may now have matching
  // cells that didn't exist before.
  const hasNewCells = data.simulation && data.simulation.cells.length > 0
  const existingRobots = currentState.assets.filter(a => a.kind === 'ROBOT') as Robot[]
  const existingTools = currentState.assets.filter(a => a.kind !== 'ROBOT') as Tool[]

  if (hasNewCells && (existingRobots.length > 0 || existingTools.length > 0)) {
    log.info(`[ApplyIngestedData] New cells detected - re-linking ${existingRobots.length} existing robots and ${existingTools.length} existing tools`)

    // Include existing equipment that wasn't in the current ingestion (not already in robots/tools arrays)
    const currentRobotIds = new Set(robots.map(r => r.id))
    const currentToolIds = new Set(tools.map(t => t.id))

    let addedRobots = 0
    let addedTools = 0

    for (const robot of existingRobots) {
      if (!currentRobotIds.has(robot.id)) {
        // Clone the robot so we can update its links without mutating the store
        robots.push({ ...robot })
        addedRobots++
      }
    }

    for (const tool of existingTools) {
      if (!currentToolIds.has(tool.id)) {
        // Clone the tool so we can update its links without mutating the store
        tools.push({ ...tool })
        addedTools++
      }
    }

    log.info(`[ApplyIngestedData] Added ${addedRobots} existing robots and ${addedTools} existing tools for re-linking`)
    log.debug(`[ApplyIngestedData] After merging: ${robots.length} robots, ${tools.length} tools, ${cells.length} cells`)
  }

  // Also handle the reverse case: when equipment is loaded and cells already exist in the store
  const hasNewEquipment = (data.robots && data.robots.robots.length > 0) || (data.tools && data.tools.tools.length > 0)
  const existingCells = currentState.cells

  if (hasNewEquipment && existingCells.length > 0 && cells.length === 0) {
    log.info(`[ApplyIngestedData] New equipment detected with ${existingCells.length} existing cells - including cells for linking`)

    // Include existing cells that weren't in the current ingestion
    for (const cell of existingCells) {
      cells.push({ ...cell })
    }

    // Also include existing areas and projects for proper linking
    for (const area of currentState.areas) {
      if (!areas.find(a => a.id === area.id)) {
        areas.push({ ...area })
      }
    }

    for (const project of currentState.projects) {
      if (!projects.find(p => p.id === project.id)) {
        projects.push({ ...project })
      }
    }

    log.debug(`[ApplyIngestedData] After including existing data: ${cells.length} cells, ${areas.length} areas, ${projects.length} projects`)
  }

  // Validate we have simulation data
  if (projects.length === 0) {
    warnings.push(createParserErrorWarning({
      fileName: '',
      error: 'No projects found. Please load Simulation Status files first.'
    }))
    return { projects, areas, cells, robots, tools, warnings }
  }

  // NEW: Link assets to simulation cells (relational engine)
  // This enriches cells with sourcing, OEM model, and metadata from asset files
  let linkStats: ApplyResult['linkStats'] = undefined
  if (cells.length > 0 && (robots.length > 0 || tools.length > 0)) {
    const allAssets = [...robots, ...tools]

    // Build area lookup map for efficient area name resolution
    const areaLookup = new Map<string, string>()
    for (const area of areas) {
      areaLookup.set(area.id, area.name)
    }

    const linkResult = linkAssetsToSimulation(cells, allAssets, areaLookup)

    // Replace cells with enriched versions
    cells.length = 0
    cells.push(...linkResult.linkedCells)

    // Add warnings from linker (ambiguous matches, etc.)
    warnings.push(...linkResult.warnings)

    log.info(`[Relational Linker] Linked ${linkResult.linkCount}/${linkResult.totalCells} cells to assets (${linkResult.stationCount} stations indexed, ${linkResult.ambiguousCount} ambiguous)`)

    // Track orphaned assets (those without cellId after linking)
    const orphanedAssets = allAssets.filter(a => !a.cellId)

    // Build linkStats for user feedback
    linkStats = {
      linkedCells: linkResult.linkCount,
      totalCells: linkResult.totalCells,
      orphanedAssets: orphanedAssets.length
    }

    if (orphanedAssets.length > 0) {
      const maxWarnings = 10
      const orphanedToReport = orphanedAssets.slice(0, maxWarnings)

      for (const asset of orphanedToReport) {
        warnings.push(createLinkingMissingTargetWarning({
          entityType: asset.kind === 'ROBOT' ? 'ROBOT' : 'TOOL',
          entityId: asset.id,
          entityName: asset.name,
          fileName: asset.sourceFile,
          matchKey: asset.stationId ?? asset.stationNumber ?? 'unknown',
          reason: 'No matching cell found - asset will appear in global assets but not in station views'
        }))
      }

      if (orphanedAssets.length > maxWarnings) {
        warnings.push({
          id: `orphaned-assets-summary-${Date.now()}`,
          kind: 'LINKING_MISSING_TARGET',
          fileName: '',
          message: `... and ${orphanedAssets.length - maxWarnings} more orphaned assets could not be linked to cells`,
          createdAt: new Date().toISOString()
        })
      }

      log.warn(`[Relational Linker] ${orphanedAssets.length} assets could not be linked to any cell`)
    }
  }

  // Link robots to cells and areas
  linkRobotsToCells(robots, cells, areas, projects, warnings)

  // Link tools to cells and areas
  linkToolsToCells(tools, cells, areas, projects, warnings)

  // Log linking results for debugging
  const linkedRobots = robots.filter(r => r.cellId)
  const linkedTools = tools.filter(t => t.cellId)
  log.info(`[ApplyIngestedData] Linking complete: ${linkedRobots.length}/${robots.length} robots linked, ${linkedTools.length}/${tools.length} tools linked`)

  // Update cell robot/tool counts
  updateCellEquipmentLinks(cells, robots, tools)

  return {
    projects,
    areas,
    cells,
    robots,
    tools,
    warnings,
    linkStats
  }
}

// ============================================================================
// LINKING FUNCTIONS
// ============================================================================

/**
 * Link robots to cells based on line code, station code, and area
 */
function linkRobotsToCells(
  robots: Robot[],
  cells: Cell[],
  areas: Area[],
  _projects: Project[],
  warnings: IngestionWarning[]
): void {
  for (const robot of robots) {
    // First try to match using stationId (most reliable)
    let matchingCell: Cell | undefined
    if (robot.stationId) {
      matchingCell = cells.find(c => c.stationId === robot.stationId)
    }

    // Fallback to matching by station code and area
    if (!matchingCell) {
      matchingCell = findMatchingCell(
        cells,
        areas,
        robot.lineCode,
        robot.stationCode,
        robot.areaName
      )
    }

    if (matchingCell) {
      robot.cellId = matchingCell.id
      robot.areaId = matchingCell.areaId
      robot.projectId = matchingCell.projectId
    } else {
      // Try to at least link to area
      const matchingArea = findMatchingArea(areas, robot.areaName, robot.lineCode)
      if (matchingArea) {
        robot.areaId = matchingArea.id
        robot.projectId = matchingArea.projectId
      } else {
        const matchKey = buildMatchKey(robot.lineCode, robot.stationCode, robot.areaName)
        warnings.push(createLinkingMissingTargetWarning({
          entityType: 'ROBOT',
          entityId: robot.id,
          entityName: robot.name,
          fileName: robot.sourceFile,
          matchKey,
          reason: 'No matching cell or area found based on lineCode, stationCode, and areaName'
        }))
      }
    }
  }
}

/**
 * Link tools to cells based on line code, station code, and area
 */
function linkToolsToCells(
  tools: Tool[],
  cells: Cell[],
  areas: Area[],
  _projects: Project[],
  warnings: IngestionWarning[]
): void {
  for (const tool of tools) {
    // First try to match using stationId (most reliable)
    let matchingCell: Cell | undefined
    if (tool.stationId) {
      matchingCell = cells.find(c => c.stationId === tool.stationId)
    }

    // Fallback to matching by station code and area
    if (!matchingCell) {
      matchingCell = findMatchingCell(
        cells,
        areas,
        tool.lineCode,
        tool.stationCode,
        tool.areaName
      )
    }

    if (matchingCell) {
      tool.cellId = matchingCell.id
      tool.areaId = matchingCell.areaId
      tool.projectId = matchingCell.projectId
    } else {
      // Try to at least link to area
      const matchingArea = findMatchingArea(areas, tool.areaName, tool.lineCode)
      if (matchingArea) {
        tool.areaId = matchingArea.id
        tool.projectId = matchingArea.projectId
      } else {
        const matchKey = buildMatchKey(tool.lineCode, tool.stationCode, tool.areaName)
        warnings.push(createLinkingMissingTargetWarning({
          entityType: 'TOOL',
          entityId: tool.id,
          entityName: tool.name,
          fileName: tool.sourceFile,
          matchKey,
          reason: 'No matching cell or area found based on lineCode, stationCode, and areaName'
        }))
      }
    }
  }
}

/**
 * Update cells with robot and tool IDs
 */
function updateCellEquipmentLinks(
  cells: Cell[],
  robots: Robot[],
  tools: Tool[]
): void {
  for (const cell of cells) {
    // Find robots linked to this cell
    const cellRobots = robots.filter(r => r.cellId === cell.id)

    // Find tools linked to this cell
    const cellTools = tools.filter(t => t.cellId === cell.id)

    // Update robot tool IDs with linked tools
    for (const robot of cellRobots) {
      const robotTools = cellTools.filter(t => t.robotId === robot.id)
      robot.toolIds = robotTools.map(t => t.id)
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find a cell matching the given criteria
 * Uses normalized area names and station codes for consistent matching
 */
function findMatchingCell(
  cells: Cell[],
  areas: Area[],
  lineCode?: string,
  stationCode?: string,
  areaName?: string
): Cell | undefined {
  if (!stationCode) return undefined

  // Build stationId from normalized values (same as used in parsers)
  const normalizedArea = normalizeAreaName(areaName)
  const normalizedStation = normalizeStationCode(stationCode)
  const candidateStationId = buildStationId(normalizedArea, normalizedStation)

  // First try to match by stationId if we can build one
  if (candidateStationId) {
    const cell = cells.find(c => c.stationId === candidateStationId)
    if (cell) return cell
  }

  // Fallback: Build area candidates using normalized comparison
  const areaCandidates = areas.filter(area => {
    if (areaName) {
      const normalizedSearchArea = normalizeAreaName(areaName)
      const normalizedCellArea = normalizeAreaName(area.name)
      if (normalizedSearchArea && normalizedCellArea && 
          normalizedSearchArea === normalizedCellArea) return true
    }
    if (lineCode && area.code) {
      const normalizedLineCode = normalizeString(lineCode)
      const normalizedAreaCode = normalizeString(area.code)
      if (normalizedLineCode === normalizedAreaCode) return true
    }
    return false
  })

  // Find cell in candidate areas with matching station
  for (const area of areaCandidates) {
    const normalizedCellStation = normalizeStationCode(stationCode)
    const cell = cells.find(c => {
      if (c.areaId !== area.id) return false
      const normalizedCellCode = normalizeStationCode(c.code)
      return normalizedCellStation && normalizedCellCode && 
             normalizedCellStation === normalizedCellCode
    })
    if (cell) return cell
  }

  // Fallback: find any cell with matching normalized station code
  const normalizedSearchStation = normalizeStationCode(stationCode)
  if (normalizedSearchStation) {
    return cells.find(c => {
      const normalizedCellCode = normalizeStationCode(c.code)
      return normalizedCellCode === normalizedSearchStation
    })
  }

  return undefined
}

/**
 * Find an area matching the given criteria
 * Uses normalized area names for consistent matching
 */
function findMatchingArea(
  areas: Area[],
  areaName?: string,
  lineCode?: string
): Area | undefined {
  if (!areaName && !lineCode) return undefined

  return areas.find(area => {
    if (areaName) {
      const normalizedSearchArea = normalizeAreaName(areaName)
      const normalizedCellArea = normalizeAreaName(area.name)
      if (normalizedSearchArea && normalizedCellArea && 
          normalizedSearchArea === normalizedCellArea) return true
    }
    if (lineCode && area.code) {
      const normalizedSearchLine = normalizeString(lineCode)
      const normalizedAreaCode = normalizeString(area.code)
      if (normalizedSearchLine === normalizedAreaCode) return true
    }
    return false
  })
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string | undefined | null): string {
  if (!str) return ''
  return str.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Build a match key string for diagnostics
 */
function buildMatchKey(lineCode?: string, stationCode?: string, areaName?: string): string {
  const parts: string[] = []
  if (lineCode) parts.push(`line:${lineCode}`)
  if (stationCode) parts.push(`station:${stationCode}`)
  if (areaName) parts.push(`area:${areaName}`)
  return parts.length > 0 ? parts.join(', ') : 'no matching criteria'
}
