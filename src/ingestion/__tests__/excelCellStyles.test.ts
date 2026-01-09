/**
 * Tests for Excel Cell Style Metadata and Deletion Detection
 */

import { describe, it, expect } from 'vitest'
import {
  isDeletedRow,
  getProjectIdentifierHeaders,
  isPossibleShapeRedaction
} from '../excelCellStyles'
import type { ParsedRowWithMeta } from '../excelCellStyles'

describe('excelCellStyles', () => {
  describe('isDeletedRow', () => {
    it('should detect struck-through identifier cells', () => {
      const row: ParsedRowWithMeta = {
        'Equipment No': { value: 'EQ-001', isStruck: true, isHidden: false },
        'Tooling Number RH': { value: 'TN-RH-001', isStruck: false, isHidden: false },
        'Station': { value: 'ST-100', isStruck: false, isHidden: false }
      }

      const idHeaders = ['Equipment No', 'Tooling Number RH', 'Station']
      expect(isDeletedRow(row, idHeaders)).toBe(true)
    })

    it('should detect hidden rows', () => {
      const row: ParsedRowWithMeta = {
        'Equipment No': { value: 'EQ-001', isStruck: false, isHidden: true },
        'Tooling Number RH': { value: 'TN-RH-001', isStruck: false, isHidden: true },
        'Station': { value: 'ST-100', isStruck: false, isHidden: true }
      }

      const idHeaders = ['Equipment No', 'Tooling Number RH', 'Station']
      expect(isDeletedRow(row, idHeaders)).toBe(true)
    })

    it('should detect delete markers when identifiers are empty', () => {
      const row: ParsedRowWithMeta = {
        'Equipment No': { value: '', isStruck: false, isHidden: false },
        'Tooling Number RH': { value: '', isStruck: false, isHidden: false },
        'Station': { value: 'DELETED', isStruck: false, isHidden: false }
      }

      const idHeaders = ['Equipment No', 'Tooling Number RH']
      expect(isDeletedRow(row, idHeaders)).toBe(true)
    })

    it('should NOT delete rows with delete markers if identifiers are present', () => {
      const row: ParsedRowWithMeta = {
        'Equipment No': { value: 'EQ-001', isStruck: false, isHidden: false },
        'Tooling Number RH': { value: 'TN-RH-001', isStruck: false, isHidden: false },
        'Notes': { value: 'REMOVED FROM BOM', isStruck: false, isHidden: false }
      }

      const idHeaders = ['Equipment No', 'Tooling Number RH']
      expect(isDeletedRow(row, idHeaders)).toBe(false)
    })

    it('should keep normal rows', () => {
      const row: ParsedRowWithMeta = {
        'Equipment No': { value: 'EQ-001', isStruck: false, isHidden: false },
        'Tooling Number RH': { value: 'TN-RH-001', isStruck: false, isHidden: false },
        'Station': { value: 'ST-100', isStruck: false, isHidden: false }
      }

      const idHeaders = ['Equipment No', 'Tooling Number RH', 'Station']
      expect(isDeletedRow(row, idHeaders)).toBe(false)
    })

    it('should handle missing cells gracefully', () => {
      const row: ParsedRowWithMeta = {
        'Equipment No': { value: 'EQ-001', isStruck: false, isHidden: false }
      }

      const idHeaders = ['Equipment No', 'Tooling Number RH', 'NonExistent Header']
      expect(isDeletedRow(row, idHeaders)).toBe(false)
    })

    it('should detect strike-through on Tooling Number RH', () => {
      const row: ParsedRowWithMeta = {
        'Equipment No': { value: 'EQ-001', isStruck: false, isHidden: false },
        'Tooling Number RH': { value: '7F-010R-H', isStruck: true, isHidden: false },
        'Tooling Number LH': { value: '7F-010L-H', isStruck: false, isHidden: false }
      }

      const idHeaders = ['Equipment No', 'Tooling Number RH', 'Tooling Number LH']
      expect(isDeletedRow(row, idHeaders)).toBe(true)
    })

    it('should detect empty identifier cells with OBSOLETE marker', () => {
      const row: ParsedRowWithMeta = {
        'Equipment No': { value: '', isStruck: false, isHidden: false },
        'Tooling Number RH': { value: '', isStruck: false, isHidden: false },
        'Comments': { value: 'OBSOLETE - DO NOT USE', isStruck: false, isHidden: false }
      }

      const idHeaders = ['Equipment No', 'Tooling Number RH']
      expect(isDeletedRow(row, idHeaders)).toBe(true)
    })
  })

  describe('getProjectIdentifierHeaders', () => {
    it('should return BMW identifier headers', () => {
      const headers = getProjectIdentifierHeaders('BMW_J10735')
      expect(headers).toEqual([
        'Equipment No',
        'Tooling Number RH',
        'Tooling Number LH',
        'Station'
      ])
    })

    it('should return V801 identifier headers', () => {
      const headers = getProjectIdentifierHeaders('FORD_V801')
      expect(headers).toEqual([
        'Equipment No',
        'Tooling Number RH',
        'Tooling Number LH'
      ])
    })

    it('should return STLA identifier headers', () => {
      const headers = getProjectIdentifierHeaders('STLA_S_ZAR')
      expect(headers).toEqual([
        'Equipment No Shown',
        'Equipment No Opposite',
        'Tooling Number RH',
        'Tooling Number LH',
        'Tooling Number RH (Opposite)',
        'Tooling Number LH (Opposite)'
      ])
    })

    it('should return generic headers for unknown project', () => {
      const headers = getProjectIdentifierHeaders('UNKNOWN')
      expect(headers).toEqual([
        'Equipment No',
        'Tooling Number RH',
        'Tooling Number LH'
      ])
    })
  })

  describe('isPossibleShapeRedaction', () => {
    it('should detect long underscore runs', () => {
      expect(isPossibleShapeRedaction('_____')).toBe(true)
      expect(isPossibleShapeRedaction('EQ-001_____more')).toBe(true)
      expect(isPossibleShapeRedaction('______________________________________')).toBe(true)
    })

    it('should detect long dash runs', () => {
      expect(isPossibleShapeRedaction('-------')).toBe(true)
      expect(isPossibleShapeRedaction('TN--------001')).toBe(true)
    })

    it('should detect equals runs', () => {
      expect(isPossibleShapeRedaction('======')).toBe(true)
    })

    it('should detect asterisk runs', () => {
      expect(isPossibleShapeRedaction('*******')).toBe(true)
    })

    it('should NOT flag normal values', () => {
      expect(isPossibleShapeRedaction('EQ-001')).toBe(false)
      expect(isPossibleShapeRedaction('7F-010R-H')).toBe(false)
      expect(isPossibleShapeRedaction('ST_100')).toBe(false)
      expect(isPossibleShapeRedaction('TN-RH-001')).toBe(false)
    })

    it('should NOT flag short underscore runs', () => {
      expect(isPossibleShapeRedaction('____')).toBe(false)
      expect(isPossibleShapeRedaction('A_B_C')).toBe(false)
    })

    it('should handle empty strings', () => {
      expect(isPossibleShapeRedaction('')).toBe(false)
    })
  })
})
