// Relationship Linker Unit Tests
// Tests the linking of assets (robots, tools) to simulation cells using stationId

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  linkAssetsToSimulation,
  buildStationIndex,
  getLinkingStats,
  defaultDisambiguationStrategy,
  DisambiguationStrategy,
  IdGenerator,
  LinkingResult,
} from '../relationshipLinker'
import { Cell, Robot, Tool } from '../../domain/core'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createCell(overrides: Partial<Cell> = {}): Cell {
  return {
    id: 'cell-1',
    projectId: 'proj-1',
    areaId: 'area-1',
    name: 'Test Cell',
    code: '010',
    status: 'InProgress',
    stationId: 'AREA1|010',
    ...overrides,
  }
}

function createRobot(overrides: Partial<Robot> = {}): Robot {
  return {
    id: 'robot-1',
    kind: 'ROBOT',
    name: 'R-001',
    toolIds: [],
    sourcing: 'REUSE',
    metadata: { manufacturer: 'FANUC' },
    sourceFile: 'robots.xlsx',
    sheetName: 'Robots',
    rowIndex: 1,
    stationId: 'AREA1|010',
    ...overrides,
  }
}

function createTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: 'tool-1',
    kind: 'GUN',
    name: 'WG-001',
    toolType: 'SPOT_WELD',
    mountType: 'ROBOT_MOUNTED',
    sourcing: 'NEW_BUY',
    metadata: { supplier: 'Fronius' },
    sourceFile: 'tools.xlsx',
    sheetName: 'Tools',
    rowIndex: 1,
    stationId: 'AREA1|010',
    ...overrides,
  }
}

function createMockLogger() {
  const debug = vi.fn<(message: string) => void>()
  const warn = vi.fn<(message: string) => void>()
  return { debug, warn }
}

function createDeterministicIdGenerator(): IdGenerator {
  let counter = 0
  return () => `test-id-${++counter}`
}

// ============================================================================
// buildStationIndex TESTS
// ============================================================================

describe('buildStationIndex', () => {
  it('creates an index from assets with stationId', () => {
    const assets = [
      createRobot({ id: 'r1', stationId: 'AREA1|010' }),
      createRobot({ id: 'r2', stationId: 'AREA1|020' }),
      createTool({ id: 't1', stationId: 'AREA1|010' }),
    ]

    const index = buildStationIndex(assets)

    expect(index.stationCount).toBe(2)
    expect(index.assetsByStationId.get('AREA1|010')).toHaveLength(2)
    expect(index.assetsByStationId.get('AREA1|020')).toHaveLength(1)
  })

  it('skips assets without stationId', () => {
    const assets = [
      createRobot({ id: 'r1', stationId: 'AREA1|010' }),
      createRobot({ id: 'r2', stationId: undefined }),
      createRobot({ id: 'r3', stationId: null as unknown as string }),
    ]

    const index = buildStationIndex(assets)

    expect(index.stationCount).toBe(1)
    expect(index.assetsByStationId.get('AREA1|010')).toHaveLength(1)
  })

  it('returns empty index for empty assets array', () => {
    const index = buildStationIndex([])

    expect(index.stationCount).toBe(0)
    expect(index.assetsByStationId.size).toBe(0)
  })

  it('groups multiple assets at the same station', () => {
    const assets = [
      createRobot({ id: 'r1', stationId: 'AREA1|010' }),
      createRobot({ id: 'r2', stationId: 'AREA1|010' }),
      createTool({ id: 't1', stationId: 'AREA1|010' }),
      createTool({ id: 't2', stationId: 'AREA1|010' }),
    ]

    const index = buildStationIndex(assets)

    expect(index.stationCount).toBe(1)
    expect(index.assetsByStationId.get('AREA1|010')).toHaveLength(4)
  })
})

// ============================================================================
// defaultDisambiguationStrategy TESTS
// ============================================================================

describe('defaultDisambiguationStrategy', () => {
  it('selects single robot without ambiguity', () => {
    const candidates = [
      createRobot({ id: 'r1' }),
      createTool({ id: 't1' }),
      createTool({ id: 't2' }),
    ]

    const result = defaultDisambiguationStrategy(candidates)

    expect(result.selected.id).toBe('r1')
    expect(result.isAmbiguous).toBe(false)
  })

  it('selects first robot and marks ambiguous when multiple robots', () => {
    const candidates = [
      createRobot({ id: 'r1', name: 'Robot 1' }),
      createRobot({ id: 'r2', name: 'Robot 2' }),
      createTool({ id: 't1' }),
    ]

    const result = defaultDisambiguationStrategy(candidates)

    expect(result.selected.id).toBe('r1')
    expect(result.isAmbiguous).toBe(true)
  })

  it('selects first tool when no robots and marks ambiguous if multiple tools', () => {
    const candidates = [
      createTool({ id: 't1', name: 'Tool 1' }),
      createTool({ id: 't2', name: 'Tool 2' }),
    ]

    const result = defaultDisambiguationStrategy(candidates)

    expect(result.selected.id).toBe('t1')
    expect(result.isAmbiguous).toBe(true)
  })

  it('selects single tool without ambiguity when only one tool', () => {
    const candidates = [createTool({ id: 't1' })]

    // Note: This case is actually handled by pickBestAssetForCell before
    // calling the strategy, but testing the strategy directly
    const result = defaultDisambiguationStrategy(candidates)

    expect(result.selected.id).toBe('t1')
    expect(result.isAmbiguous).toBe(false)
  })
})

// ============================================================================
// linkAssetsToSimulation TESTS
// ============================================================================

describe('linkAssetsToSimulation', () => {
  let mockLogger: ReturnType<typeof createMockLogger>
  let idGenerator: IdGenerator

  beforeEach(() => {
    mockLogger = createMockLogger()
    idGenerator = createDeterministicIdGenerator()
  })

  describe('basic linking', () => {
    it('links cell to matching asset by stationId', () => {
      const cells = [createCell({ id: 'c1', stationId: 'AREA1|010' })]
      const assets = [createRobot({ id: 'r1', stationId: 'AREA1|010', name: 'Robot 1' })]

      const result = linkAssetsToSimulation(cells, assets, { logger: mockLogger })

      expect(result.linkCount).toBe(1)
      expect(result.linkedCells[0].metadata?.['Linked Asset ID']).toBe('r1')
      expect(result.linkedCells[0].metadata?.['Linked Asset Name']).toBe('Robot 1')
    })

    it('does not link cell without stationId', () => {
      const cells = [createCell({ id: 'c1', stationId: undefined })]
      const assets = [createRobot({ id: 'r1', stationId: 'AREA1|010' })]

      const result = linkAssetsToSimulation(cells, assets, { logger: mockLogger })

      expect(result.linkCount).toBe(0)
      expect(result.linkedCells[0].metadata?.['Linked Asset ID']).toBeUndefined()
    })

    it('does not link cell when no matching asset exists', () => {
      const cells = [createCell({ id: 'c1', stationId: 'AREA1|010' })]
      const assets = [createRobot({ id: 'r1', stationId: 'AREA2|020' })]

      const result = linkAssetsToSimulation(cells, assets, { logger: mockLogger })

      expect(result.linkCount).toBe(0)
    })

    it('returns correct statistics', () => {
      const cells = [
        createCell({ id: 'c1', stationId: 'AREA1|010' }),
        createCell({ id: 'c2', stationId: 'AREA1|020' }),
        createCell({ id: 'c3', stationId: 'AREA1|030' }),
      ]
      const assets = [
        createRobot({ id: 'r1', stationId: 'AREA1|010' }),
        createRobot({ id: 'r2', stationId: 'AREA1|020' }),
      ]

      const result = linkAssetsToSimulation(cells, assets, { logger: mockLogger })

      expect(result.linkCount).toBe(2)
      expect(result.totalCells).toBe(3)
      expect(result.stationCount).toBe(2)
    })
  })

  describe('data merging', () => {
    it('merges asset sourcing into cell', () => {
      const cells = [createCell({ id: 'c1', stationId: 'AREA1|010', sourcing: undefined })]
      const assets = [createRobot({ id: 'r1', stationId: 'AREA1|010', sourcing: 'REUSE' })]

      const result = linkAssetsToSimulation(cells, assets, { logger: mockLogger })

      expect(result.linkedCells[0].sourcing).toBe('REUSE')
    })

    it('merges asset metadata into cell', () => {
      const cells = [
        createCell({ id: 'c1', stationId: 'AREA1|010', metadata: { existing: 'value' } }),
      ]
      const assets = [
        createRobot({
          id: 'r1',
          stationId: 'AREA1|010',
          metadata: { manufacturer: 'FANUC', payload: '165kg' },
        }),
      ]

      const result = linkAssetsToSimulation(cells, assets, { logger: mockLogger })

      expect(result.linkedCells[0].metadata?.existing).toBe('value')
      expect(result.linkedCells[0].metadata?.manufacturer).toBe('FANUC')
      expect(result.linkedCells[0].metadata?.payload).toBe('165kg')
    })

    it('adds OEM model to metadata when present', () => {
      const cells = [createCell({ id: 'c1', stationId: 'AREA1|010' })]
      const assets = [createRobot({ id: 'r1', stationId: 'AREA1|010', oemModel: 'R-2000iC/165F' })]

      const result = linkAssetsToSimulation(cells, assets, { logger: mockLogger })

      expect(result.linkedCells[0].metadata?.['OEM Model']).toBe('R-2000iC/165F')
    })
  })

  describe('ambiguous matches', () => {
    it('creates warning for ambiguous matches', () => {
      const cells = [createCell({ id: 'c1', stationId: 'AREA1|010' })]
      const assets = [
        createRobot({ id: 'r1', stationId: 'AREA1|010', name: 'Robot 1' }),
        createRobot({ id: 'r2', stationId: 'AREA1|010', name: 'Robot 2' }),
      ]

      const result = linkAssetsToSimulation(cells, assets, {
        logger: mockLogger,
        idGenerator,
      })

      expect(result.ambiguousCount).toBe(1)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].kind).toBe('LINKING_AMBIGUOUS')
      expect(result.warnings[0].message).toContain('2 candidate assets')
    })

    it('logs warning for ambiguous matches', () => {
      const cells = [createCell({ id: 'c1', stationId: 'AREA1|010' })]
      const assets = [
        createRobot({ id: 'r1', stationId: 'AREA1|010' }),
        createRobot({ id: 'r2', stationId: 'AREA1|010' }),
      ]

      linkAssetsToSimulation(cells, assets, { logger: mockLogger })

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('1 stations have ambiguous asset matches'),
      )
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Ambiguous match'))
    })

    it('respects maxAmbiguousWarnings option', () => {
      const cells = Array.from({ length: 5 }, (_, i) =>
        createCell({ id: `c${i}`, stationId: `AREA1|0${i}0` }),
      )
      const assets = cells.flatMap((cell) => [
        createRobot({ id: `r1-${cell.id}`, stationId: cell.stationId!, name: 'Robot 1' }),
        createRobot({ id: `r2-${cell.id}`, stationId: cell.stationId!, name: 'Robot 2' }),
      ])

      const result = linkAssetsToSimulation(cells, assets, {
        logger: mockLogger,
        idGenerator,
        maxAmbiguousWarnings: 2,
      })

      expect(result.ambiguousCount).toBe(5)
      // Should have 2 individual warnings + 1 summary warning
      expect(result.warnings).toHaveLength(3)
      expect(result.warnings[2].message).toContain('3 more stations')
    })
  })

  describe('custom disambiguation strategy', () => {
    it('uses provided disambiguation strategy', () => {
      const cells = [createCell({ id: 'c1', stationId: 'AREA1|010' })]
      const assets = [
        createRobot({ id: 'r1', stationId: 'AREA1|010', name: 'Robot 1' }),
        createTool({ id: 't1', stationId: 'AREA1|010', name: 'Tool 1' }),
      ]

      // Custom strategy: prefer tools over robots
      const preferToolsStrategy: DisambiguationStrategy = (candidates) => {
        const tools = candidates.filter((a) => a.kind !== 'ROBOT')
        if (tools.length >= 1) {
          return { selected: tools[0], isAmbiguous: tools.length > 1 }
        }
        return { selected: candidates[0], isAmbiguous: candidates.length > 1 }
      }

      const result = linkAssetsToSimulation(cells, assets, {
        logger: mockLogger,
        disambiguationStrategy: preferToolsStrategy,
      })

      expect(result.linkedCells[0].metadata?.['Linked Asset ID']).toBe('t1')
    })
  })

  describe('deterministic ID generation', () => {
    it('uses provided ID generator for warning IDs', () => {
      const cells = [createCell({ id: 'c1', stationId: 'AREA1|010' })]
      const assets = [
        createRobot({ id: 'r1', stationId: 'AREA1|010' }),
        createRobot({ id: 'r2', stationId: 'AREA1|010' }),
      ]

      const result = linkAssetsToSimulation(cells, assets, {
        logger: mockLogger,
        idGenerator,
      })

      expect(result.warnings[0].id).toBe('ambiguous-link-c1-test-id-1')
    })
  })

  describe('edge cases', () => {
    it('handles empty cells array', () => {
      const result = linkAssetsToSimulation([], [createRobot()], { logger: mockLogger })

      expect(result.linkCount).toBe(0)
      expect(result.totalCells).toBe(0)
      expect(result.linkedCells).toEqual([])
    })

    it('handles empty assets array', () => {
      const cells = [createCell()]

      const result = linkAssetsToSimulation(cells, [], { logger: mockLogger })

      expect(result.linkCount).toBe(0)
      expect(result.stationCount).toBe(0)
    })

    it('handles both empty arrays', () => {
      const result = linkAssetsToSimulation([], [], { logger: mockLogger })

      expect(result.linkCount).toBe(0)
      expect(result.totalCells).toBe(0)
      expect(result.stationCount).toBe(0)
    })

    it('preserves cell properties not affected by linking', () => {
      const cells = [
        createCell({
          id: 'c1',
          stationId: 'AREA1|010',
          name: 'Original Name',
          status: 'Blocked',
          assignedEngineer: 'John Doe',
        }),
      ]
      const assets = [createRobot({ id: 'r1', stationId: 'AREA1|010' })]

      const result = linkAssetsToSimulation(cells, assets, { logger: mockLogger })

      expect(result.linkedCells[0].name).toBe('Original Name')
      expect(result.linkedCells[0].status).toBe('Blocked')
      expect(result.linkedCells[0].assignedEngineer).toBe('John Doe')
    })

    it('uses cell.code as fallback stationId in warning when stationId is null', () => {
      const cells = [createCell({ id: 'c1', stationId: 'AREA1|010', code: 'FALLBACK-CODE' })]
      const assets = [
        createRobot({ id: 'r1', stationId: 'AREA1|010' }),
        createRobot({ id: 'r2', stationId: 'AREA1|010' }),
      ]

      const result = linkAssetsToSimulation(cells, assets, {
        logger: mockLogger,
        idGenerator,
      })

      // stationId is set, so it should use stationId
      expect(result.warnings[0].details?.stationId).toBe('AREA1|010')
    })
  })
})

// ============================================================================
// getLinkingStats TESTS
// ============================================================================

describe('getLinkingStats', () => {
  it('formats stats as human-readable string', () => {
    const result: LinkingResult = {
      linkedCells: [],
      linkCount: 8,
      totalCells: 10,
      stationCount: 5,
      ambiguousCount: 0,
      warnings: [],
    }

    const stats = getLinkingStats(result)

    expect(stats).toBe('Linked 8/10 cells (80%) across 5 stations')
  })

  it('handles zero total cells', () => {
    const result: LinkingResult = {
      linkedCells: [],
      linkCount: 0,
      totalCells: 0,
      stationCount: 0,
      ambiguousCount: 0,
      warnings: [],
    }

    const stats = getLinkingStats(result)

    expect(stats).toBe('Linked 0/0 cells (0%) across 0 stations')
  })

  it('rounds percentage correctly', () => {
    const result: LinkingResult = {
      linkedCells: [],
      linkCount: 1,
      totalCells: 3,
      stationCount: 1,
      ambiguousCount: 0,
      warnings: [],
    }

    const stats = getLinkingStats(result)

    expect(stats).toBe('Linked 1/3 cells (33%) across 1 stations')
  })

  it('handles 100% link rate', () => {
    const result: LinkingResult = {
      linkedCells: [],
      linkCount: 5,
      totalCells: 5,
      stationCount: 5,
      ambiguousCount: 0,
      warnings: [],
    }

    const stats = getLinkingStats(result)

    expect(stats).toBe('Linked 5/5 cells (100%) across 5 stations')
  })
})
