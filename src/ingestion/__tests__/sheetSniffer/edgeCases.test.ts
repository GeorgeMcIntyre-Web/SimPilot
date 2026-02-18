import { describe, it, expect } from 'vitest'
import { sniffSheet } from '../sheetSniffer'
import { createMockWorkbook } from './helpers'

describe('sniffSheet edge cases', () => {
  it('handles headers with mixed case', () => {
    const workbook = createMockWorkbook({
      Data: [
        ['DEVICE NAME', 'refresment ok', 'Serial Number Complete WG'],
        ['WG-001', 'Yes', 'SN-123'],
      ],
    })

    const result = sniffSheet(workbook, 'Data')

    expect(result.category).toBe('REUSE_WELD_GUNS')
  })

  it('handles headers with extra whitespace', () => {
    const workbook = createMockWorkbook({
      Data: [
        ['  Gun Number  ', '  Gun Force [N]  ', 'Quantity'],
        ['G-001', '4500', '2'],
      ],
    })

    const result = sniffSheet(workbook, 'Data')

    expect(result.category).toBe('GUN_FORCE')
  })

  it('handles partial keyword matches', () => {
    const workbook = createMockWorkbook({
      Data: [
        ['My Gun Number Column', 'Force Value', 'Qty'],
        ['G-001', '4500', '2'],
      ],
    })

    const result = sniffSheet(workbook, 'Data')

    expect(result.score).toBeGreaterThan(0)
  })
})
