// Unified Asset Linker
// Builds bidirectional links between Robots, Tools, and Cells
// Produces a link graph that can be surfaced in the UI

import { Cell, Robot, Tool, IngestionWarning } from '../domain/core'
import { createLinkingAmbiguousWarning, createLinkingMissingTargetWarning } from './warningUtils'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Types of links that can exist between entities
 */
export type LinkType =
  | 'ROBOT_TO_CELL'
  | 'TOOL_TO_CELL'
  | 'TOOL_TO_ROBOT'
  | 'ROBOT_TO_TOOL'

/**
 * Confidence level for a link
 */
export type LinkConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

/**
 * A single link between two entities
 */
export interface AssetLink {
  id: string
  type: LinkType
  sourceId: string
  sourceKind: 'ROBOT' | 'TOOL' | 'CELL'
  targetId: string
  targetKind: 'ROBOT' | 'TOOL' | 'CELL'
  confidence: LinkConfidence
  matchMethod: string
  matchKey: string
}

/**
 * Complete link graph for a project
 */
export interface LinkGraph {
  links: AssetLink[]
  bySource: Map<string, AssetLink[]>
  byTarget: Map<string, AssetLink[]>
  stats: LinkStats
}

/**
 * Statistics about linking
 */
export interface LinkStats {
  totalRobots: number
  linkedRobots: number
  unlinkedRobots: number
  totalTools: number
  linkedTools: number
  unlinkedTools: number
  totalCells: number
  cellsWithRobots: number
  cellsWithTools: number
  linkCount: number
  ambiguousCount: number
}

/**
 * Result of the linking process
 */
export interface LinkingResult {
  cells: Cell[]
  robots: Robot[]
  tools: Tool[]
  graph: LinkGraph
  warnings: IngestionWarning[]
}

type EntityKind = 'ROBOT' | 'TOOL'

const append = <T>(map: Map<string, T[]>, key: string, value: T): void => {
  const items = map.get(key) ?? []
  items.push(value)
  map.set(key, items)
}

const pushMissingTarget = (
  warnings: IngestionWarning[],
  kind: EntityKind,
  entity: Robot | Tool,
  matchKey: string,
  reason: string
): void => {
  warnings.push(createLinkingMissingTargetWarning({
    entityType: kind,
    entityId: entity.id,
    entityName: entity.name,
    fileName: entity.sourceFile ?? '',
    matchKey,
    reason
  }))
}

const pushAmbiguous = (
  warnings: IngestionWarning[],
  kind: EntityKind,
  entity: Robot | Tool,
  candidateCount: number,
  matchKey: string
): void => {
  warnings.push(createLinkingAmbiguousWarning({
    entityType: kind,
    entityId: entity.id,
    fileName: entity.sourceFile ?? '',
    candidatesCount: candidateCount,
    matchKey
  }))
}

// ============================================================================
// NORMALIZATION HELPERS
// ============================================================================

/**
 * Normalize station code for fuzzy matching.
 * 
 * Examples:
 * - "010" → "10"
 * - "OP-20" → "20"
 * - "Station 030" → "30"
 * - "UB_040" → "ub040"
 */
function normalizeStation(code: string | undefined): string {
  if (code === undefined || code === null) {
    return ''
  }

  const str = String(code).toLowerCase().trim()

  // Remove common prefixes
  const withoutPrefix = str
    .replace(/^(op|station|st|cell)[-_.\s]*/i, '')
    .replace(/[-_.\s]/g, '')

  // Remove leading zeros only if it's purely numeric
  if (/^\d+$/.test(withoutPrefix)) {
    return withoutPrefix.replace(/^0+/, '') || '0'
  }

  return withoutPrefix
}

/**
 * Normalize area name for fuzzy matching.
 * 
 * Examples:
 * - "Underbody" → "underbody"
 * - "UNDER_BODY" → "underbody"
 * - "UB LH" → "ublh"
 */
function normalizeArea(name: string | undefined): string {
  if (name === undefined || name === null) {
    return ''
  }

  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[-_.\s]/g, '')
}

/**
 * Normalize line code for matching.
 */
function normalizeLine(code: string | undefined): string {
  if (code === undefined || code === null) {
    return ''
  }

  return String(code)
    .toLowerCase()
    .trim()
    .replace(/[-_.\s]/g, '')
}

/**
 * Normalize robot/device name for matching.
 */
function normalizeAssetName(name: string | undefined): string {
  if (name === undefined || name === null) {
    return ''
  }

  return String(name)
    .toLowerCase()
    .trim()
    .replace(/^(robot|device|gun|tool)[-_.\s]*/i, '')
    .replace(/[-_.\s]/g, '')
}

// ============================================================================
// LINK ID GENERATION
// ============================================================================

let linkIdCounter = 0

function generateLinkId(type: LinkType): string {
  linkIdCounter += 1
  return `link-${type}-${linkIdCounter}-${Date.now().toString(36)}`
}

/**
 * Reset link ID counter (for tests)
 */
export function resetLinkIdCounter(): void {
  linkIdCounter = 0
}

// ============================================================================
// MAIN LINKING FUNCTION
// ============================================================================

/**
 * Build unified links between all assets.
 * 
 * Links are created based on:
 * 1. Station code matching (highest priority)
 * 2. Area + Line code matching
 * 3. Robot name hints in tool data
 * 
 * Returns enriched entities with IDs populated + a link graph.
 */
export function linkAssets(
  cells: Cell[],
  robots: Robot[],
  tools: Tool[]
): LinkingResult {
  const warnings: IngestionWarning[] = []
  const links: AssetLink[] = []

  // Build lookup indices
  const cellIndex = buildCellIndex(cells)
  const robotIndex = buildRobotIndex(robots)

  // Track linked entities
  const linkedRobotIds = new Set<string>()
  const linkedToolIds = new Set<string>()
  const cellsWithRobots = new Set<string>()
  const cellsWithTools = new Set<string>()
  let ambiguousCount = 0

  // -------------------------------------------------------------------------
  // Step 1: Link Robots to Cells
  // -------------------------------------------------------------------------
  for (const robot of robots) {
    const matchResult = findCellForAsset(robot, cellIndex)

    if (matchResult.match === null) {
      pushMissingTarget(
        warnings,
        'ROBOT',
        robot,
        buildMatchKeyString(robot.stationCode, robot.areaName, robot.lineCode),
        'No matching cell found'
      )
      continue
    }

    if (matchResult.ambiguous) {
      pushAmbiguous(
        warnings,
        'ROBOT',
        robot,
        matchResult.candidateCount,
        buildMatchKeyString(robot.stationCode, robot.areaName, robot.lineCode)
      )
      ambiguousCount += 1
    }

    // Create link
    const link: AssetLink = {
      id: generateLinkId('ROBOT_TO_CELL'),
      type: 'ROBOT_TO_CELL',
      sourceId: robot.id,
      sourceKind: 'ROBOT',
      targetId: matchResult.match.id,
      targetKind: 'CELL',
      confidence: matchResult.confidence,
      matchMethod: matchResult.method,
      matchKey: matchResult.key
    }
    links.push(link)

    // Update robot with cell reference
    robot.cellId = matchResult.match.id
    robot.areaId = matchResult.match.areaId
    robot.projectId = matchResult.match.projectId

    linkedRobotIds.add(robot.id)
    cellsWithRobots.add(matchResult.match.id)
  }

  // -------------------------------------------------------------------------
  // Step 2: Link Tools to Cells
  // -------------------------------------------------------------------------
  for (const tool of tools) {
    const matchResult = findCellForAsset(tool, cellIndex)

    if (matchResult.match === null) {
      // Try linking via robot instead
      const robotMatch = findRobotForTool(tool, robotIndex)

      if (robotMatch.match !== null) {
        // Link tool to robot
        const toolRobotLink: AssetLink = {
          id: generateLinkId('TOOL_TO_ROBOT'),
          type: 'TOOL_TO_ROBOT',
          sourceId: tool.id,
          sourceKind: 'TOOL',
          targetId: robotMatch.match.id,
          targetKind: 'ROBOT',
          confidence: robotMatch.confidence,
          matchMethod: robotMatch.method,
          matchKey: robotMatch.key
        }
        links.push(toolRobotLink)

        // Update tool with robot's cell
        tool.robotId = robotMatch.match.id
        if (robotMatch.match.cellId) {
          tool.cellId = robotMatch.match.cellId
          tool.areaId = robotMatch.match.areaId
          tool.projectId = robotMatch.match.projectId
          cellsWithTools.add(robotMatch.match.cellId)
        }

        // Update robot's toolIds
        if (robotMatch.match.toolIds.includes(tool.id) === false) {
          robotMatch.match.toolIds.push(tool.id)
        }

        linkedToolIds.add(tool.id)
        continue
      }

      // No cell or robot match
      pushMissingTarget(
        warnings,
        'TOOL',
        tool,
        buildMatchKeyString(tool.stationCode, tool.areaName, tool.lineCode),
        'No matching cell or robot found'
      )
      continue
    }

    if (matchResult.ambiguous) {
      pushAmbiguous(
        warnings,
        'TOOL',
        tool,
        matchResult.candidateCount,
        buildMatchKeyString(tool.stationCode, tool.areaName, tool.lineCode)
      )
      ambiguousCount += 1
    }

    // Create link
    const link: AssetLink = {
      id: generateLinkId('TOOL_TO_CELL'),
      type: 'TOOL_TO_CELL',
      sourceId: tool.id,
      sourceKind: 'TOOL',
      targetId: matchResult.match.id,
      targetKind: 'CELL',
      confidence: matchResult.confidence,
      matchMethod: matchResult.method,
      matchKey: matchResult.key
    }
    links.push(link)

    // Update tool with cell reference
    tool.cellId = matchResult.match.id
    tool.areaId = matchResult.match.areaId
    tool.projectId = matchResult.match.projectId

    linkedToolIds.add(tool.id)
    cellsWithTools.add(matchResult.match.id)
  }

  // -------------------------------------------------------------------------
  // Step 3: Build link graph
  // -------------------------------------------------------------------------
  const bySource = new Map<string, AssetLink[]>()
  const byTarget = new Map<string, AssetLink[]>()

  for (const link of links) {
    append(bySource, link.sourceId, link)
    append(byTarget, link.targetId, link)
  }

  const stats: LinkStats = {
    totalRobots: robots.length,
    linkedRobots: linkedRobotIds.size,
    unlinkedRobots: robots.length - linkedRobotIds.size,
    totalTools: tools.length,
    linkedTools: linkedToolIds.size,
    unlinkedTools: tools.length - linkedToolIds.size,
    totalCells: cells.length,
    cellsWithRobots: cellsWithRobots.size,
    cellsWithTools: cellsWithTools.size,
    linkCount: links.length,
    ambiguousCount
  }

  const graph: LinkGraph = {
    links,
    bySource,
    byTarget,
    stats
  }

  return {
    cells,
    robots,
    tools,
    graph,
    warnings
  }
}

// ============================================================================
// CELL INDEX
// ============================================================================

interface CellIndex {
  byStation: Map<string, Cell[]>
  byAreaAndStation: Map<string, Cell[]>
  byLineAndStation: Map<string, Cell[]>
  all: Cell[]
}

function buildCellIndex(cells: Cell[]): CellIndex {
  const byStation = new Map<string, Cell[]>()
  const byAreaAndStation = new Map<string, Cell[]>()
  const byLineAndStation = new Map<string, Cell[]>()

  for (const cell of cells) {
    const normalizedStation = normalizeStation(cell.code)

    // Index by station only
    if (normalizedStation) {
      const existing = byStation.get(normalizedStation) ?? []
      existing.push(cell)
      byStation.set(normalizedStation, existing)
    }

    // Index by area + station
    const areaKey = `${normalizeArea(cell.name?.split(' - ')[0])}:${normalizedStation}`
    if (areaKey !== ':') {
      const existing = byAreaAndStation.get(areaKey) ?? []
      existing.push(cell)
      byAreaAndStation.set(areaKey, existing)
    }

    // Index by line + station
    const lineKey = `${normalizeLine(cell.lineCode)}:${normalizedStation}`
    if (lineKey !== ':') {
      const existing = byLineAndStation.get(lineKey) ?? []
      existing.push(cell)
      byLineAndStation.set(lineKey, existing)
    }
  }

  return { byStation, byAreaAndStation, byLineAndStation, all: cells }
}

// ============================================================================
// ROBOT INDEX
// ============================================================================

interface RobotIndex {
  byStation: Map<string, Robot[]>
  byName: Map<string, Robot>
  all: Robot[]
}

function buildRobotIndex(robots: Robot[]): RobotIndex {
  const byStation = new Map<string, Robot[]>()
  const byName = new Map<string, Robot>()

  for (const robot of robots) {
    // Index by station
    const normalizedStation = normalizeStation(robot.stationCode)
    if (normalizedStation) {
      const existing = byStation.get(normalizedStation) ?? []
      existing.push(robot)
      byStation.set(normalizedStation, existing)
    }

    // Index by name
    const normalizedName = normalizeAssetName(robot.name)
    if (normalizedName) {
      byName.set(normalizedName, robot)
    }
  }

  return { byStation, byName, all: robots }
}

// ============================================================================
// MATCHING FUNCTIONS
// ============================================================================

interface MatchResult<T> {
  match: T | null
  confidence: LinkConfidence
  method: string
  key: string
  ambiguous: boolean
  candidateCount: number
}

function buildMatchResult<T>(options: {
  match: T | null
  confidence: LinkConfidence
  method: string
  key: string
  ambiguous?: boolean
  candidateCount?: number
}): MatchResult<T> {
  return {
    match: options.match,
    confidence: options.confidence,
    method: options.method,
    key: options.key,
    ambiguous: options.ambiguous ?? false,
    candidateCount: options.candidateCount ?? 0
  }
}

interface AssetLike {
  stationCode?: string
  areaName?: string
  lineCode?: string
  name?: string
}

/**
 * Find the best matching cell for an asset (robot or tool)
 */
function findCellForAsset(asset: AssetLike, index: CellIndex): MatchResult<Cell> {
  const normalizedStation = normalizeStation(asset.stationCode)

  // No station code = no match
  if (normalizedStation === '') {
    return buildMatchResult({ match: null, confidence: 'LOW', method: 'none', key: '' })
  }

  // Try area + station first (most specific)
  if (asset.areaName) {
    const areaKey = `${normalizeArea(asset.areaName)}:${normalizedStation}`
    const areaMatches = index.byAreaAndStation.get(areaKey) ?? []

    if (areaMatches.length === 1) {
      return buildMatchResult({
        match: areaMatches[0],
        confidence: 'HIGH',
        method: 'area+station',
        key: areaKey,
        candidateCount: 1
      })
    }

    if (areaMatches.length > 1) {
      return buildMatchResult({
        match: areaMatches[0],
        confidence: 'MEDIUM',
        method: 'area+station',
        key: areaKey,
        ambiguous: true,
        candidateCount: areaMatches.length
      })
    }
  }

  // Try line + station
  if (asset.lineCode) {
    const lineKey = `${normalizeLine(asset.lineCode)}:${normalizedStation}`
    const lineMatches = index.byLineAndStation.get(lineKey) ?? []

    if (lineMatches.length === 1) {
      return buildMatchResult({
        match: lineMatches[0],
        confidence: 'HIGH',
        method: 'line+station',
        key: lineKey,
        candidateCount: 1
      })
    }

    if (lineMatches.length > 1) {
      return buildMatchResult({
        match: lineMatches[0],
        confidence: 'MEDIUM',
        method: 'line+station',
        key: lineKey,
        ambiguous: true,
        candidateCount: lineMatches.length
      })
    }
  }

  // Fallback to station only
  const stationMatches = index.byStation.get(normalizedStation) ?? []

  if (stationMatches.length === 1) {
    return buildMatchResult({
      match: stationMatches[0],
      confidence: 'MEDIUM',
      method: 'station',
      key: normalizedStation,
      candidateCount: 1
    })
  }

  if (stationMatches.length > 1) {
    return buildMatchResult({
      match: stationMatches[0],
      confidence: 'LOW',
      method: 'station',
      key: normalizedStation,
      ambiguous: true,
      candidateCount: stationMatches.length
    })
  }

  return buildMatchResult({ match: null, confidence: 'LOW', method: 'none', key: normalizedStation })
}

/**
 * Find a robot that might own this tool
 */
function findRobotForTool(tool: Tool, index: RobotIndex): MatchResult<Robot> {
  // Try by station
  const normalizedStation = normalizeStation(tool.stationCode)

  if (normalizedStation) {
    const stationRobots = index.byStation.get(normalizedStation) ?? []

    if (stationRobots.length === 1) {
      return buildMatchResult({
        match: stationRobots[0],
        confidence: 'MEDIUM',
        method: 'station',
        key: normalizedStation,
        candidateCount: 1
      })
    }

    if (stationRobots.length > 1) {
      // Ambiguous - multiple robots at same station
      return buildMatchResult({
        match: stationRobots[0],
        confidence: 'LOW',
        method: 'station',
        key: normalizedStation,
        ambiguous: true,
        candidateCount: stationRobots.length
      })
    }
  }

  // TODO: Could also try matching by robot name hints in tool metadata

  return buildMatchResult({ match: null, confidence: 'LOW', method: 'none', key: '' })
}

/**
 * Build a match key string for diagnostics
 */
function buildMatchKeyString(
  stationCode?: string,
  areaName?: string,
  lineCode?: string
): string {
  const parts: string[] = [
    stationCode ? `station:${stationCode}` : undefined,
    areaName ? `area:${areaName}` : undefined,
    lineCode ? `line:${lineCode}` : undefined
  ].filter(Boolean) as string[]

  return parts.length > 0 ? parts.join(', ') : 'no matching criteria'
}

// ============================================================================
// GRAPH QUERY FUNCTIONS
// ============================================================================

/**
 * Get all links originating from an entity
 */
export function getLinksFrom(graph: LinkGraph, entityId: string): AssetLink[] {
  return graph.bySource.get(entityId) ?? []
}

/**
 * Get all links targeting an entity
 */
export function getLinksTo(graph: LinkGraph, entityId: string): AssetLink[] {
  return graph.byTarget.get(entityId) ?? []
}

/**
 * Get all robots linked to a cell
 */
export function getRobotsForCell(graph: LinkGraph, cellId: string, robots: Robot[]): Robot[] {
  const links = getLinksTo(graph, cellId).filter(l => l.type === 'ROBOT_TO_CELL')
  const robotIds = new Set(links.map(l => l.sourceId))
  return robots.filter(r => robotIds.has(r.id))
}

/**
 * Get all tools linked to a cell (directly or via robot)
 */
export function getToolsForCell(graph: LinkGraph, cellId: string, tools: Tool[]): Tool[] {
  const directLinks = getLinksTo(graph, cellId).filter(l => l.type === 'TOOL_TO_CELL')
  const directToolIds = new Set(directLinks.map(l => l.sourceId))

  // Also get tools via robots
  const robotLinks = getLinksTo(graph, cellId).filter(l => l.type === 'ROBOT_TO_CELL')
  const robotIds = robotLinks.map(l => l.sourceId)

  const indirectToolIds = new Set<string>()
  for (const robotId of robotIds) {
    const robotToolLinks = getLinksTo(graph, robotId).filter(l => l.type === 'TOOL_TO_ROBOT')
    for (const link of robotToolLinks) {
      indirectToolIds.add(link.sourceId)
    }
  }

  return tools.filter(t => directToolIds.has(t.id) || indirectToolIds.has(t.id))
}

/**
 * Get the cell a robot is linked to
 */
export function getCellForRobot(graph: LinkGraph, robotId: string, cells: Cell[]): Cell | null {
  const links = getLinksFrom(graph, robotId).filter(l => l.type === 'ROBOT_TO_CELL')

  if (links.length === 0) {
    return null
  }

  return cells.find(c => c.id === links[0].targetId) ?? null
}

/**
 * Get link stats summary string
 */
export function getLinkStatsSummary(stats: LinkStats): string {
  const robotPct = stats.totalRobots > 0
    ? Math.round((stats.linkedRobots / stats.totalRobots) * 100)
    : 0

  const toolPct = stats.totalTools > 0
    ? Math.round((stats.linkedTools / stats.totalTools) * 100)
    : 0

  return `Linked ${stats.linkedRobots}/${stats.totalRobots} robots (${robotPct}%), ` +
    `${stats.linkedTools}/${stats.totalTools} tools (${toolPct}%). ` +
    `${stats.ambiguousCount} ambiguous matches.`
}
