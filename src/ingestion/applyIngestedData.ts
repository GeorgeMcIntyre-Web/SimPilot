// Apply Ingested Data
// Merges parsed Excel data into domain stores with intelligent linking

import { Project, Area, Cell, Robot, Tool, IngestionWarning } from '../domain/core'
import { SimulationStatusResult } from './simulationStatusParser'
import { RobotListResult } from './robotListParser'
import { ToolListResult } from './toolListParser'
import { createLinkingMissingTargetWarning, createParserErrorWarning } from './warningUtils'
import { linkAssetsToSimulation } from './relationshipLinker'

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
  linkCount?: number  // NEW: Number of successful asset→cell links for feedback
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

  // Add tools
  if (data.tools) {
    tools.push(...data.tools.tools)
    warnings.push(...data.tools.warnings)
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
  let linkCount = 0
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

    linkCount = linkResult.linkCount

    console.log(`[Relational Linker] Linked ${linkCount}/${linkResult.totalCells} cells to assets (${linkResult.stationCount} stations indexed)`)
  }

  // Link robots to cells and areas
  linkRobotsToCells(robots, cells, areas, projects, warnings)

  // Link tools to cells and areas
  linkToolsToCells(tools, cells, areas, projects, warnings)

  // Update cell robot/tool counts
  updateCellEquipmentLinks(cells, robots, tools)

  return {
    projects,
    areas,
    cells,
    robots,
    tools,
    warnings,
    linkCount  // Return for user feedback
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
    // Try to find matching cell
    const matchingCell = findMatchingCell(
      cells,
      areas,
      robot.lineCode,
      robot.stationCode,
      robot.areaName
    )

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
    // Try to find matching cell
    const matchingCell = findMatchingCell(
      cells,
      areas,
      tool.lineCode,
      tool.stationCode,
      tool.areaName
    )

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
 */
function findMatchingCell(
  cells: Cell[],
  areas: Area[],
  lineCode?: string,
  stationCode?: string,
  areaName?: string
): Cell | undefined {
  if (!stationCode) return undefined

  // Build area candidates
  const areaCandidates = areas.filter(area => {
    if (areaName && normalizeString(area.name) === normalizeString(areaName)) return true
    if (lineCode && area.code && normalizeString(area.code) === normalizeString(lineCode)) return true
    return false
  })

  // Find cell in candidate areas with matching station
  for (const area of areaCandidates) {
    const cell = cells.find(c =>
      c.areaId === area.id &&
      normalizeString(c.code) === normalizeString(stationCode)
    )
    if (cell) return cell
  }

  // Fallback: find any cell with matching station code
  return cells.find(c => normalizeString(c.code) === normalizeString(stationCode))
}

/**
 * Find an area matching the given criteria
 */
function findMatchingArea(
  areas: Area[],
  areaName?: string,
  lineCode?: string
): Area | undefined {
  if (!areaName && !lineCode) return undefined

  return areas.find(area => {
    if (areaName && normalizeString(area.name) === normalizeString(areaName)) return true
    if (lineCode && area.code && normalizeString(area.code) === normalizeString(lineCode)) return true
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
