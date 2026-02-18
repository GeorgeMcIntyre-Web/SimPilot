import { describe, it, expect } from 'vitest'
import { scanWorkbook } from '../sheetSniffer'
import { createMockWorkbook } from './helpers'

describe('row count guard', () => {
  it('rejects small sheets with only weak matches', () => {
    const workbook = createMockWorkbook({
      DATA: [
        ['AREA', 'STATION', 'ROBOT'],
        ['val1', 'val2', 'val3'],
        ['val4', 'val5', 'val6'],
      ],
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    expect(result.allDetections.length).toBe(0)
  })

  it('allows small sheets with strong matches', () => {
    const workbook = createMockWorkbook({
      Summary: [
        ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', 'ROBOT POSITION - STAGE 1'],
        ...Array(15).fill(['val1', 'val2', 'val3']),
      ],
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    expect(result.bestOverall?.category).toBe('SIMULATION_STATUS')
  })

  it('prefers large well-named sheets over tiny generic sheets', () => {
    const workbook = createMockWorkbook({
      DATA: [
        ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', '1st STAGE SIM', 'ROBOT'],
        ['val1', 'val2', 'val3', 'val4'],
        ['val5', 'val6', 'val7', 'val8'],
      ],
      SIMULATION: [
        ['ROBOT POSITION - STAGE 1', 'DCS CONFIGURED', 'APPLICATION', 'AREA', 'STATION', 'ROBOT'],
        ...Array(30).fill(['val1', 'val2', 'val3', 'val4', 'val5', 'val6']),
      ],
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    expect(result.bestOverall?.sheetName).toBe('SIMULATION')
  })

  it('includes maxRow in detection result', () => {
    const workbook = createMockWorkbook({
      SIMULATION: Array(100).fill(['ROBOT POSITION - STAGE 1', 'DCS CONFIGURED', 'AREA']),
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    expect(result.bestOverall?.maxRow).toBeDefined()
    expect(result.bestOverall?.maxRow).toBeGreaterThan(25)
  })
})
