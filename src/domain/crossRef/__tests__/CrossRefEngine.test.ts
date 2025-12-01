// Cross-Reference Engine Tests
// Tests for the cross-reference engine that unifies ingested data

import { describe, it, expect } from 'vitest'
import { buildCrossRef } from '../CrossRefEngine'
import {
  CrossRefInput,
  SimulationStatusSnapshot,
  ToolSnapshot,
  RobotSnapshot,
  WeldGunSnapshot,
  GunForceSnapshot,
  RiserSnapshot
} from '../CrossRefTypes'

// ============================================================================
// TEST HELPERS
// ============================================================================

const emptyInput: CrossRefInput = {
  simulationStatusRows: [],
  toolingRows: [],
  robotSpecsRows: [],
  weldGunRows: [],
  gunForceRows: [],
  riserRows: []
}

const createSimStatus = (
  stationKey: string,
  overrides: Partial<SimulationStatusSnapshot> = {}
): SimulationStatusSnapshot => ({
  stationKey,
  raw: {},
  ...overrides
})

const createTool = (
  stationKey: string,
  overrides: Partial<ToolSnapshot> = {}
): ToolSnapshot => ({
  stationKey,
  raw: {},
  ...overrides
})

const createRobot = (
  stationKey: string,
  robotKey: string,
  overrides: Partial<RobotSnapshot> = {}
): RobotSnapshot => ({
  stationKey,
  robotKey,
  hasDressPackInfo: false,
  raw: {},
  ...overrides
})

const createWeldGun = (
  stationKey: string,
  gunKey: string,
  overrides: Partial<WeldGunSnapshot> = {}
): WeldGunSnapshot => ({
  stationKey,
  gunKey,
  raw: {},
  ...overrides
})

const createGunForce = (
  gunKey: string,
  overrides: Partial<GunForceSnapshot> = {}
): GunForceSnapshot => ({
  gunKey,
  raw: {},
  ...overrides
})

const createRiser = (
  stationKey: string,
  overrides: Partial<RiserSnapshot> = {}
): RiserSnapshot => ({
  stationKey,
  raw: {},
  ...overrides
})

// ============================================================================
// BASIC TESTS
// ============================================================================

describe('CrossRefEngine', () => {
  describe('empty input', () => {
    it('should handle empty input gracefully', () => {
      const result = buildCrossRef(emptyInput)

      expect(result.cells).toHaveLength(0)
      expect(result.globalFlags).toHaveLength(0)
      expect(result.stats.totalCells).toBe(0)
      expect(result.stats.cellsWithRisks).toBe(0)
      expect(result.stats.totalFlags).toBe(0)
    })
  })

  describe('station unification', () => {
    it('should unify a perfect match station', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [
          createSimStatus('STATION 010', {
            areaKey: 'UB',
            firstStageCompletion: 100
          })
        ],
        toolingRows: [
          createTool('010', { simLeader: 'Werner' })
        ],
        weldGunRows: [
          createWeldGun('010', 'G100')
        ],
        gunForceRows: [
          createGunForce('G100', { requiredForce: 5000 })
        ]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '010')

      expect(cell).toBeDefined()
      expect(cell?.simulationStatus).toBeDefined()
      expect(cell?.tools.length).toBe(1)
      expect(cell?.weldGuns.length).toBe(1)
      expect(cell?.gunForces.length).toBe(1)
      expect(cell?.flags.length).toBe(0)
    })

    it('should normalize station IDs for matching', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [
          createSimStatus('STATION 020')
        ],
        toolingRows: [
          createTool('St. 020', { simLeader: 'John' })
        ],
        robotSpecsRows: [
          createRobot('020', 'R-001', { hasDressPackInfo: true })
        ]
      }

      const result = buildCrossRef(input)

      // Should have exactly one cell, not three
      expect(result.cells.length).toBe(1)

      const cell = result.cells[0]
      expect(cell.simulationStatus).toBeDefined()
      expect(cell.tools.length).toBe(1)
      expect(cell.robots.length).toBe(1)
    })

    it('should handle OP- prefix in station IDs', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [
          createSimStatus('OP-30')
        ],
        toolingRows: [
          createTool('30', { simLeader: 'Alice' })
        ]
      }

      const result = buildCrossRef(input)

      expect(result.cells.length).toBe(1)
      expect(result.cells[0].tools.length).toBe(1)
    })
  })

  describe('gun force linking', () => {
    it('should flag missing gun force', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('020')],
        weldGunRows: [createWeldGun('020', 'G_MISSING')],
        gunForceRows: []
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '020')

      expect(cell).toBeDefined()
      expect(cell?.weldGuns.length).toBe(1)
      expect(cell?.gunForces.length).toBe(0)

      const flag = cell?.flags.find(f => f.type === 'MISSING_GUN_FORCE_FOR_WELD_GUN')
      expect(flag).toBeDefined()
      expect(flag?.gunKey).toBe('G_MISSING')
    })

    it('should link gun force to weld gun', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('030')],
        weldGunRows: [createWeldGun('030', 'G200')],
        gunForceRows: [createGunForce('G200', { requiredForce: 4500 })]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '030')

      expect(cell?.gunForces.length).toBe(1)
      expect(cell?.gunForces[0].requiredForce).toBe(4500)
      expect(cell?.flags.length).toBe(0)
    })

    it('should handle ambiguous gun force matches', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('030')],
        weldGunRows: [createWeldGun('030', 'G_DUP')],
        gunForceRows: [
          createGunForce('G_DUP', { requiredForce: 100 }),
          createGunForce('G_DUP', { requiredForce: 200 })
        ]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '030')

      // Both gun forces should be attached
      expect(cell?.gunForces.length).toBe(2)

      // Should flag as ambiguous
      const flag = cell?.flags.find(f => f.type === 'AMBIGUOUS_GUN_MATCH')
      expect(flag).toBeDefined()
    })
  })

  describe('validation flags', () => {
    it('should flag station without simulation status', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [],
        toolingRows: [createTool('GHOST_STATION', { simLeader: 'Bob' })]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === 'GHOST_STATION')

      expect(cell).toBeDefined()
      expect(cell?.simulationStatus).toBeUndefined()

      const flag = cell?.flags.find(f => f.type === 'STATION_WITHOUT_SIMULATION_STATUS')
      expect(flag).toBeDefined()
    })

    it('should flag robot without dress pack info', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('040')],
        robotSpecsRows: [
          createRobot('040', 'R-002', { hasDressPackInfo: false })
        ]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '040')

      const flag = cell?.flags.find(f => f.type === 'ROBOT_MISSING_DRESS_PACK_INFO')
      expect(flag).toBeDefined()
      expect(flag?.robotKey).toBe('R_002')
    })

    it('should not flag robot with dress pack info', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('050')],
        robotSpecsRows: [
          createRobot('050', 'R-003', { hasDressPackInfo: true })
        ]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '050')

      const flag = cell?.flags.find(f => f.type === 'ROBOT_MISSING_DRESS_PACK_INFO')
      expect(flag).toBeUndefined()
    })

    it('should flag tool without owner', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('060')],
        toolingRows: [
          createTool('060', { simLeader: undefined, teamLeader: undefined })
        ]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '060')

      const flag = cell?.flags.find(f => f.type === 'TOOL_WITHOUT_OWNER')
      expect(flag).toBeDefined()
    })

    it('should not flag tool with sim leader', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('070')],
        toolingRows: [createTool('070', { simLeader: 'Dale' })]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '070')

      const flag = cell?.flags.find(f => f.type === 'TOOL_WITHOUT_OWNER')
      expect(flag).toBeUndefined()
    })

    it('should not flag tool with team leader', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('080')],
        toolingRows: [createTool('080', { teamLeader: 'Carol' })]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '080')

      const flag = cell?.flags.find(f => f.type === 'TOOL_WITHOUT_OWNER')
      expect(flag).toBeUndefined()
    })
  })

  describe('risers', () => {
    it('should attach risers to cells', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('090')],
        riserRows: [
          createRiser('090', { brand: 'ACME', height: 500 })
        ]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '090')

      expect(cell?.risers.length).toBe(1)
      expect(cell?.risers[0].brand).toBe('ACME')
      expect(cell?.risers[0].height).toBe(500)
    })
  })

  describe('statistics', () => {
    it('should calculate correct statistics', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [
          createSimStatus('100'),
          createSimStatus('110')
        ],
        toolingRows: [
          createTool('100', { simLeader: 'A' }),
          createTool('110', { simLeader: 'B' }),
          createTool('110', { simLeader: 'C' })
        ],
        robotSpecsRows: [
          createRobot('100', 'R-100', { hasDressPackInfo: true }),
          createRobot('110', 'R-110', { hasDressPackInfo: false }) // Will flag
        ],
        weldGunRows: [
          createWeldGun('100', 'G100')
        ],
        gunForceRows: [
          createGunForce('G100', { requiredForce: 1000 })
        ],
        riserRows: [
          createRiser('100', { height: 300 })
        ]
      }

      const result = buildCrossRef(input)

      expect(result.stats.totalCells).toBe(2)
      expect(result.stats.robotCount).toBe(2)
      expect(result.stats.toolCount).toBe(3)
      expect(result.stats.weldGunCount).toBe(1)
      expect(result.stats.riserCount).toBe(1)
      expect(result.stats.cellsWithRisks).toBe(1) // Station 110 has robot without dress pack
      expect(result.stats.totalFlags).toBe(1)
    })
  })

  describe('complex scenarios', () => {
    it('should handle multiple assets per station', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        simulationStatusRows: [createSimStatus('200')],
        robotSpecsRows: [
          createRobot('200', 'R-A', { hasDressPackInfo: true }),
          createRobot('200', 'R-B', { hasDressPackInfo: true }),
          createRobot('200', 'R-C', { hasDressPackInfo: true })
        ],
        weldGunRows: [
          createWeldGun('200', 'G-A'),
          createWeldGun('200', 'G-B')
        ],
        gunForceRows: [
          createGunForce('G-A', { requiredForce: 1000 }),
          createGunForce('G-B', { requiredForce: 2000 })
        ]
      }

      const result = buildCrossRef(input)
      const cell = result.cells.find(c => c.stationKey === '200')

      expect(cell?.robots.length).toBe(3)
      expect(cell?.weldGuns.length).toBe(2)
      expect(cell?.gunForces.length).toBe(2)
      expect(cell?.flags.length).toBe(0)
    })

    it('should handle stations from different sources only', () => {
      const input: CrossRefInput = {
        ...emptyInput,
        // No simulation status, only assets
        toolingRows: [createTool('ASSET_ONLY_1', { simLeader: 'X' })],
        robotSpecsRows: [createRobot('ASSET_ONLY_2', 'R-X', { hasDressPackInfo: true })],
        weldGunRows: [createWeldGun('ASSET_ONLY_3', 'G-X')],
        gunForceRows: [createGunForce('G-X', { requiredForce: 500 })]
      }

      const result = buildCrossRef(input)

      // Should have 3 distinct cells
      expect(result.cells.length).toBe(3)

      // All should be flagged as missing simulation status
      const flaggedCells = result.cells.filter(
        c => c.flags.some(f => f.type === 'STATION_WITHOUT_SIMULATION_STATUS')
      )
      expect(flaggedCells.length).toBe(3)
    })
  })
})
