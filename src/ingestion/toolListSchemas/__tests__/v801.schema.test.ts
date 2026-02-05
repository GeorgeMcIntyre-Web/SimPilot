/**
 * V801 Schema Adapter Tests
 */

import { describe, it, expect } from 'vitest'
import {
  normalizeV801Rows,
  v801RowToToolEntities,
  validateV801Entities,
} from '../v801ToolListSchema'
import { ValidationAnomaly } from '../normalizeToolListRow'

describe('V801 Schema Adapter', () => {
  describe('normalizeV801Rows', () => {
    it('should propagate area name from section header rows', () => {
      const rawRows = [
        { 'Area Name': '7F - Final Assembly', Station: '' },
        {
          'Area Name': '',
          Station: '7F-010',
          'Equipment No': '016ZF-001',
          'Tooling Number RH': '7F-010R-H',
        },
      ]

      const result = normalizeV801Rows(rawRows, 'test.xlsx', 0)

      expect(result).toHaveLength(1)
      expect(result[0].areaName).toBe('7F - Final Assembly')
      expect(result[0].stationGroup).toBe('7F-010')
    })

    it('should derive atomic station from tooling number', () => {
      const rawRows = [{ 'Area Name': '7F', Station: '7F-010', 'Tooling Number RH': '7F-010R-H' }]

      const result = normalizeV801Rows(rawRows, 'test.xlsx', 0)

      expect(result[0].stationAtomic).toBe('7F-010R')
    })
  })

  describe('v801RowToToolEntities', () => {
    it('should create RH and LH entities from tooling numbers', () => {
      const normalized = {
        sourceFile: 'test.xlsx',
        projectHint: 'FORD_V801' as const,
        areaName: '7F',
        stationGroup: '7F-010',
        stationAtomic: '7F-010R',
        equipmentType: 'Weld Gun',
        equipmentNoShown: '016ZF-001-010-H',
        equipmentNoOpposite: '',
        toolingNumberRH: '7F-010R-H',
        toolingNumberLH: '7F-010L-T1',
        toolingNumberOppositeRH: '',
        toolingNumberOppositeLH: '',
        toolingLR: 'R' as const,
        toolingLROpposite: '' as const,
        isDeleted: false,
        rawRowIndex: 1,
        raw: {},
      }

      const anomalies: ValidationAnomaly[] = []
      const entities = v801RowToToolEntities(normalized, 'ToolList', anomalies, false)

      expect(entities).toHaveLength(2)
      expect(entities[0].canonicalKey).toBe('FORD|7F-010R-H')
      expect(entities[1].canonicalKey).toBe('FORD|7F-010L-T1')
      expect(entities[0].displayCode).toBe('7F-010R-H')
      expect(entities[1].displayCode).toBe('7F-010L-T1')
    })

    it('should create FIDES entity when no tooling numbers exist', () => {
      const normalized = {
        sourceFile: 'test.xlsx',
        projectHint: 'FORD_V801' as const,
        areaName: '7F',
        stationGroup: '7F-010',
        stationAtomic: '7F-010',
        equipmentType: 'Weld Gun',
        equipmentNoShown: '016ZF-001-010-H',
        equipmentNoOpposite: '',
        toolingNumberRH: '',
        toolingNumberLH: '',
        toolingNumberOppositeRH: '',
        toolingNumberOppositeLH: '',
        toolingLR: '' as const,
        toolingLROpposite: '' as const,
        isDeleted: false,
        rawRowIndex: 1,
        raw: {},
      }

      const anomalies: ValidationAnomaly[] = []
      const entities = v801RowToToolEntities(normalized, 'ToolList', anomalies, false)

      expect(entities).toHaveLength(1)
      expect(entities[0].canonicalKey).toBe('FORD|FIDES|016ZF-001-010-H')
      expect(anomalies).toHaveLength(1)
      expect(anomalies[0].type).toBe('EQUIPMENT_NO_BUT_NO_TOOLING')
    })

    it('should detect tooling/area prefix mismatches', () => {
      const normalized = {
        sourceFile: 'test.xlsx',
        projectHint: 'FORD_V801' as const,
        areaName: '7F - Final',
        stationGroup: '7F-010',
        stationAtomic: '7M-010R',
        equipmentType: 'Weld Gun',
        equipmentNoShown: '016ZF-001',
        equipmentNoOpposite: '',
        toolingNumberRH: '7M-010R-H', // Mismatch: 7M vs 7F
        toolingNumberLH: '',
        toolingNumberOppositeRH: '',
        toolingNumberOppositeLH: '',
        toolingLR: 'R' as const,
        toolingLROpposite: '' as const,
        isDeleted: false,
        rawRowIndex: 1,
        raw: {},
      }

      const anomalies: ValidationAnomaly[] = []
      const entities = v801RowToToolEntities(normalized, 'ToolList', anomalies, false)

      expect(entities).toHaveLength(1)
      expect(anomalies.some((a) => a.type === 'TOOLING_PREFIX_MISMATCH')).toBe(true)
    })
  })

  describe('validateV801Entities', () => {
    it('should detect duplicate canonical keys', () => {
      const entities = [
        {
          canonicalKey: 'FORD|7F-010R-H',
          displayCode: '7F-010R-H',
          stationGroup: '7F-010',
          stationAtomic: '7F-010R',
          areaName: '7F',
          aliases: [],
          source: { file: 'test.xlsx', row: 1, sheet: 'ToolList' },
          raw: {},
        },
        {
          canonicalKey: 'FORD|7F-010R-H', // Duplicate
          displayCode: '7F-010R-H',
          stationGroup: '7F-010',
          stationAtomic: '7F-010R',
          areaName: '7F',
          aliases: [],
          source: { file: 'test.xlsx', row: 2, sheet: 'ToolList' },
          raw: {},
        },
      ]

      const anomalies: ValidationAnomaly[] = []
      const report = validateV801Entities(entities, 2, anomalies)

      expect(report.totalEntitiesProduced).toBe(2)
      expect(anomalies.some((a) => a.type === 'DUPLICATE_CANONICAL_KEY')).toBe(true)
    })
  })
})
