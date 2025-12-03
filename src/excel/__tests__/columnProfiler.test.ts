import { describe, it, expect } from 'vitest'
import {
  profileColumn,
  profileColumns,
  tokenizeHeader,
  isNumericColumn,
  isIntegerColumn,
  isDateColumn,
  isMostlyEmptyColumn,
  getColumnFillRate,
  getColumnCardinality,
  isLikelyIdentifierColumn,
  isLikelyCategoryColumn,
  type RawColumnContext,
  type ColumnProfile
} from '../columnProfiler'

describe('columnProfiler', () => {
  describe('tokenizeHeader', () => {
    it('tokenizes simple headers', () => {
      expect(tokenizeHeader('Area')).toEqual(['area'])
      expect(tokenizeHeader('Station')).toEqual(['station'])
    })

    it('tokenizes headers with spaces', () => {
      expect(tokenizeHeader('Area Name')).toEqual(['area', 'name'])
      expect(tokenizeHeader('Gun Force')).toEqual(['gun', 'force'])
    })

    it('tokenizes headers with underscores', () => {
      expect(tokenizeHeader('area_name')).toEqual(['area', 'name'])
      expect(tokenizeHeader('gun_force_kn')).toEqual(['gun', 'force', 'kn'])
    })

    it('tokenizes camelCase headers', () => {
      expect(tokenizeHeader('areaName')).toEqual(['area', 'name'])
      expect(tokenizeHeader('gunForce')).toEqual(['gun', 'force'])
    })

    it('tokenizes PascalCase headers', () => {
      expect(tokenizeHeader('AreaName')).toEqual(['area', 'name'])
      expect(tokenizeHeader('GunForce')).toEqual(['gun', 'force'])
    })

    it('tokenizes headers with hyphens', () => {
      expect(tokenizeHeader('area-name')).toEqual(['area', 'name'])
      expect(tokenizeHeader('gun-force')).toEqual(['gun', 'force'])
    })

    it('tokenizes complex headers', () => {
      expect(tokenizeHeader('Gun Force (kN)')).toEqual(['gun', 'force'])
      expect(tokenizeHeader('ROBOT POSITION - STAGE 1')).toEqual(['robot', 'position', 'stage', '1'])
    })

    it('handles empty and null headers', () => {
      expect(tokenizeHeader('')).toEqual([])
      expect(tokenizeHeader('   ')).toEqual([])
    })

    it('removes parentheses and bracket content', () => {
      const tokens = tokenizeHeader('Gun Force [N]')
      expect(tokens).toContain('gun')
      expect(tokens).toContain('force')
      // [N] should be removed, not tokenized
      expect(tokens).not.toContain('n')
    })
  })

  describe('profileColumn', () => {
    it('profiles a string column', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Area Name',
        cellValues: ['Front Unit', 'Rear Unit', 'Underbody', 'Front Unit', 'Rear Unit']
      }

      const profile = profileColumn(rawColumn)

      expect(profile.headerRaw).toBe('Area Name')
      expect(profile.headerNormalized).toBe('area name')
      expect(profile.headerTokens).toEqual(['area', 'name'])
      expect(profile.nonEmptyCount).toBe(5)
      expect(profile.totalCount).toBe(5)
      expect(profile.dominantType).toBe('string')
      expect(profile.distinctCountEstimate).toBe(3)
    })

    it('profiles a numeric column', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Gun Force',
        cellValues: [3.5, 4.2, 3.8, 4.0, 3.6, 4.1]
      }

      const profile = profileColumn(rawColumn)

      expect(profile.dominantType).toBe('number')
      expect(profile.dataTypeDistribution.numberRatio).toBe(1)
      expect(profile.dataTypeDistribution.stringRatio).toBe(0)
    })

    it('profiles an integer column', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Quantity',
        cellValues: [1, 2, 3, 4, 5, 10, 15]
      }

      const profile = profileColumn(rawColumn)

      expect(profile.dominantType).toBe('number')
      expect(profile.dataTypeDistribution.integerRatio).toBe(1)
    })

    it('profiles a column with empty values', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Comments',
        cellValues: ['Note 1', null, '', 'Note 2', undefined, '   ']
      }

      const profile = profileColumn(rawColumn)

      expect(profile.nonEmptyCount).toBe(2)
      expect(profile.totalCount).toBe(6)
      expect(profile.dataTypeDistribution.emptyRatio).toBeCloseTo(4 / 6)
    })

    it('profiles a mixed type column', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Value',
        cellValues: ['ABC', 123, 'DEF', 456, true]
      }

      const profile = profileColumn(rawColumn)

      expect(profile.dominantType).toBe('mixed')
    })

    it('collects sample values', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Status',
        cellValues: ['Active', 'Inactive', 'Pending', 'Active', 'Complete']
      }

      const profile = profileColumn(rawColumn, 3)

      expect(profile.sampleValues.length).toBeLessThanOrEqual(3)
      expect(profile.sampleValues.every(v => typeof v === 'string')).toBe(true)
    })

    it('handles boolean-like values', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Active',
        cellValues: ['Yes', 'No', 'Yes', 'No', 'Y', 'N']
      }

      const profile = profileColumn(rawColumn)

      expect(profile.dataTypeDistribution.booleanRatio).toBe(1)
      expect(profile.dominantType).toBe('boolean')
    })

    it('handles date-like values', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Date',
        cellValues: ['2024-01-15', '2024-02-20', '2024-03-10']
      }

      const profile = profileColumn(rawColumn)

      expect(profile.dataTypeDistribution.dateRatio).toBe(1)
      expect(profile.dominantType).toBe('date')
    })

    it('handles numeric strings', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Code',
        cellValues: ['100', '200', '300', '400', '500']
      }

      const profile = profileColumn(rawColumn)

      // These are numeric strings, should count as integers
      expect(profile.dataTypeDistribution.integerRatio).toBe(1)
    })

    it('profiles an empty column', () => {
      const rawColumn: RawColumnContext = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Empty',
        cellValues: [null, null, '', undefined, '  ']
      }

      const profile = profileColumn(rawColumn)

      expect(profile.nonEmptyCount).toBe(0)
      expect(profile.dominantType).toBe('empty')
      expect(profile.dataTypeDistribution.emptyRatio).toBe(1)
    })
  })

  describe('profileColumns', () => {
    it('profiles multiple columns', () => {
      const rawColumns: RawColumnContext[] = [
        {
          workbookId: 'test',
          sheetName: 'Sheet1',
          columnIndex: 0,
          headerRaw: 'Name',
          cellValues: ['A', 'B', 'C']
        },
        {
          workbookId: 'test',
          sheetName: 'Sheet1',
          columnIndex: 1,
          headerRaw: 'Value',
          cellValues: [1, 2, 3]
        }
      ]

      const profiles = profileColumns(rawColumns)

      expect(profiles.length).toBe(2)
      expect(profiles[0].headerRaw).toBe('Name')
      expect(profiles[1].headerRaw).toBe('Value')
    })
  })

  describe('isNumericColumn', () => {
    it('returns true for numeric columns', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Value',
        headerNormalized: 'value',
        headerTokens: ['value'],
        nonEmptyCount: 10,
        totalCount: 10,
        sampleValues: [],
        dataTypeDistribution: {
          stringRatio: 0,
          numberRatio: 0.9,
          integerRatio: 0.9,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0.1
        },
        distinctCountEstimate: 10,
        dominantType: 'number'
      }

      expect(isNumericColumn(profile)).toBe(true)
    })

    it('returns false for string columns', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Name',
        headerNormalized: 'name',
        headerTokens: ['name'],
        nonEmptyCount: 10,
        totalCount: 10,
        sampleValues: [],
        dataTypeDistribution: {
          stringRatio: 0.9,
          numberRatio: 0,
          integerRatio: 0,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0.1
        },
        distinctCountEstimate: 10,
        dominantType: 'string'
      }

      expect(isNumericColumn(profile)).toBe(false)
    })
  })

  describe('isIntegerColumn', () => {
    it('returns true for integer columns', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Count',
        headerNormalized: 'count',
        headerTokens: ['count'],
        nonEmptyCount: 10,
        totalCount: 10,
        sampleValues: [],
        dataTypeDistribution: {
          stringRatio: 0,
          numberRatio: 0.9,
          integerRatio: 0.9,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0.1
        },
        distinctCountEstimate: 10,
        dominantType: 'number'
      }

      expect(isIntegerColumn(profile)).toBe(true)
    })
  })

  describe('isDateColumn', () => {
    it('returns true for date columns', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Date',
        headerNormalized: 'date',
        headerTokens: ['date'],
        nonEmptyCount: 10,
        totalCount: 10,
        sampleValues: [],
        dataTypeDistribution: {
          stringRatio: 0,
          numberRatio: 0,
          integerRatio: 0,
          dateRatio: 0.9,
          booleanRatio: 0,
          emptyRatio: 0.1
        },
        distinctCountEstimate: 10,
        dominantType: 'date'
      }

      expect(isDateColumn(profile)).toBe(true)
    })
  })

  describe('isMostlyEmptyColumn', () => {
    it('returns true for mostly empty columns', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Notes',
        headerNormalized: 'notes',
        headerTokens: ['notes'],
        nonEmptyCount: 2,
        totalCount: 100,
        sampleValues: [],
        dataTypeDistribution: {
          stringRatio: 0.02,
          numberRatio: 0,
          integerRatio: 0,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0.98
        },
        distinctCountEstimate: 2,
        dominantType: 'empty'
      }

      expect(isMostlyEmptyColumn(profile)).toBe(true)
      expect(isMostlyEmptyColumn(profile, 0.9)).toBe(true)
    })

    it('returns false for well-filled columns', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Name',
        headerNormalized: 'name',
        headerTokens: ['name'],
        nonEmptyCount: 90,
        totalCount: 100,
        sampleValues: [],
        dataTypeDistribution: {
          stringRatio: 0.9,
          numberRatio: 0,
          integerRatio: 0,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0.1
        },
        distinctCountEstimate: 50,
        dominantType: 'string'
      }

      expect(isMostlyEmptyColumn(profile)).toBe(false)
    })
  })

  describe('getColumnFillRate', () => {
    it('calculates fill rate correctly', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Name',
        headerNormalized: 'name',
        headerTokens: ['name'],
        nonEmptyCount: 80,
        totalCount: 100,
        sampleValues: [],
        dataTypeDistribution: {
          stringRatio: 0.8,
          numberRatio: 0,
          integerRatio: 0,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0.2
        },
        distinctCountEstimate: 50,
        dominantType: 'string'
      }

      expect(getColumnFillRate(profile)).toBe(0.8)
    })
  })

  describe('getColumnCardinality', () => {
    it('calculates cardinality correctly', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'ID',
        headerNormalized: 'id',
        headerTokens: ['id'],
        nonEmptyCount: 100,
        totalCount: 100,
        sampleValues: [],
        dataTypeDistribution: {
          stringRatio: 1,
          numberRatio: 0,
          integerRatio: 0,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0
        },
        distinctCountEstimate: 100,
        dominantType: 'string'
      }

      expect(getColumnCardinality(profile)).toBe(1) // All unique
    })

    it('handles low cardinality', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Status',
        headerNormalized: 'status',
        headerTokens: ['status'],
        nonEmptyCount: 100,
        totalCount: 100,
        sampleValues: [],
        dataTypeDistribution: {
          stringRatio: 1,
          numberRatio: 0,
          integerRatio: 0,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0
        },
        distinctCountEstimate: 3,
        dominantType: 'string'
      }

      expect(getColumnCardinality(profile)).toBe(0.03)
    })
  })

  describe('isLikelyIdentifierColumn', () => {
    it('identifies high cardinality columns as identifiers', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Robot ID',
        headerNormalized: 'robot id',
        headerTokens: ['robot', 'id'],
        nonEmptyCount: 100,
        totalCount: 100,
        sampleValues: ['R001', 'R002', 'R003'],
        dataTypeDistribution: {
          stringRatio: 1,
          numberRatio: 0,
          integerRatio: 0,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0
        },
        distinctCountEstimate: 95,
        dominantType: 'string'
      }

      expect(isLikelyIdentifierColumn(profile)).toBe(true)
    })
  })

  describe('isLikelyCategoryColumn', () => {
    it('identifies low cardinality columns as categories', () => {
      const profile: ColumnProfile = {
        workbookId: 'test',
        sheetName: 'Sheet1',
        columnIndex: 0,
        headerRaw: 'Status',
        headerNormalized: 'status',
        headerTokens: ['status'],
        nonEmptyCount: 100,
        totalCount: 100,
        sampleValues: ['Active', 'Inactive', 'Pending'],
        dataTypeDistribution: {
          stringRatio: 1,
          numberRatio: 0,
          integerRatio: 0,
          dateRatio: 0,
          booleanRatio: 0,
          emptyRatio: 0
        },
        distinctCountEstimate: 5,
        dominantType: 'string'
      }

      expect(isLikelyCategoryColumn(profile)).toBe(true)
    })
  })

  describe('real-world header tokenization', () => {
    it('tokenizes simulation status headers correctly', () => {
      const headers = [
        'PERSONS RESPONSIBLE',
        'AREA',
        'ASSEMBLY LINE',
        'STATION',
        'ROBOT',
        'APPLICATION',
        'ROBOT POSITION - STAGE 1',
        'DCS CONFIGURED'
      ]

      for (const header of headers) {
        const tokens = tokenizeHeader(header)
        expect(tokens.length).toBeGreaterThan(0)
        expect(tokens.every(t => t.length > 0)).toBe(true)
      }
    })

    it('tokenizes gun force headers correctly', () => {
      const tokens = tokenizeHeader('Gun Force')
      expect(tokens).toContain('gun')
      expect(tokens).toContain('force')
      
      // With unit in brackets, unit should be removed
      const tokensWithUnit = tokenizeHeader('Gun Force [N]')
      expect(tokensWithUnit).toEqual(['gun', 'force'])
    })

    it('tokenizes robotnumber headers correctly', () => {
      const tokens = tokenizeHeader('Robotnumber (E-Number)')
      expect(tokens).toContain('robotnumber')
      // Parenthetical content (E-Number) is stripped out
      expect(tokens).toEqual(['robotnumber'])
      
      // Without parentheses, all parts are tokenized
      const tokensNoParens = tokenizeHeader('Robotnumber E-Number')
      expect(tokensNoParens).toContain('robotnumber')
      expect(tokensNoParens).toContain('e')
      expect(tokensNoParens).toContain('number')
    })
  })
})
