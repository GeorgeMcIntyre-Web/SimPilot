import { Cell, Robot, Tool, IngestionWarning } from '../domain/core'

export type LinkType =
  | 'ROBOT_TO_CELL'
  | 'TOOL_TO_CELL'
  | 'TOOL_TO_ROBOT'
  | 'ROBOT_TO_TOOL'

export type LinkConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

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

export interface LinkGraph {
  links: AssetLink[]
  bySource: Map<string, AssetLink[]>
  byTarget: Map<string, AssetLink[]>
  stats: LinkStats
}

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

export interface LinkingResult {
  cells: Cell[]
  robots: Robot[]
  tools: Tool[]
  graph: LinkGraph
  warnings: IngestionWarning[]
}

export type EntityKind = 'ROBOT' | 'TOOL'
