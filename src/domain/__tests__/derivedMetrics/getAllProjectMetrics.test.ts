import { describe, it, expect, beforeEach } from 'vitest'
import { getAllProjectMetrics } from '../../derivedMetrics'
import { makeProject, makeArea, makeCell, seedStore, clearStore } from './helpers'

describe('getAllProjectMetrics', () => {
  beforeEach(() => clearStore())

  it('returns metrics for all projects', () => {
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
          percentComplete: 90,
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
        simulation: {
          percentComplete: 60,
          hasIssues: false,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 2,
        },
      }),
    ]

    seedStore({ projects, areas, cells })

    const allMetrics = getAllProjectMetrics()

    expect(allMetrics).toHaveLength(2)
    const proj1 = allMetrics.find((m) => m.projectId === 'proj-1')
    const proj2 = allMetrics.find((m) => m.projectId === 'proj-2')

    expect(proj1?.avgCompletion).toBe(90)
    expect(proj2?.avgCompletion).toBe(60)
    expect(proj2?.atRiskCellsCount).toBe(1)
  })
})
