import { describe, it, expect, beforeEach } from 'vitest'
import { getProjectMetrics } from '../../derivedMetrics'
import { makeProject, makeArea, makeCell, seedStore, clearStore } from './helpers'

describe('getProjectMetrics', () => {
  beforeEach(() => clearStore())

  it('returns correct metrics for a project with cells', () => {
    const project = makeProject({ id: 'proj-1' })
    const area = makeArea({ id: 'area-1', projectId: 'proj-1' })
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
        projectId: 'proj-1',
        areaId: 'area-1',
        code: '020',
        simulation: {
          percentComplete: 75,
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

    seedStore({ projects: [project], areas: [area], cells })

    const metrics = getProjectMetrics('proj-1')

    expect(metrics.projectId).toBe('proj-1')
    expect(metrics.cellCount).toBe(3)
    expect(metrics.avgCompletion).toBe(75)
    expect(metrics.atRiskCellsCount).toBe(2)
  })

  it('returns null avgCompletion when no cells have simulation data', () => {
    const project = makeProject({ id: 'proj-1' })
    const area = makeArea({ id: 'area-1', projectId: 'proj-1' })
    const cells = [
      makeCell({
        id: 'cell-1',
        projectId: 'proj-1',
        areaId: 'area-1',
        status: 'NotStarted',
        simulation: undefined,
      }),
    ]

    seedStore({ projects: [project], areas: [area], cells })

    const metrics = getProjectMetrics('proj-1')

    expect(metrics.projectId).toBe('proj-1')
    expect(metrics.cellCount).toBe(1)
    expect(metrics.avgCompletion).toBeNull()
    expect(metrics.atRiskCellsCount).toBe(0)
  })
})
