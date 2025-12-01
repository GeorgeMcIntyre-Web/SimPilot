// Unified Asset Linker Unit Tests
// Tests the bidirectional linking between robots, tools, and cells

import { describe, it, expect, beforeEach } from 'vitest'
import {
  linkAssets,
  getLinksFrom,
  getLinksTo,
  getRobotsForCell,
  getToolsForCell,
  getCellForRobot,
  getLinkStatsSummary,
  resetLinkIdCounter
} from '../unifiedAssetLinker'
import { Cell, Robot, Tool } from '../../domain/core'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createCell(overrides: Partial<Cell> = {}): Cell {
  return {
    id: 'cell-1',
    projectId: 'proj-1',
    areaId: 'area-1',
    name: 'Underbody - OP-20',
    code: 'OP-20',
    status: 'InProgress',
    lastUpdated: new Date().toISOString(),
    ...overrides
  }
}

function createRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'robot-1',
    kind: 'ROBOT',
    name: 'R-001',
    toolIds: [],
    sourcing: 'UNKNOWN',
    metadata: {},
    sourceFile: 'robots.xlsx',
    sheetName: 'Robots',
    rowIndex: 1,
    ...overrides
  }
}

function createTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: 'tool-1',
    kind: 'GUN',
    name: 'WG-001',
    toolType: 'SPOT_WELD',
    mountType: 'ROBOT_MOUNTED',
    sourcing: 'REUSE',
    metadata: {},
    sourceFile: 'tools.xlsx',
    sheetName: 'Tools',
    rowIndex: 1,
    ...overrides
  }
}

// ============================================================================
// LINK ASSETS TESTS
// ============================================================================

describe('linkAssets', () => {
  beforeEach(() => {
    resetLinkIdCounter()
  })

  describe('robot to cell linking', () => {
    it('links robot to cell by station code', () => {
      const cells = [createCell({ id: 'cell-1', code: 'OP-20' })]
      const robots = [createRobot({ id: 'robot-1', stationCode: 'OP-20' })]
      const tools: Tool[] = []

      const result = linkAssets(cells, robots, tools)

      expect(result.robots[0].cellId).toBe('cell-1')
      expect(result.graph.stats.linkedRobots).toBe(1)
      expect(result.graph.stats.unlinkedRobots).toBe(0)
    })

    it('links robot to cell with normalized station codes', () => {
      const cells = [createCell({ id: 'cell-1', code: '20' })] // No "OP-" prefix
      const robots = [createRobot({ id: 'robot-1', stationCode: 'OP-20' })] // With prefix
      const tools: Tool[] = []

      const result = linkAssets(cells, robots, tools)

      expect(result.robots[0].cellId).toBe('cell-1')
    })

    it('handles leading zeros in station codes', () => {
      const cells = [createCell({ id: 'cell-1', code: '010' })]
      const robots = [createRobot({ id: 'robot-1', stationCode: '10' })]
      const tools: Tool[] = []

      const result = linkAssets(cells, robots, tools)

      expect(result.robots[0].cellId).toBe('cell-1')
    })

    it('creates warning for unlinked robots', () => {
      const cells = [createCell({ id: 'cell-1', code: 'OP-20' })]
      const robots = [createRobot({ id: 'robot-1', stationCode: 'OP-99' })] // No match
      const tools: Tool[] = []

      const result = linkAssets(cells, robots, tools)

      expect(result.robots[0].cellId).toBeUndefined()
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0].kind).toBe('LINKING_MISSING_TARGET')
    })

    it('prefers area+station match over station-only match', () => {
      const cells = [
        createCell({ id: 'cell-1', code: 'OP-20', name: 'Underbody - OP-20' }),
        createCell({ id: 'cell-2', code: 'OP-20', name: 'Side Body - OP-20' })
      ]
      const robots = [
        createRobot({ id: 'robot-1', stationCode: 'OP-20', areaName: 'Underbody' })
      ]
      const tools: Tool[] = []

      const result = linkAssets(cells, robots, tools)

      expect(result.robots[0].cellId).toBe('cell-1')
    })
  })

  describe('tool to cell linking', () => {
    it('links tool to cell by station code', () => {
      const cells = [createCell({ id: 'cell-1', code: 'OP-20' })]
      const robots: Robot[] = []
      const tools = [createTool({ id: 'tool-1', stationCode: 'OP-20' })]

      const result = linkAssets(cells, robots, tools)

      expect(result.tools[0].cellId).toBe('cell-1')
      expect(result.graph.stats.linkedTools).toBe(1)
    })

    it('creates warning for unlinked tools', () => {
      const cells = [createCell({ id: 'cell-1', code: 'OP-20' })]
      const robots: Robot[] = []
      const tools = [createTool({ id: 'tool-1', stationCode: 'OP-99' })] // No match

      const result = linkAssets(cells, robots, tools)

      expect(result.tools[0].cellId).toBeUndefined()
      expect(result.warnings.some(w => w.kind === 'LINKING_MISSING_TARGET')).toBe(true)
    })
  })

  describe('tool to robot linking', () => {
    it('links tool to robot when no direct cell match', () => {
      const cells = [createCell({ id: 'cell-1', code: 'OP-20' })]
      const robots = [createRobot({ id: 'robot-1', stationCode: 'OP-30', cellId: 'cell-1' })]
      const tools = [createTool({ id: 'tool-1', stationCode: 'OP-30' })] // Matches robot station

      // First link robots to cells
      robots[0].cellId = 'cell-1'

      const result = linkAssets(cells, robots, tools)

      // Tool should link to robot via station
      expect(result.tools[0].robotId).toBe('robot-1')
      expect(result.robots[0].toolIds).toContain('tool-1')
    })
  })

  describe('link graph', () => {
    it('builds bidirectional link indices', () => {
      const cells = [createCell({ id: 'cell-1', code: 'OP-20' })]
      const robots = [createRobot({ id: 'robot-1', stationCode: 'OP-20' })]
      const tools: Tool[] = []

      const result = linkAssets(cells, robots, tools)

      // Check bySource index
      const robotLinks = result.graph.bySource.get('robot-1')
      expect(robotLinks).toBeDefined()
      expect(robotLinks?.length).toBe(1)
      expect(robotLinks?.[0].type).toBe('ROBOT_TO_CELL')

      // Check byTarget index
      const cellLinks = result.graph.byTarget.get('cell-1')
      expect(cellLinks).toBeDefined()
      expect(cellLinks?.length).toBe(1)
    })

    it('calculates stats correctly', () => {
      const cells = [
        createCell({ id: 'cell-1', code: 'OP-20' }),
        createCell({ id: 'cell-2', code: 'OP-30' })
      ]
      const robots = [
        createRobot({ id: 'robot-1', stationCode: 'OP-20' }),
        createRobot({ id: 'robot-2', stationCode: 'OP-99' }) // No match
      ]
      const tools = [
        createTool({ id: 'tool-1', stationCode: 'OP-20' }),
        createTool({ id: 'tool-2', stationCode: 'OP-30' })
      ]

      const result = linkAssets(cells, robots, tools)

      expect(result.graph.stats.totalRobots).toBe(2)
      expect(result.graph.stats.linkedRobots).toBe(1)
      expect(result.graph.stats.unlinkedRobots).toBe(1)
      expect(result.graph.stats.totalTools).toBe(2)
      expect(result.graph.stats.linkedTools).toBe(2)
      expect(result.graph.stats.totalCells).toBe(2)
    })
  })

  describe('ambiguous matches', () => {
    it('flags ambiguous matches when multiple cells match', () => {
      const cells = [
        createCell({ id: 'cell-1', code: 'OP-20' }),
        createCell({ id: 'cell-2', code: 'OP-20' }) // Same station code
      ]
      const robots = [createRobot({ id: 'robot-1', stationCode: 'OP-20' })]
      const tools: Tool[] = []

      const result = linkAssets(cells, robots, tools)

      // Should still link (to first match)
      expect(result.robots[0].cellId).toBeDefined()

      // Should flag as ambiguous
      expect(result.graph.stats.ambiguousCount).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.kind === 'LINKING_AMBIGUOUS')).toBe(true)
    })
  })
})

// ============================================================================
// GRAPH QUERY TESTS
// ============================================================================

describe('graph queries', () => {
  let cells: Cell[]
  let robots: Robot[]
  let tools: Tool[]
  let result: ReturnType<typeof linkAssets>

  beforeEach(() => {
    resetLinkIdCounter()

    cells = [
      createCell({ id: 'cell-1', code: 'OP-20' }),
      createCell({ id: 'cell-2', code: 'OP-30' })
    ]
    robots = [
      createRobot({ id: 'robot-1', stationCode: 'OP-20' }),
      createRobot({ id: 'robot-2', stationCode: 'OP-30' })
    ]
    tools = [
      createTool({ id: 'tool-1', stationCode: 'OP-20' }),
      createTool({ id: 'tool-2', stationCode: 'OP-30' })
    ]

    result = linkAssets(cells, robots, tools)
  })

  describe('getLinksFrom', () => {
    it('returns links originating from an entity', () => {
      const links = getLinksFrom(result.graph, 'robot-1')

      expect(links.length).toBe(1)
      expect(links[0].type).toBe('ROBOT_TO_CELL')
      expect(links[0].targetId).toBe('cell-1')
    })

    it('returns empty array for unknown entity', () => {
      const links = getLinksFrom(result.graph, 'unknown-id')
      expect(links).toEqual([])
    })
  })

  describe('getLinksTo', () => {
    it('returns links targeting an entity', () => {
      const links = getLinksTo(result.graph, 'cell-1')

      expect(links.length).toBe(2) // One robot, one tool
    })

    it('returns empty array for unknown entity', () => {
      const links = getLinksTo(result.graph, 'unknown-id')
      expect(links).toEqual([])
    })
  })

  describe('getRobotsForCell', () => {
    it('returns robots linked to a cell', () => {
      const cellRobots = getRobotsForCell(result.graph, 'cell-1', result.robots)

      expect(cellRobots.length).toBe(1)
      expect(cellRobots[0].id).toBe('robot-1')
    })

    it('returns empty array for cell with no robots', () => {
      const emptyResult = linkAssets(cells, [], tools)
      const cellRobots = getRobotsForCell(emptyResult.graph, 'cell-1', [])

      expect(cellRobots).toEqual([])
    })
  })

  describe('getToolsForCell', () => {
    it('returns tools linked to a cell', () => {
      const cellTools = getToolsForCell(result.graph, 'cell-1', result.tools)

      expect(cellTools.length).toBe(1)
      expect(cellTools[0].id).toBe('tool-1')
    })
  })

  describe('getCellForRobot', () => {
    it('returns the cell a robot is linked to', () => {
      const cell = getCellForRobot(result.graph, 'robot-1', result.cells)

      expect(cell).not.toBeNull()
      expect(cell?.id).toBe('cell-1')
    })

    it('returns null for unlinked robot', () => {
      const unlinkedRobot = createRobot({ id: 'robot-99', stationCode: 'OP-99' })
      const newResult = linkAssets(cells, [unlinkedRobot], [])

      const cell = getCellForRobot(newResult.graph, 'robot-99', cells)
      expect(cell).toBeNull()
    })
  })
})

// ============================================================================
// STATS SUMMARY TESTS
// ============================================================================

describe('getLinkStatsSummary', () => {
  it('formats stats as human-readable string', () => {
    const stats = {
      totalRobots: 10,
      linkedRobots: 8,
      unlinkedRobots: 2,
      totalTools: 20,
      linkedTools: 15,
      unlinkedTools: 5,
      totalCells: 5,
      cellsWithRobots: 4,
      cellsWithTools: 3,
      linkCount: 23,
      ambiguousCount: 2
    }

    const summary = getLinkStatsSummary(stats)

    expect(summary).toContain('8/10 robots')
    expect(summary).toContain('80%')
    expect(summary).toContain('15/20 tools')
    expect(summary).toContain('75%')
    expect(summary).toContain('2 ambiguous')
  })

  it('handles zero totals', () => {
    const stats = {
      totalRobots: 0,
      linkedRobots: 0,
      unlinkedRobots: 0,
      totalTools: 0,
      linkedTools: 0,
      unlinkedTools: 0,
      totalCells: 0,
      cellsWithRobots: 0,
      cellsWithTools: 0,
      linkCount: 0,
      ambiguousCount: 0
    }

    const summary = getLinkStatsSummary(stats)

    expect(summary).toContain('0/0 robots')
    expect(summary).toContain('0%')
  })
})
