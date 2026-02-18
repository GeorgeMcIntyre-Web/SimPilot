import { describe, it, expect, beforeEach } from 'vitest'
import { getGlobalSimulationMetrics } from '../../derivedMetrics'
import { makeProject, makeArea, makeCell, seedStore, clearStore } from './helpers'

describe('getGlobalSimulationMetrics', () => {
  beforeEach(() => clearStore())

  it('returns correct global metrics across all projects', () => {
    const projects = [
      makeProject({ id: 'proj-1', name: 'Project 1' }),
      makeProject({ id: 'proj-2', name: 'Project 2' }),
    ]

    const areas = [
      makeArea({ id: 'area-1', projectId: 'proj-1', name: 'Area 1' }),
      makeArea({ id: 'area-2', projectId: 'proj-2', name: 'Area 2' }),
    ]

    const cells = [
      makeCell({
        id: 'cell-1',
        projectId: 'proj-1',
        areaId: 'area-1',
        simulation: {
          percentComplete: 100,
          hasIssues: false,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 1,
        },
      }),
      makeCell({
        id: 'cell-2',
        projectId: 'proj-2',
        areaId: 'area-2',
        code: '020',
        status: 'Blocked',
        simulation: {
          percentComplete: 70,
          hasIssues: true,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 2,
        },
      }),
      makeCell({
        id: 'cell-3',
        projectId: 'proj-1',
        areaId: 'area-1',
        code: '030',
        simulation: {
          percentComplete: 50,
          hasIssues: false,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 3,
        },
      }),
    ]

    seedStore({ projects, areas, cells })

    const globalMetrics = getGlobalSimulationMetrics()

    expect(globalMetrics.totalProjects).toBe(2)
    expect(globalMetrics.totalCells).toBe(3)
    expect(globalMetrics.avgCompletion).toBe(73)
    expect(globalMetrics.atRiskCellsCount).toBe(2)
  })

  it('handles empty store', () => {
    const globalMetrics = getGlobalSimulationMetrics()

    expect(globalMetrics.totalProjects).toBe(0)
    expect(globalMetrics.totalCells).toBe(0)
    expect(globalMetrics.avgCompletion).toBeNull()
    expect(globalMetrics.atRiskCellsCount).toBe(0)
  })
})
