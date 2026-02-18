import { describe, it, expect, beforeEach } from 'vitest'
import { getAllEngineerMetrics } from '../../derivedMetrics'
import { makeProject, makeArea, makeCell, seedStore, clearStore } from './helpers'

describe('getAllEngineerMetrics', () => {
  beforeEach(() => clearStore())

  it('returns empty array when no cells have engineers', () => {
    const project = makeProject()
    const area = makeArea()
    const cells = [makeCell({ simulation: undefined })]

    seedStore({ projects: [project], areas: [area], cells })

    const metrics = getAllEngineerMetrics()
    expect(metrics).toHaveLength(0)
  })

  it('aggregates metrics for a single engineer', () => {
    const project = makeProject()
    const area = makeArea()
    const cells = [
      makeCell({
        assignedEngineer: 'Dale Harris',
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
        code: '020',
        assignedEngineer: 'Dale Harris',
        simulation: {
          percentComplete: 70,
          hasIssues: false,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 2,
        },
      }),
    ]

    seedStore({ projects: [project], areas: [area], cells })

    const metrics = getAllEngineerMetrics()

    expect(metrics).toHaveLength(1)
    expect(metrics[0].engineerName).toBe('Dale Harris')
    expect(metrics[0].cellCount).toBe(2)
    expect(metrics[0].avgCompletion).toBe(80)
    expect(metrics[0].projectIds).toEqual(['proj-1'])
    expect(metrics[0].atRiskCellsCount).toBe(1)
  })

  it('aggregates metrics for multiple engineers', () => {
    const project = makeProject()
    const area = makeArea()
    const cells = [
      makeCell({
        assignedEngineer: 'Dale Harris',
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
        code: '020',
        assignedEngineer: 'John Smith',
        simulation: {
          percentComplete: 60,
          hasIssues: true,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 2,
        },
      }),
    ]

    seedStore({ projects: [project], areas: [area], cells })

    const metrics = getAllEngineerMetrics()

    expect(metrics).toHaveLength(2)

    const daleMetrics = metrics.find((m) => m.engineerName === 'Dale Harris')
    const johnMetrics = metrics.find((m) => m.engineerName === 'John Smith')

    expect(daleMetrics?.cellCount).toBe(1)
    expect(daleMetrics?.avgCompletion).toBe(90)
    expect(daleMetrics?.atRiskCellsCount).toBe(0)

    expect(johnMetrics?.cellCount).toBe(1)
    expect(johnMetrics?.avgCompletion).toBe(60)
    expect(johnMetrics?.atRiskCellsCount).toBe(1)
  })

  it('normalizes engineer names by trimming whitespace', () => {
    const project = makeProject()
    const area = makeArea()
    const cells = [
      makeCell({
        assignedEngineer: '  Dale Harris  ',
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
        code: '020',
        assignedEngineer: 'Dale Harris',
        simulation: {
          percentComplete: 80,
          hasIssues: false,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 2,
        },
      }),
    ]

    seedStore({ projects: [project], areas: [area], cells })

    const metrics = getAllEngineerMetrics()

    expect(metrics).toHaveLength(1)
    expect(metrics[0].engineerName).toBe('Dale Harris')
    expect(metrics[0].cellCount).toBe(2)
  })

  it('counts at-risk cells using threshold and issues', () => {
    const project = makeProject()
    const area = makeArea()
    const cells = [
      makeCell({
        assignedEngineer: 'Dale Harris',
        simulation: {
          percentComplete: 81,
          hasIssues: false,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 1,
        },
      }),
      makeCell({
        id: 'cell-2',
        code: '020',
        assignedEngineer: 'Dale Harris',
        simulation: {
          percentComplete: 79,
          hasIssues: false,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 2,
        },
      }),
      makeCell({
        id: 'cell-3',
        code: '030',
        assignedEngineer: 'Dale Harris',
        status: 'Blocked',
        simulation: {
          percentComplete: 85,
          hasIssues: true,
          metrics: {},
          sourceFile: 'test.xlsx',
          sheetName: 'Sheet1',
          rowIndex: 3,
        },
      }),
    ]

    seedStore({ projects: [project], areas: [area], cells })

    const metrics = getAllEngineerMetrics()

    expect(metrics).toHaveLength(1)
    expect(metrics[0].atRiskCellsCount).toBe(2)
  })
})
