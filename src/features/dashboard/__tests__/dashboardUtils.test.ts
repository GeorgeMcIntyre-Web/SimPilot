// Dashboard Utils Tests
// Tests for pure utility functions used in the dashboard

import { describe, it, expect } from 'vitest'
import {
  getRiskLevel,
  getStatusText,
  getCompletionPercent,
  getHealthScore,
  countByRisk,
  filterByStatus,
  filterByArea,
  filterBySearch,
  getApplicationDisplay,
  sortCells,
  generateFocusItems,
} from '../dashboardUtils'
import {
  CellSnapshot,
  CrossRefFlag,
  RobotSnapshot,
  SimulationStatusSnapshot,
  ToolSnapshot,
} from '../../../domain/crossRef/CrossRefTypes'

// ============================================================================
// TEST HELPERS
// ============================================================================

const makeCell = (partial: Partial<CellSnapshot>): CellSnapshot => ({
  stationKey: partial.stationKey ?? 'ST_010',
  displayCode: partial.displayCode ?? partial.stationKey ?? 'ST_010',
  areaKey: partial.areaKey,
  simulationStatus: partial.simulationStatus,
  tools: partial.tools ?? [],
  robots: partial.robots ?? [],
  weldGuns: partial.weldGuns ?? [],
  gunForces: partial.gunForces ?? [],
  risers: partial.risers ?? [],
  flags: partial.flags ?? [],
})

const makeSimStatus = (partial: Partial<SimulationStatusSnapshot>): SimulationStatusSnapshot => ({
  stationKey: partial.stationKey ?? '010',
  areaKey: partial.areaKey,
  hasIssues: partial.hasIssues,
  firstStageCompletion: partial.firstStageCompletion,
  finalDeliverablesCompletion: partial.finalDeliverablesCompletion,
  application: partial.application,
  raw: partial.raw ?? {},
})

const makeWarningFlag = (type: string, stationKey: string): CrossRefFlag => ({
  type: type as CrossRefFlag['type'],
  stationKey,
  message: `Warning: ${type}`,
  severity: 'WARNING',
})

const makeErrorFlag = (type: string, stationKey: string): CrossRefFlag => ({
  type: type as CrossRefFlag['type'],
  stationKey,
  message: `Error: ${type}`,
  severity: 'ERROR',
})

const makeRobot = (code: string | null): RobotSnapshot => ({
  stationKey: '010',
  robotKey: `robot-${code ?? 'none'}`,
  caption: 'R1',
  eNumber: undefined,
  hasDressPackInfo: true,
  oemModel: undefined,
  raw: code ? { metadata: { Code: code } } : {},
})

const makeTool = (code: string | null): ToolSnapshot => ({
  stationKey: '010',
  areaKey: undefined,
  toolId: 'tool-1',
  simLeader: undefined,
  simEmployee: undefined,
  teamLeader: undefined,
  simDueDate: undefined,
  toolType: 'OTHER',
  raw: code ? { metadata: { applicationCode: code } } : {},
})

// ============================================================================
// TESTS
// ============================================================================

describe('dashboardUtils', () => {
  describe('getRiskLevel', () => {
    it('returns OK for cells with no flags', () => {
      const cell = makeCell({ flags: [] })
      expect(getRiskLevel(cell)).toBe('OK')
    })

    it('returns AT_RISK for cells with only warnings', () => {
      const cell = makeCell({ flags: [makeWarningFlag('TOOL_WITHOUT_OWNER', 'ST_010')] })
      expect(getRiskLevel(cell)).toBe('AT_RISK')
    })

    it('returns CRITICAL for cells with any errors', () => {
      const flags = [
        makeWarningFlag('TOOL_WITHOUT_OWNER', 'ST_010'),
        makeErrorFlag('DUPLICATE_STATION_DEFINITION', 'ST_010'),
      ]
      const cell = makeCell({ flags })
      expect(getRiskLevel(cell)).toBe('CRITICAL')
    })

    it('returns AT_RISK when simulation has issues even without flags', () => {
      const cell = makeCell({
        flags: [],
        simulationStatus: makeSimStatus({ hasIssues: true, firstStageCompletion: 80 }),
      })
      expect(getRiskLevel(cell)).toBe('AT_RISK')
    })

    it('returns AT_RISK for very low completion without other signals', () => {
      const cell = makeCell({
        flags: [],
        simulationStatus: makeSimStatus({ firstStageCompletion: 20 }),
      })
      expect(getRiskLevel(cell)).toBe('AT_RISK')
    })
  })

  describe('getStatusText', () => {
    it('returns correct text for each risk level', () => {
      expect(getStatusText('OK')).toBe('On Track')
      expect(getStatusText('AT_RISK')).toBe('At Risk')
      expect(getStatusText('CRITICAL')).toBe('Blocked')
    })
  })

  describe('getCompletionPercent', () => {
    it('returns null for cells without simulation status', () => {
      const cell = makeCell({ stationKey: 'ST_010' })
      expect(getCompletionPercent(cell)).toBeNull()
    })

    it('returns rounded completion percentage', () => {
      const cell = makeCell({
        stationKey: 'ST_010',
        simulationStatus: makeSimStatus({ firstStageCompletion: 85.7 }),
      })
      expect(getCompletionPercent(cell)).toBe(86)
    })

    it('returns null for undefined completion', () => {
      const cell = makeCell({
        stationKey: 'ST_010',
        simulationStatus: makeSimStatus({ firstStageCompletion: undefined }),
      })
      expect(getCompletionPercent(cell)).toBeNull()
    })
  })

  describe('getHealthScore', () => {
    it('returns 100 for cells with no flags', () => {
      const cell = makeCell({ flags: [] })
      expect(getHealthScore(cell)).toBe(100)
    })

    it('penalizes cells with flags', () => {
      const cell = makeCell({
        flags: [makeWarningFlag('TOOL_WITHOUT_OWNER', 'ST_010')],
      })
      expect(getHealthScore(cell)).toBe(85)
    })

    it('clamps score to minimum of 0', () => {
      const manyFlags = Array(10)
        .fill(null)
        .map(() => makeWarningFlag('TOOL_WITHOUT_OWNER', 'ST_010'))
      const cell = makeCell({ flags: manyFlags })
      expect(getHealthScore(cell)).toBe(0)
    })
  })

  describe('countByRisk', () => {
    it('counts cells by risk level', () => {
      const cells = [
        makeCell({ stationKey: 'ST_001', flags: [] }),
        makeCell({ stationKey: 'ST_002', flags: [] }),
        makeCell({
          stationKey: 'ST_003',
          flags: [makeWarningFlag('TOOL_WITHOUT_OWNER', 'ST_003')],
        }),
        makeCell({
          stationKey: 'ST_004',
          flags: [makeErrorFlag('DUPLICATE_STATION_DEFINITION', 'ST_004')],
        }),
      ]

      const counts = countByRisk(cells)

      expect(counts.total).toBe(4)
      expect(counts.ok).toBe(2)
      expect(counts.atRisk).toBe(1)
      expect(counts.critical).toBe(1)
    })

    it('handles empty array', () => {
      const counts = countByRisk([])
      expect(counts.total).toBe(0)
      expect(counts.ok).toBe(0)
      expect(counts.atRisk).toBe(0)
      expect(counts.critical).toBe(0)
    })
  })

  describe('filterByStatus', () => {
    const cells = [
      makeCell({
        stationKey: 'ST_100',
        simulationStatus: makeSimStatus({ firstStageCompletion: 100 }),
      }),
      makeCell({
        stationKey: 'ST_085',
        simulationStatus: makeSimStatus({ firstStageCompletion: 85 }),
      }),
      makeCell({
        stationKey: 'ST_020',
        simulationStatus: makeSimStatus({ firstStageCompletion: 20 }),
      }),
      makeCell({ stationKey: 'ST_NULL', simulationStatus: undefined }),
    ]

    it('returns all cells for "all" filter', () => {
      expect(filterByStatus(cells, 'all').length).toBe(4)
    })

    it('filters to Complete', () => {
      const result = filterByStatus(cells, 'Complete')
      expect(result.length).toBe(1)
      expect(result[0].stationKey).toBe('ST_100')
    })

    it('filters to Nearly Complete', () => {
      const result = filterByStatus(cells, 'Nearly Complete')
      expect(result.length).toBe(1)
      expect(result[0].stationKey).toBe('ST_085')
    })

    it('filters to No data', () => {
      const result = filterByStatus(cells, 'No data')
      expect(result.length).toBe(1)
      expect(result[0].stationKey).toBe('ST_NULL')
    })
  })

  describe('filterByArea', () => {
    const cells = [
      makeCell({ stationKey: 'ST_001', areaKey: 'UB' }),
      makeCell({ stationKey: 'ST_002', areaKey: 'UB' }),
      makeCell({ stationKey: 'ST_003', areaKey: 'MB' }),
    ]

    it('returns all cells when areaKey is null', () => {
      expect(filterByArea(cells, null).length).toBe(3)
    })

    it('filters to specific area', () => {
      const result = filterByArea(cells, 'UB')
      expect(result.length).toBe(2)
      expect(result.every((c) => c.areaKey === 'UB')).toBe(true)
    })
  })

  describe('filterBySearch', () => {
    const cells = [
      makeCell({ stationKey: 'ST_010_A' }),
      makeCell({ stationKey: 'ST_020_B' }),
      makeCell({ stationKey: 'ST_030_C' }),
    ]

    it('returns all cells for empty search', () => {
      expect(filterBySearch(cells, '').length).toBe(3)
      expect(filterBySearch(cells, '  ').length).toBe(3)
    })

    it('filters by station key (case-insensitive)', () => {
      const result = filterBySearch(cells, '020')
      expect(result.length).toBe(1)
      expect(result[0].stationKey).toBe('ST_020_B')
    })
  })

  describe('getApplicationDisplay', () => {
    it('joins unique application codes from robots and tools', () => {
      const cell = makeCell({
        robots: [makeRobot('SPR'), makeRobot('MH')],
        tools: [makeTool('FDS'), makeTool('SPR')],
      })

      expect(getApplicationDisplay(cell)).toBe('SPR + MH + FDS')
    })

    it('returns dash when no application codes are available', () => {
      const cell = makeCell({
        robots: [makeRobot(null)],
        tools: [makeTool(null)],
      })

      expect(getApplicationDisplay(cell)).toBe('-')
    })
  })

  describe('sortCells', () => {
    const cells = [
      makeCell({ stationKey: 'C_Station', areaKey: 'Z' }),
      makeCell({ stationKey: 'A_Station', areaKey: 'Y' }),
      makeCell({ stationKey: 'B_Station', areaKey: 'X' }),
    ]

    it('sorts by station key ascending', () => {
      const result = sortCells(cells, 'station', 'asc')
      expect(result[0].stationKey).toBe('A_Station')
      expect(result[2].stationKey).toBe('C_Station')
    })

    it('sorts by station key descending', () => {
      const result = sortCells(cells, 'station', 'desc')
      expect(result[0].stationKey).toBe('C_Station')
      expect(result[2].stationKey).toBe('A_Station')
    })

    it('sorts by area', () => {
      const result = sortCells(cells, 'area', 'asc')
      expect(result[0].areaKey).toBe('X')
      expect(result[2].areaKey).toBe('Z')
    })

    it('sorts by aggregated application codes from assets', () => {
      const withApps = [
        makeCell({ stationKey: 'ST_200', robots: [makeRobot('MH')], tools: [] }),
        makeCell({ stationKey: 'ST_100', robots: [makeRobot('SPR')], tools: [] }),
        makeCell({ stationKey: 'ST_300', robots: [makeRobot('FDS')], tools: [] }),
      ]

      const result = sortCells(withApps, 'application', 'asc')
      expect(result.map((c) => c.stationKey)).toEqual(['ST_300', 'ST_200', 'ST_100'])
    })
  })

  describe('generateFocusItems', () => {
    it('returns empty array for cells with no issues', () => {
      const cells = [
        makeCell({
          stationKey: 'ST_001',
          simulationStatus: makeSimStatus({ stationKey: 'ST_001' }),
          flags: [],
        }),
      ]
      expect(generateFocusItems(cells).length).toBe(0)
    })

    it('generates focus item for missing simulation status', () => {
      const cells = [
        makeCell({
          stationKey: 'ST_001',
          simulationStatus: undefined,
        }),
      ]
      const items = generateFocusItems(cells)
      expect(items.some((i) => i.id === 'missing-sim-status')).toBe(true)
    })

    it('generates focus item for guns without force', () => {
      const cells = [
        makeCell({
          stationKey: 'ST_001',
          flags: [makeWarningFlag('MISSING_GUN_FORCE_FOR_WELD_GUN', 'ST_001')],
        }),
      ]
      const items = generateFocusItems(cells)
      expect(items.some((i) => i.id === 'guns-without-force')).toBe(true)
    })

    it('generates focus item for robots missing dress pack', () => {
      const cells = [
        makeCell({
          stationKey: 'ST_001',
          flags: [makeWarningFlag('ROBOT_MISSING_DRESS_PACK_INFO', 'ST_001')],
        }),
      ]
      const items = generateFocusItems(cells)
      expect(items.some((i) => i.id === 'robots-missing-dress-pack')).toBe(true)
    })

    it('limits focus items to 4', () => {
      const cells = [
        makeCell({ stationKey: 'ST_001', simulationStatus: undefined }),
        makeCell({
          stationKey: 'ST_002',
          flags: [makeWarningFlag('MISSING_GUN_FORCE_FOR_WELD_GUN', 'ST_002')],
        }),
        makeCell({
          stationKey: 'ST_003',
          flags: [makeWarningFlag('ROBOT_MISSING_DRESS_PACK_INFO', 'ST_003')],
        }),
        makeCell({
          stationKey: 'ST_004',
          flags: [makeWarningFlag('TOOL_WITHOUT_OWNER', 'ST_004')],
        }),
        makeCell({
          stationKey: 'ST_005',
          flags: [makeErrorFlag('DUPLICATE_STATION_DEFINITION', 'ST_005')],
        }),
      ]
      const items = generateFocusItems(cells)
      expect(items.length).toBeLessThanOrEqual(4)
    })
  })
})
