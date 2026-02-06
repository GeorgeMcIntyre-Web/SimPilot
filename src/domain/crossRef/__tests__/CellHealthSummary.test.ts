// Cell Health Summary Tests
// Tests for the health summary layer that transforms CellSnapshot into UI-ready data

import { describe, it, expect } from 'vitest'
import { summarizeCellHealth, buildCellHealthSummaries } from '../CellHealthSummary'
import { CellSnapshot, CrossRefFlag, SimulationStatusSnapshot } from '../CrossRefTypes'

// ============================================================================
// TEST HELPERS
// ============================================================================

const makeCell = (partial: Partial<CellSnapshot>): CellSnapshot => ({
  stationKey: partial.stationKey || 'ST_010',
  displayCode: partial.displayCode || partial.stationKey || 'ST_010',
  areaKey: partial.areaKey,
  simulationStatus: partial.simulationStatus,
  tools: partial.tools || [],
  robots: partial.robots || [],
  weldGuns: partial.weldGuns || [],
  gunForces: partial.gunForces || [],
  risers: partial.risers || [],
  flags: partial.flags || [],
})

const makeSimStatus = (partial: Partial<SimulationStatusSnapshot>): SimulationStatusSnapshot => ({
  stationKey: partial.stationKey || '010',
  areaKey: partial.areaKey,
  firstStageCompletion: partial.firstStageCompletion,
  finalDeliverablesCompletion: partial.finalDeliverablesCompletion,
  dcsConfigured: partial.dcsConfigured,
  raw: partial.raw || {},
})

// ============================================================================
// TESTS
// ============================================================================

describe('CellHealthSummary', () => {
  describe('summarizeCellHealth', () => {
    it('summarizes a clean, fully configured cell as OK', () => {
      const cell = makeCell({
        stationKey: '010',
        areaKey: 'UB',
        simulationStatus: makeSimStatus({
          stationKey: '010',
          areaKey: 'UB',
          firstStageCompletion: 100,
          finalDeliverablesCompletion: 100,
          dcsConfigured: true,
        }),
        tools: [{} as any, {} as any],
        robots: [{} as any],
        weldGuns: [{} as any],
        gunForces: [{} as any],
        risers: [{} as any],
        flags: [],
      })

      const summary = summarizeCellHealth(cell)

      expect(summary.stationKey).toBe('010')
      expect(summary.areaKey).toBe('UB')
      expect(summary.hasSimulationStatus).toBe(true)
      expect(summary.firstStageCompletion).toBe(100)
      expect(summary.finalDeliverablesCompletion).toBe(100)
      expect(summary.dcsConfigured).toBe(true)

      expect(summary.robotCount).toBe(1)
      expect(summary.toolCount).toBe(2)
      expect(summary.weldGunCount).toBe(1)
      expect(summary.gunForceCount).toBe(1)
      expect(summary.riserCount).toBe(1)

      expect(summary.riskLevel).toBe('OK')
      expect(summary.flags.length).toBe(0)
      expect(summary.criticalReasons.length).toBe(0)
      expect(summary.warningReasons.length).toBe(0)
    })

    it('marks a station with warnings as AT_RISK', () => {
      const warningFlag: CrossRefFlag = {
        type: 'STATION_WITHOUT_SIMULATION_STATUS',
        stationKey: 'GHOST',
        message: 'Missing simulation status',
        severity: 'WARNING',
      }

      const cell = makeCell({
        stationKey: 'GHOST',
        flags: [warningFlag],
      })

      const summary = summarizeCellHealth(cell)

      expect(summary.hasSimulationStatus).toBe(false)
      expect(summary.riskLevel).toBe('AT_RISK')
      expect(summary.warningReasons.length).toBe(1)
      expect(summary.warningReasons[0]).toContain('Missing simulation status')
      expect(summary.criticalReasons.length).toBe(0)
    })

    it('marks a station with any ERROR as CRITICAL', () => {
      const errorFlag: CrossRefFlag = {
        type: 'DUPLICATE_STATION_DEFINITION',
        stationKey: '010',
        message: 'Duplicate station definition',
        severity: 'ERROR',
      }

      const warningFlag: CrossRefFlag = {
        type: 'STATION_WITHOUT_SIMULATION_STATUS',
        stationKey: '010',
        message: 'Missing simulation status',
        severity: 'WARNING',
      }

      const cell = makeCell({
        stationKey: '010',
        flags: [warningFlag, errorFlag],
      })

      const summary = summarizeCellHealth(cell)

      expect(summary.riskLevel).toBe('CRITICAL')
      expect(summary.criticalReasons.length).toBe(1)
      expect(summary.criticalReasons[0]).toContain('Duplicate station definition')
      expect(summary.warningReasons.length).toBe(1)
    })

    it('handles multiple warnings correctly', () => {
      const warningFlag1: CrossRefFlag = {
        type: 'TOOL_WITHOUT_OWNER',
        stationKey: '020',
        message: 'Tool has no owner',
        severity: 'WARNING',
      }

      const warningFlag2: CrossRefFlag = {
        type: 'ROBOT_MISSING_DRESS_PACK_INFO',
        stationKey: '020',
        robotKey: 'R-001',
        message: 'Robot missing dress pack',
        severity: 'WARNING',
      }

      const cell = makeCell({
        stationKey: '020',
        simulationStatus: makeSimStatus({ stationKey: '020' }),
        flags: [warningFlag1, warningFlag2],
      })

      const summary = summarizeCellHealth(cell)

      expect(summary.riskLevel).toBe('AT_RISK')
      expect(summary.warningReasons.length).toBe(2)
      expect(summary.criticalReasons.length).toBe(0)
    })

    it('handles multiple errors correctly', () => {
      const errorFlag1: CrossRefFlag = {
        type: 'DUPLICATE_STATION_DEFINITION',
        stationKey: '030',
        message: 'Duplicate station',
        severity: 'ERROR',
      }

      const errorFlag2: CrossRefFlag = {
        type: 'AMBIGUOUS_ROBOT_MATCH',
        stationKey: '030',
        robotKey: 'R-002',
        message: 'Ambiguous robot match',
        severity: 'ERROR',
      }

      const cell = makeCell({
        stationKey: '030',
        flags: [errorFlag1, errorFlag2],
      })

      const summary = summarizeCellHealth(cell)

      expect(summary.riskLevel).toBe('CRITICAL')
      expect(summary.criticalReasons.length).toBe(2)
      expect(summary.warningReasons.length).toBe(0)
    })

    it('handles cell without simulation status', () => {
      const cell = makeCell({
        stationKey: '040',
        simulationStatus: undefined,
      })

      const summary = summarizeCellHealth(cell)

      expect(summary.hasSimulationStatus).toBe(false)
      expect(summary.firstStageCompletion).toBeUndefined()
      expect(summary.finalDeliverablesCompletion).toBeUndefined()
      expect(summary.dcsConfigured).toBeUndefined()
    })

    it('handles partial completion values', () => {
      const cell = makeCell({
        stationKey: '050',
        simulationStatus: makeSimStatus({
          stationKey: '050',
          firstStageCompletion: 75,
          finalDeliverablesCompletion: undefined,
          dcsConfigured: false,
        }),
      })

      const summary = summarizeCellHealth(cell)

      expect(summary.firstStageCompletion).toBe(75)
      expect(summary.finalDeliverablesCompletion).toBeUndefined()
      expect(summary.dcsConfigured).toBe(false)
    })

    it('handles NaN completion values', () => {
      const cell = makeCell({
        stationKey: '060',
        simulationStatus: makeSimStatus({
          stationKey: '060',
          firstStageCompletion: NaN,
        }),
      })

      const summary = summarizeCellHealth(cell)

      expect(summary.firstStageCompletion).toBeUndefined()
    })

    it('handles zero asset counts', () => {
      const cell = makeCell({
        stationKey: '070',
        tools: [],
        robots: [],
        weldGuns: [],
        gunForces: [],
        risers: [],
      })

      const summary = summarizeCellHealth(cell)

      expect(summary.robotCount).toBe(0)
      expect(summary.toolCount).toBe(0)
      expect(summary.weldGunCount).toBe(0)
      expect(summary.gunForceCount).toBe(0)
      expect(summary.riserCount).toBe(0)
    })
  })

  describe('buildCellHealthSummaries', () => {
    it('returns an empty list when building summaries for no cells', () => {
      const result = buildCellHealthSummaries([])
      expect(result.length).toBe(0)
    })

    it('builds summaries for multiple cells', () => {
      const cells = [
        makeCell({ stationKey: '100' }),
        makeCell({ stationKey: '110' }),
        makeCell({ stationKey: '120' }),
      ]

      const result = buildCellHealthSummaries(cells)

      expect(result.length).toBe(3)
      expect(result[0].stationKey).toBe('100')
      expect(result[1].stationKey).toBe('110')
      expect(result[2].stationKey).toBe('120')
    })

    it('preserves risk levels across cells', () => {
      const okCell = makeCell({
        stationKey: '200',
        simulationStatus: makeSimStatus({ stationKey: '200' }),
        flags: [],
      })

      const atRiskCell = makeCell({
        stationKey: '210',
        flags: [
          {
            type: 'TOOL_WITHOUT_OWNER',
            stationKey: '210',
            message: 'No owner',
            severity: 'WARNING',
          },
        ],
      })

      const criticalCell = makeCell({
        stationKey: '220',
        flags: [
          {
            type: 'DUPLICATE_STATION_DEFINITION',
            stationKey: '220',
            message: 'Duplicate',
            severity: 'ERROR',
          },
        ],
      })

      const result = buildCellHealthSummaries([okCell, atRiskCell, criticalCell])

      expect(result[0].riskLevel).toBe('OK')
      expect(result[1].riskLevel).toBe('AT_RISK')
      expect(result[2].riskLevel).toBe('CRITICAL')
    })
  })
})
