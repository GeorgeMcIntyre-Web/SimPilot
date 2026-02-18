import { describe, it, expect } from 'vitest'
import { scanWorkbook, categoryToFileKind } from '../sheetSniffer'
import { createMockWorkbook } from './helpers'

describe('ASSEMBLIES_LIST category', () => {
  it('detects ASSEMBLIES_LIST from signature keywords', () => {
    const workbook = createMockWorkbook({
      A_List: [
        ['1st Stage', 'Detailing', 'Checking', 'Issued', 'Description', 'Status', 'Date'],
        ...Array(30).fill(['val1', 'val2', 'val3', 'val4', 'val5', 'val6', 'val7']),
      ],
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    expect(result.bestOverall?.category).toBe('ASSEMBLIES_LIST')
  })

  it('prefers sheet named "A_List"', () => {
    const workbook = createMockWorkbook({
      A_List: [
        ['1st Stage', 'Detailing', 'Checking', 'Issued', 'Description', 'Status'],
        ...Array(30).fill(['val1', 'val2', 'val3', 'val4', 'val5', 'val6']),
      ],
      Summary: [
        ['1st Stage', 'Detailing', 'Checking', 'Issued', 'Description', 'Status'],
        ...Array(30).fill(['val1', 'val2', 'val3', 'val4', 'val5', 'val6']),
      ],
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    expect(result.bestOverall?.sheetName).toBe('A_List')
    expect(result.bestOverall?.nameScore).toBe(10)
  })

  it('includes ASSEMBLIES_LIST in byCategory results', () => {
    const workbook = createMockWorkbook({
      A_List: [
        ['1st Stage', '2nd Stage', 'Detailing', 'Checking', 'Issued'],
        ...Array(30).fill(['val1', 'val2', 'val3', 'val4', 'val5']),
      ],
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    expect(result.byCategory.ASSEMBLIES_LIST?.category).toBe('ASSEMBLIES_LIST')
  })

  it('maps ASSEMBLIES_LIST to AssembliesList FileKind', () => {
    expect(categoryToFileKind('ASSEMBLIES_LIST')).toBe('AssembliesList')
  })

  it('handles assemblies list with strong matches', () => {
    const workbook = createMockWorkbook({
      Assembly_Data: [
        ['1st Stage', '2nd Stage', 'Detailing', 'Checking', 'Issued', 'Description', 'Progress'],
        ...Array(50).fill(['val1', 'val2', 'val3', 'val4', 'val5', 'val6', 'val7']),
      ],
    })

    const result = scanWorkbook(workbook, 'test.xlsx')

    expect(result.bestOverall?.category).toBe('ASSEMBLIES_LIST')
    expect(result.bestOverall?.strongMatches.length).toBeGreaterThan(0)
  })
})
