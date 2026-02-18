import { describe, it, expect } from 'vitest'
import { scanWorkbook } from '../sheetSniffer'
import { createMockWorkbook } from './helpers'

describe('combined scoring', () => {
  it('combines keyword score and name score', () => {
    const workbook = createMockWorkbook({
      SIMULATION: [
        ['ROBOT POSITION - STAGE 1', 'DCS CONFIGURED', 'APPLICATION', 'AREA', 'STATION', 'ROBOT'],
        ...Array(30).fill(['val1', 'val2', 'val3', 'val4', 'val5', 'val6']),
      ],
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    const totalScore = result.bestOverall?.score || 0
    const nameScore = result.bestOverall?.nameScore || 0
    const keywordScore = totalScore - nameScore

    expect(result.bestOverall).not.toBeNull()
    expect(nameScore).toBe(20)
    expect(keywordScore).toBeGreaterThan(0)
    expect(totalScore).toBeGreaterThan(nameScore)
  })

  it('handles STLA-S simulation status files (real-world scenario)', () => {
    const workbook = createMockWorkbook({
      OVERVIEW: Array(17).fill(['Summary', 'Info']),
      SIMULATION: [
        [
          'ROBOT POSITION - STAGE 1',
          'DCS CONFIGURED',
          'APPLICATION',
          'ASSEMBLY LINE',
          'AREA',
          'STATION',
          'ROBOT',
        ],
        ...Array(100).fill(['val1', 'val2', 'val3', 'val4', 'val5', 'val6', 'val7']),
      ],
      DATA: [
        ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', '1st STAGE SIM', 'ROBOT'],
        ['val1', 'val2', 'val3', 'val4'],
      ],
    })

    const result = scanWorkbook(workbook, 'STLA-S_FRONT_UNIT_Simulation_Status_CSG.xlsx')

    expect(result.bestOverall?.sheetName).toBe('SIMULATION')
    expect(result.bestOverall?.category).toBe('SIMULATION_STATUS')
  })

  it('handles BMW assemblies list files (real-world scenario)', () => {
    const workbook = createMockWorkbook({
      Summary: Array(63).fill(['Info']),
      A_List: [
        [
          '1st Stage',
          '2nd Stage',
          'Detailing',
          'Checking',
          'Issued',
          'Description',
          'Status',
          'Date',
          'Customer',
          'Area',
        ],
        ...Array(100).fill([
          'val1',
          'val2',
          'val3',
          'val4',
          'val5',
          'val6',
          'val7',
          'val8',
          'val9',
          'val10',
        ]),
      ],
      Progress_Report: Array(7).fill(['Info']),
    })

    const result = scanWorkbook(workbook, 'J10735_BMW_NCAR_C-D-Pillar_Assemblies_List.xlsm')

    expect(result.bestOverall?.sheetName).toBe('A_List')
    expect(result.bestOverall?.category).toBe('ASSEMBLIES_LIST')
  })
})
