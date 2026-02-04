import { Cell, Robot, Tool } from '../domain/core'
import { AssetLink, LinkGraph, LinkStats } from './types'

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
