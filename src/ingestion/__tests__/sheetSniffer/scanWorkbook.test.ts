import { describe, it, expect } from 'vitest'
import { scanWorkbook } from '../sheetSniffer'
import { createMockWorkbook } from './helpers'

describe('scanWorkbook', () => {
  it('finds the best sheet across multiple sheets', () => {
    const workbook = createMockWorkbook({
      Introduction: [['Welcome', 'to', 'SimPilot']],
      SIMULATION: [
        ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION'],
        ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', 'PERSONS RESPONSIBLE', '', ''],
      ],
      Notes: [['Some', 'random', 'notes']],
    })

    const result = scanWorkbook(workbook)

    expect(result.bestOverall).not.toBeNull()
    expect(result.bestOverall?.category).toBe('SIMULATION_STATUS')
    expect(result.bestOverall?.sheetName).toBe('SIMULATION')
  })

  it('populates byCategory correctly', () => {
    const workbook = createMockWorkbook({
      SIMULATION: [
        ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION'],
        ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', '', '', ''],
      ],
      ToolList: [
        ['Tool ID', 'Sim. Leader', 'Sim. Employee', 'Team Leader'],
        ['T-001', 'John', 'Jane', 'Bob'],
      ],
    })

    const result = scanWorkbook(workbook)

    expect(result.byCategory.SIMULATION_STATUS?.sheetName).toBe('SIMULATION')
    expect(result.byCategory.IN_HOUSE_TOOLING?.sheetName).toBe('ToolList')
  })

  it('handles workbook with only Introduction sheet', () => {
    const workbook = createMockWorkbook({
      Introduction: [['Welcome to the project'], ['Please see other tabs']],
    })

    const result = scanWorkbook(workbook)

    expect(result.bestOverall).toBeNull()
    expect(result.allDetections).toHaveLength(0)
  })

  it('prefers higher-scoring sheets when multiple match same category', () => {
    const workbook = createMockWorkbook({
      LowScoreSheet: [['Gun', 'Area', 'Force']],
      GunForceData: [['Gun Number', 'Gun Force [N]', 'Quantity', 'Reserve', 'Robot Number']],
    })

    const result = scanWorkbook(workbook)

    expect(result.bestOverall?.sheetName).toBe('GunForceData')
    expect(result.bestOverall?.category).toBe('GUN_FORCE')
    expect(result.bestOverall?.score).toBeGreaterThanOrEqual(5)
  })

  it('returns all non-UNKNOWN detections in allDetections', () => {
    const workbook = createMockWorkbook({
      Intro: [['Welcome']],
      SIMULATION: [['AREA', 'STATION', 'ROBOT', '1st STAGE SIM COMPLETION', 'PERSONS RESPONSIBLE']],
      Raisers: [['Proyect', 'Area', 'Height', 'New station', 'Coments']],
      Random: [['Col A', 'Col B']],
    })

    const result = scanWorkbook(workbook)

    expect(result.allDetections.some((d) => d.category === 'SIMULATION_STATUS')).toBe(true)
    expect(result.allDetections.some((d) => d.category === 'REUSE_RISERS')).toBe(true)
    expect(result.allDetections.some((d) => d.category === 'UNKNOWN')).toBe(false)
  })
})
