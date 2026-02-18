import { describe, it, expect } from 'vitest'
import { sniffSheet } from '../sheetSniffer'
import { createMockWorkbook } from './helpers'

describe('sniffSheet detection', () => {
  it('detects SIMULATION_STATUS from header keywords', () => {
    const workbook = createMockWorkbook({
      SIMULATION: [
        ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION'],
        ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', 'PERSONS RESPONSIBLE', '', ''],
        ['Underbody', 'BN_B05', '010', 'R-01', 'Spot Welding'],
      ],
    })

    const result = sniffSheet(workbook, 'SIMULATION')

    expect(result.category).toBe('SIMULATION_STATUS')
    expect(result.score).toBeGreaterThan(0)
    expect(result.matchedKeywords.length).toBeGreaterThan(0)
  })

  it('detects REUSE_WELD_GUNS with typo "Refresment OK"', () => {
    const workbook = createMockWorkbook({
      'Welding guns': [
        ['Zone', 'Station', 'Device Name', 'Type', 'Refresment OK', 'Serial Number Complete WG'],
        ['P1Mx', 'OP-20', 'WG-101', 'Pneumatic', 'Yes', 'SN-12345'],
      ],
    })

    const result = sniffSheet(workbook, 'Welding guns')

    expect(result.category).toBe('REUSE_WELD_GUNS')
    expect(result.matchedKeywords).toContain('Refresment OK')
  })

  it('detects REUSE_RISERS with typo "Proyect"', () => {
    const workbook = createMockWorkbook({
      Raisers: [
        ['Proyect', 'Area', 'Location', 'Brand', 'Height', 'New station', 'Coments'],
        ['STLA-S', 'Underbody', 'P1', 'ABC', '500', 'OP-30', 'Test comment'],
      ],
    })

    const result = sniffSheet(workbook, 'Raisers')

    expect(result.category).toBe('REUSE_RISERS')
    expect(result.matchedKeywords).toContain('Proyect')
  })

  it('detects GUN_FORCE from Zangenpool-style headers', () => {
    const workbook = createMockWorkbook({
      'Zaragoza Allocation': [
        ['Gun Number', 'Gun Force [N]', 'Quantity', 'Reserve', 'Old Line', 'Robot Number', 'Area'],
        ['G-001', '4500', '2', '1', 'L-01', 'R-01', 'Underbody'],
      ],
    })

    const result = sniffSheet(workbook, 'Zaragoza Allocation')

    expect(result.category).toBe('GUN_FORCE')
    expect(result.matchedKeywords).toContain('Gun Force')
    expect(result.matchedKeywords).toContain('Gun Number')
  })

  it('detects IN_HOUSE_TOOLING from ToolList headers', () => {
    const workbook = createMockWorkbook({
      ToolList: [
        ['Tool ID', 'Sim. Leader', 'Sim. Employee', 'Team Leader', 'Sim. Due Date (yyyy/MM/dd)'],
        ['T-001', 'John', 'Jane', 'Bob', '2024/06/15'],
      ],
    })

    const result = sniffSheet(workbook, 'ToolList')

    expect(result.category).toBe('IN_HOUSE_TOOLING')
    expect(result.matchedKeywords).toContain('Sim. Leader')
  })

  it('detects ROBOT_SPECS from Robotlist headers', () => {
    const workbook = createMockWorkbook({
      'STLA-S': [
        [
          'Robotnumber',
          'Robot caption',
          'Robotnumber (E-Number)',
          'Robot w/ J1-J3 Dress Pack (order code)',
        ],
        ['R-001', 'Underbody Robot 1', 'E-12345', 'R-2000i/210F'],
      ],
    })

    const result = sniffSheet(workbook, 'STLA-S')

    expect(result.category).toBe('ROBOT_SPECS')
    expect(result.matchedKeywords).toContain('Robotnumber')
  })

  it('returns UNKNOWN for sheets with no matching keywords', () => {
    const workbook = createMockWorkbook({
      RandomSheet: [
        ['Column A', 'Column B', 'Column C'],
        ['Data 1', 'Data 2', 'Data 3'],
      ],
    })

    const result = sniffSheet(workbook, 'RandomSheet')

    expect(result.category).toBe('UNKNOWN')
    expect(result.score).toBe(0)
  })

  it('skips Introduction sheets', () => {
    const workbook = createMockWorkbook({
      Introduction: [
        ['Welcome to the STLA-S Project'],
        ['This file contains simulation data'],
        ['Area', 'Station', 'Robot'],
      ],
    })

    const result = sniffSheet(workbook, 'Introduction')

    expect(result.category).toBe('UNKNOWN')
  })

  it('skips ChangeIndex sheets', () => {
    const workbook = createMockWorkbook({
      'Change Index': [
        ['Version', 'Date', 'Author', 'Changes'],
        ['1.0', '2024-01-01', 'John', 'Initial'],
      ],
    })

    const result = sniffSheet(workbook, 'Change Index')

    expect(result.category).toBe('UNKNOWN')
  })

  it('handles empty sheets gracefully', () => {
    const workbook = createMockWorkbook({
      EmptySheet: [],
    })

    const result = sniffSheet(workbook, 'EmptySheet')

    expect(result.category).toBe('UNKNOWN')
    expect(result.score).toBe(0)
  })

  it('scans only first 10 rows by default', () => {
    const rows: string[][] = Array(7).fill(['', '', ''])
    rows.push(['Gun Number', 'Gun Force [N]', 'Quantity'])
    rows.push(['G-001', '4500', '2'])

    const workbook = createMockWorkbook({
      Data: rows,
    })

    const result = sniffSheet(workbook, 'Data', 'test.xlsx', 10)

    expect(result.category).toBe('GUN_FORCE')
  })

  it('misses headers beyond scan limit', () => {
    const rows: string[][] = Array(14).fill(['', '', ''])
    rows.push(['Gun Number', 'Gun Force [N]', 'Quantity'])
    rows.push(['G-001', '4500', '2'])

    const workbook = createMockWorkbook({
      Data: rows,
    })

    const result = sniffSheet(workbook, 'Data', 'test.xlsx', 10)

    expect(result.category).toBe('UNKNOWN')
  })
})
