// Unified Asset Linker orchestrates building bidirectional links between robots, tools, and cells.

import { Cell, Robot, Tool, IngestionWarning } from '../domain/core'
import { buildCellIndex, buildRobotIndex } from './linking/indexes'
import { findCellForAsset, findRobotForTool, buildMatchKeyString } from './linking/matching'
import { pushAmbiguous, pushMissingTarget } from './linking/warnings'
import {
  AssetLink,
  LinkGraph,
  LinkStats,
  LinkingResult,
  LinkType,
  LinkConfidence,
} from './linking/types'
import {
  getLinksFrom,
  getLinksTo,
  getRobotsForCell,
  getToolsForCell,
  getCellForRobot,
  getLinkStatsSummary,
} from './linking/linkGraph'

let linkIdCounter = 0

function generateLinkId(type: LinkType): string {
  linkIdCounter += 1
  return `link-${type}-${linkIdCounter}-${Date.now().toString(36)}`
}

export function resetLinkIdCounter(): void {
  linkIdCounter = 0
}

const append = <T>(map: Map<string, T[]>, key: string, value: T): void => {
  const items = map.get(key) ?? []
  items.push(value)
  map.set(key, items)
}

export function linkAssets(cells: Cell[], robots: Robot[], tools: Tool[]): LinkingResult {
  const warnings: IngestionWarning[] = []
  const links: AssetLink[] = []

  const cellIndex = buildCellIndex(cells)
  const robotIndex = buildRobotIndex(robots)

  const linkedRobotIds = new Set<string>()
  const linkedToolIds = new Set<string>()
  const cellsWithRobots = new Set<string>()
  const cellsWithTools = new Set<string>()
  let ambiguousCount = 0

  for (const robot of robots) {
    const matchResult = findCellForAsset(robot, cellIndex)

    if (matchResult.match === null) {
      pushMissingTarget(
        warnings,
        'ROBOT',
        robot,
        buildMatchKeyString(robot.stationCode, robot.areaName, robot.lineCode),
        'No matching cell found',
      )
      continue
    }

    if (matchResult.ambiguous) {
      pushAmbiguous(
        warnings,
        'ROBOT',
        robot,
        matchResult.candidateCount,
        buildMatchKeyString(robot.stationCode, robot.areaName, robot.lineCode),
      )
      ambiguousCount += 1
    }

    const link: AssetLink = {
      id: generateLinkId('ROBOT_TO_CELL'),
      type: 'ROBOT_TO_CELL',
      sourceId: robot.id,
      sourceKind: 'ROBOT',
      targetId: matchResult.match.id,
      targetKind: 'CELL',
      confidence: matchResult.confidence,
      matchMethod: matchResult.method,
      matchKey: matchResult.key,
    }
    links.push(link)

    robot.cellId = matchResult.match.id
    robot.areaId = matchResult.match.areaId
    robot.projectId = matchResult.match.projectId

    linkedRobotIds.add(robot.id)
    cellsWithRobots.add(matchResult.match.id)
  }

  for (const tool of tools) {
    const matchResult = findCellForAsset(tool, cellIndex)

    if (matchResult.match === null) {
      const robotMatch = findRobotForTool(tool, robotIndex)

      if (robotMatch.match !== null) {
        const toolRobotLink: AssetLink = {
          id: generateLinkId('TOOL_TO_ROBOT'),
          type: 'TOOL_TO_ROBOT',
          sourceId: tool.id,
          sourceKind: 'TOOL',
          targetId: robotMatch.match.id,
          targetKind: 'ROBOT',
          confidence: robotMatch.confidence,
          matchMethod: robotMatch.method,
          matchKey: robotMatch.key,
        }
        links.push(toolRobotLink)

        tool.robotId = robotMatch.match.id
        if (robotMatch.match.cellId) {
          tool.cellId = robotMatch.match.cellId
          tool.areaId = robotMatch.match.areaId
          tool.projectId = robotMatch.match.projectId
          cellsWithTools.add(robotMatch.match.cellId)
        }

        if (robotMatch.match.toolIds.includes(tool.id) === false) {
          robotMatch.match.toolIds.push(tool.id)
        }

        linkedToolIds.add(tool.id)
        continue
      }

      pushMissingTarget(
        warnings,
        'TOOL',
        tool,
        buildMatchKeyString(tool.stationCode, tool.areaName, tool.lineCode),
        'No matching cell or robot found',
      )
      continue
    }

    if (matchResult.ambiguous) {
      pushAmbiguous(
        warnings,
        'TOOL',
        tool,
        matchResult.candidateCount,
        buildMatchKeyString(tool.stationCode, tool.areaName, tool.lineCode),
      )
      ambiguousCount += 1
    }

    const link: AssetLink = {
      id: generateLinkId('TOOL_TO_CELL'),
      type: 'TOOL_TO_CELL',
      sourceId: tool.id,
      sourceKind: 'TOOL',
      targetId: matchResult.match.id,
      targetKind: 'CELL',
      confidence: matchResult.confidence,
      matchMethod: matchResult.method,
      matchKey: matchResult.key,
    }
    links.push(link)

    tool.cellId = matchResult.match.id
    tool.areaId = matchResult.match.areaId
    tool.projectId = matchResult.match.projectId

    linkedToolIds.add(tool.id)
    cellsWithTools.add(matchResult.match.id)
  }

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
    ambiguousCount,
  }

  return {
    cells,
    robots,
    tools,
    graph: { links, bySource, byTarget, stats },
    warnings,
  }
}

export {
  getLinksFrom,
  getLinksTo,
  getRobotsForCell,
  getToolsForCell,
  getCellForRobot,
  getLinkStatsSummary,
}
export type { LinkType, LinkConfidence, AssetLink, LinkGraph, LinkStats, LinkingResult }
