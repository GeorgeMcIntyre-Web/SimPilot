import { describe, it, expect, beforeEach } from 'vitest'
import { getEngineerMetrics } from '../../derivedMetrics'
import { makeProject, makeArea, makeCell, seedStore, clearStore } from './helpers'

describe('getEngineerMetrics', () => {
  beforeEach(() => clearStore())

  it('returns metrics for a specific engineer', () => {
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
    ]

    seedStore({ projects: [project], areas: [area], cells })

    const metrics = getEngineerMetrics('Dale Harris')

    expect(metrics?.engineerName).toBe('Dale Harris')
    expect(metrics?.cellCount).toBe(1)
  })

  it('normalizes engineer name when searching', () => {
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
    ]

    seedStore({ projects: [project], areas: [area], cells })

    const metrics = getEngineerMetrics('  Dale Harris  ')

    expect(metrics?.engineerName).toBe('Dale Harris')
  })

  it('returns undefined for unknown engineer', () => {
    const project = makeProject()
    const area = makeArea()
    seedStore({ projects: [project], areas: [area], cells: [] })

    const metrics = getEngineerMetrics('Unknown Engineer')
    expect(metrics).toBeUndefined()
  })

  it('returns undefined for empty engineer name', () => {
    const metrics = getEngineerMetrics('')
    expect(metrics).toBeUndefined()
  })
})
