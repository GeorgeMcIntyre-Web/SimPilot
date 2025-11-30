// Tests for Excel Utilities
// Basic tests for header detection and column mapping

import { describe, it, expect } from 'vitest'
import { findHeaderRow, buildColumnMap, isEmptyRow, isTotalRow, CellValue } from './excelUtils'

describe('excelUtils', () => {
  describe('findHeaderRow', () => {
    it('should find header row with all required tokens', () => {
      const rows: CellValue[][] = [
        ['Title Row'],
        ['', '', ''],
        ['AREA', 'STATION', 'ROBOT', 'TYPE'],
        ['Data', '010', 'R01', 'Welding']
      ]

      const headerIndex = findHeaderRow(rows, ['AREA', 'STATION', 'ROBOT'])
      expect(headerIndex).toBe(2)
    })

    it('should return null if required tokens not found', () => {
      const rows: CellValue[][] = [
        ['Title Row'],
        ['Some', 'Random', 'Headers'],
        ['Data', 'More', 'Data']
      ]

      const headerIndex = findHeaderRow(rows, ['AREA', 'STATION', 'ROBOT'])
      expect(headerIndex).toBe(null)
    })

    it('should be case-insensitive', () => {
      const rows: CellValue[][] = [
        ['area', 'station', 'robot']
      ]

      const headerIndex = findHeaderRow(rows, ['AREA', 'STATION', 'ROBOT'])
      expect(headerIndex).toBe(0)
    })

    it('should handle null values in rows', () => {
      const rows: CellValue[][] = [
        [null, null, null],
        ['AREA', null, 'STATION', 'ROBOT']
      ]

      const headerIndex = findHeaderRow(rows, ['AREA', 'STATION', 'ROBOT'])
      expect(headerIndex).toBe(1)
    })
  })

  describe('buildColumnMap', () => {
    it('should map column names to indices', () => {
      const headerRow: CellValue[] = ['AREA', 'LINE', 'STATION', 'ROBOT']
      const expected = ['AREA', 'STATION', 'ROBOT']

      const map = buildColumnMap(headerRow, expected)

      expect(map['AREA']).toBe(0)
      expect(map['STATION']).toBe(2)
      expect(map['ROBOT']).toBe(3)
    })

    it('should return null for missing columns', () => {
      const headerRow: CellValue[] = ['AREA', 'LINE']
      const expected = ['AREA', 'STATION', 'ROBOT']

      const map = buildColumnMap(headerRow, expected)

      expect(map['AREA']).toBe(0)
      expect(map['STATION']).toBe(null)
      expect(map['ROBOT']).toBe(null)
    })

    it('should handle partial column name matches', () => {
      const headerRow: CellValue[] = ['AREA NAME', 'STATION CODE', 'ROBOT ID']
      const expected = ['AREA', 'STATION', 'ROBOT']

      const map = buildColumnMap(headerRow, expected)

      expect(map['AREA']).toBe(0)
      expect(map['STATION']).toBe(1)
      expect(map['ROBOT']).toBe(2)
    })
  })

  describe('isEmptyRow', () => {
    it('should detect empty rows', () => {
      expect(isEmptyRow([])).toBe(true)
      expect(isEmptyRow([null, null, null])).toBe(true)
      expect(isEmptyRow(['', '', ''])).toBe(true)
    })

    it('should detect non-empty rows', () => {
      expect(isEmptyRow(['Data'])).toBe(false)
      expect(isEmptyRow([null, 'Data', null])).toBe(false)
      expect(isEmptyRow([0])).toBe(false)
    })
  })

  describe('isTotalRow', () => {
    it('should detect total rows', () => {
      expect(isTotalRow(['TOTAL', 100, 200])).toBe(true)
      expect(isTotalRow(['Total', 100, 200])).toBe(true)
      expect(isTotalRow(['total', 100, 200])).toBe(true)
    })

    it('should not detect non-total rows', () => {
      expect(isTotalRow(['Data', 100, 200])).toBe(false)
      expect(isTotalRow([100, 200, 300])).toBe(false)
      expect(isTotalRow([null, null, null])).toBe(false)
    })
  })
})
