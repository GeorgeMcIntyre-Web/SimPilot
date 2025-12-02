import { describe, it, expect } from 'vitest'
import {
  matchFieldForColumn,
  matchAllColumns,
  getBestFieldId,
  findColumnsForField,
  buildFieldToColumnMap,
  getUnmatchedColumns,
  getLowConfidenceMatches,
  getMatchSummary,
  formatMatchResult,
  normalizeScore,
  DEFAULT_SCORING_CONFIG
} from '../fieldMatcher'
import { profileSheet, type SheetProfile } from '../sheetProfiler'
import type { ColumnProfile } from '../columnProfiler'
import { getAllFieldDescriptors } from '../fieldRegistry'

// Helper to create a mock column profile
function createMockProfile(
  headerRaw: string,
  dominantType: 'string' | 'number' | 'date' | 'boolean' | 'empty' | 'mixed' = 'string',
  columnIndex: number = 0
): ColumnProfile {
  const headerNormalized = headerRaw.toLowerCase().trim().replace(/\s+/g, ' ')
  const headerTokens = headerRaw.toLowerCase().split(/[\s_\-/]+/).filter(t => t.length > 0)

  return {
    workbookId: 'test-workbook',
    sheetName: 'Sheet1',
    columnIndex,
    headerRaw,
    headerNormalized,
    headerTokens,
    nonEmptyCount: 100,
    totalCount: 100,
    sampleValues: [],
    dataTypeDistribution: {
      stringRatio: dominantType === 'string' ? 1 : 0,
      numberRatio: dominantType === 'number' ? 1 : 0,
      integerRatio: dominantType === 'number' ? 0.5 : 0,
      dateRatio: dominantType === 'date' ? 1 : 0,
      booleanRatio: dominantType === 'boolean' ? 1 : 0,
      emptyRatio: dominantType === 'empty' ? 1 : 0
    },
    distinctCountEstimate: 50,
    dominantType
  }
}

describe('fieldMatcher', () => {
  describe('matchFieldForColumn', () => {
    const descriptors = getAllFieldDescriptors()

    it('matches exact canonical name', () => {
      const profile = createMockProfile('Area')
      const result = matchFieldForColumn(profile, descriptors)

      expect(result.bestMatch).toBeDefined()
      expect(result.bestMatch?.fieldId).toBe('area_name')
      expect(result.bestMatch?.score).toBeGreaterThan(40)
    })

    it('matches exact synonym', () => {
      const profile = createMockProfile('area name')
      const result = matchFieldForColumn(profile, descriptors)

      expect(result.bestMatch).toBeDefined()
      expect(result.bestMatch?.fieldId).toBe('area_name')
    })

    it('matches Gun Force (kN)', () => {
      const profile = createMockProfile('Gun Force (kN)', 'number')
      const result = matchFieldForColumn(profile, descriptors)

      expect(result.bestMatch).toBeDefined()
      expect(result.bestMatch?.fieldId).toBe('gun_force_kn')
    })

    it('matches gun force with unit [N]', () => {
      const profile = createMockProfile('Gun Force [N]', 'number')
      const result = matchFieldForColumn(profile, descriptors)

      expect(result.bestMatch).toBeDefined()
      // Should match either gun_force_n or gun_force_kn
      expect(['gun_force_kn', 'gun_force_n']).toContain(result.bestMatch?.fieldId)
    })

    it('matches Cell, CellName, VC Cell to cell_id', () => {
      const testCases = ['Cell', 'CellName', 'Cell Name', 'VC Cell', 'Cell ID']

      for (const header of testCases) {
        const profile = createMockProfile(header)
        const result = matchFieldForColumn(profile, descriptors)

        expect(result.bestMatch).toBeDefined()
        expect(result.bestMatch?.fieldId).toBe('cell_id')
      }
    })

    it('matches Robot ID variations', () => {
      const testCases = ['Robot ID', 'Robotnumber', 'Robot Number', 'E-Number']

      for (const header of testCases) {
        const profile = createMockProfile(header)
        const result = matchFieldForColumn(profile, descriptors)

        expect(result.bestMatch).toBeDefined()
        expect(['robot_id', 'robot_number']).toContain(result.bestMatch?.fieldId)
      }
    })

    it('matches Station variations', () => {
      const testCases = ['Station', 'Station Number', 'Station Code', 'STATION']

      for (const header of testCases) {
        const profile = createMockProfile(header)
        const result = matchFieldForColumn(profile, descriptors)

        expect(result.bestMatch).toBeDefined()
        expect(result.bestMatch?.fieldId).toBe('station_name')
      }
    })

    it('matches Assembly Line', () => {
      const profile = createMockProfile('Assembly Line')
      const result = matchFieldForColumn(profile, descriptors)

      expect(result.bestMatch).toBeDefined()
      expect(result.bestMatch?.fieldId).toBe('assembly_line')
    })

    it('matches person responsible variations', () => {
      const testCases = ['Persons Responsible', 'PERSON RESP.', 'Responsible']

      for (const header of testCases) {
        const profile = createMockProfile(header)
        const result = matchFieldForColumn(profile, descriptors)

        expect(result.bestMatch).toBeDefined()
        expect(result.bestMatch?.fieldId).toBe('person_responsible')
      }
    })

    it('returns no match for empty header', () => {
      const profile = createMockProfile('')
      const result = matchFieldForColumn(profile, descriptors)

      expect(result.bestMatch).toBeUndefined()
      expect(result.matches.length).toBe(0)
    })

    it('returns no match for nonsense header', () => {
      const profile = createMockProfile('XYZABC123')
      const result = matchFieldForColumn(profile, descriptors)

      expect(result.bestMatch).toBeUndefined()
    })

    it('provides match reasons', () => {
      const profile = createMockProfile('Gun Force')
      const result = matchFieldForColumn(profile, descriptors)

      expect(result.bestMatch?.reasons.length).toBeGreaterThan(0)
      expect(result.bestMatch?.reasons.some(r => r.includes('match'))).toBe(true)
    })

    it('returns multiple match candidates', () => {
      const profile = createMockProfile('Type')
      const result = matchFieldForColumn(profile, descriptors)

      // 'Type' could match robot_type, or others
      expect(result.matches.length).toBeGreaterThan(0)
    })

    it('applies type compatibility scoring', () => {
      // Numeric column for a field that expects numbers
      const numericProfile = createMockProfile('Gun Force', 'number')
      const numericResult = matchFieldForColumn(numericProfile, descriptors)

      // String column for the same field
      const stringProfile = createMockProfile('Gun Force', 'string')
      const stringResult = matchFieldForColumn(stringProfile, descriptors)

      // Numeric should score higher (or equal) due to type compatibility
      expect(numericResult.bestMatch?.score).toBeGreaterThanOrEqual(stringResult.bestMatch?.score ?? 0)
    })

    it('matches reuse allocation fields', () => {
      const testCases = [
        { header: 'Old Project', fieldId: 'old_project' },
        { header: 'New Line', fieldId: 'target_line' },
        { header: 'New Station', fieldId: 'target_station' },
        { header: 'New Sector', fieldId: 'target_sector' }
      ]

      for (const { header, fieldId } of testCases) {
        const profile = createMockProfile(header)
        const result = matchFieldForColumn(profile, descriptors)

        expect(result.bestMatch).toBeDefined()
        expect(result.bestMatch?.fieldId).toBe(fieldId)
      }
    })

    it('matches simulation status fields', () => {
      const testCases = [
        { header: '1st STAGE SIM COMPLETION', fieldId: 'stage_1_completion' },
        { header: 'FINAL DELIVERABLES', fieldId: 'final_deliverables' },
        { header: 'DCS CONFIGURED', fieldId: 'dcs_configured' }
      ]

      for (const { header, fieldId } of testCases) {
        const profile = createMockProfile(header, 'number')
        const result = matchFieldForColumn(profile, descriptors)

        expect(result.bestMatch).toBeDefined()
        expect(result.bestMatch?.fieldId).toBe(fieldId)
      }
    })

    it('matches typo synonyms from real Excel files', () => {
      const testCases = [
        { header: 'Proyect', fieldId: 'project_id' },  // Spanish typo
        { header: 'Coments', fieldId: 'comment' },      // Typo
        { header: 'refresment ok', fieldId: 'reuse_status' }  // Typo in real files
      ]

      for (const { header, fieldId } of testCases) {
        const profile = createMockProfile(header)
        const result = matchFieldForColumn(profile, descriptors)

        expect(result.bestMatch).toBeDefined()
        expect(result.bestMatch?.fieldId).toBe(fieldId)
      }
    })
  })

  describe('matchAllColumns', () => {
    it('matches all columns in a sheet profile', () => {
      const rows = [
        ['Area', 'Station', 'Robot', 'Application'],
        ['Front Unit', '010', 'R01', 'SW'],
        ['Rear Unit', '020', 'R02', 'MH']
      ]

      const sheetProfile = profileSheet(
        { sheetName: 'SIMULATION', rows },
        'test-workbook',
        0
      )

      const results = matchAllColumns(sheetProfile)

      expect(results.length).toBe(4)
      expect(results.some(r => r.bestMatch?.fieldId === 'area_name')).toBe(true)
      expect(results.some(r => r.bestMatch?.fieldId === 'station_name')).toBe(true)
    })
  })

  describe('getBestFieldId', () => {
    it('returns field ID for matched column', () => {
      const profile = createMockProfile('Area', 'string', 0)
      const results = [matchFieldForColumn(profile, getAllFieldDescriptors())]

      const fieldId = getBestFieldId(results, 0)

      expect(fieldId).toBe('area_name')
    })

    it('returns undefined for unmatched column', () => {
      const profile = createMockProfile('XYZABC', 'string', 0)
      const results = [matchFieldForColumn(profile, getAllFieldDescriptors())]

      const fieldId = getBestFieldId(results, 0)

      expect(fieldId).toBeUndefined()
    })

    it('returns undefined for out of bounds index', () => {
      const results: ReturnType<typeof matchFieldForColumn>[] = []

      const fieldId = getBestFieldId(results, 5)

      expect(fieldId).toBeUndefined()
    })
  })

  describe('findColumnsForField', () => {
    it('finds all columns matching a field', () => {
      const profiles = [
        createMockProfile('Area', 'string', 0),
        createMockProfile('Station', 'string', 1),
        createMockProfile('Area Name', 'string', 2)  // Another area column
      ]

      const results = profiles.map(p => matchFieldForColumn(p, getAllFieldDescriptors()))
      const areaColumns = findColumnsForField(results, 'area_name')

      expect(areaColumns.length).toBe(2)
    })
  })

  describe('buildFieldToColumnMap', () => {
    it('builds correct mapping', () => {
      const profiles = [
        createMockProfile('Area', 'string', 0),
        createMockProfile('Station', 'string', 1),
        createMockProfile('Robot', 'string', 2)
      ]

      const results = profiles.map(p => matchFieldForColumn(p, getAllFieldDescriptors()))
      const map = buildFieldToColumnMap(results)

      expect(map.get('area_name')).toEqual([0])
      expect(map.get('station_name')).toEqual([1])
    })
  })

  describe('getUnmatchedColumns', () => {
    it('returns unmatched columns', () => {
      const profiles = [
        createMockProfile('Area', 'string', 0),
        createMockProfile('XYZABC', 'string', 1),
        createMockProfile('Station', 'string', 2)
      ]

      const results = profiles.map(p => matchFieldForColumn(p, getAllFieldDescriptors()))
      const unmatched = getUnmatchedColumns(results)

      expect(unmatched.length).toBe(1)
      expect(unmatched[0].headerRaw).toBe('XYZABC')
    })
  })

  describe('getLowConfidenceMatches', () => {
    it('identifies low confidence matches', () => {
      const profiles = [
        createMockProfile('Area', 'string', 0),  // High confidence (exact match)
        createMockProfile('Note', 'string', 1)   // Lower confidence (partial match only)
      ]

      const results = profiles.map(p => matchFieldForColumn(p, getAllFieldDescriptors()))
      const lowConfidence = getLowConfidenceMatches(results, 40)

      // 'Note' (if matched) would have a lower confidence match
      // Check that we correctly identify matches below threshold
      const areaMatch = results.find(r => r.columnProfile.headerRaw === 'Area')
      expect(areaMatch?.bestMatch?.score).toBeGreaterThan(40)
      
      // Verify the function works correctly
      expect(lowConfidence.every(r => r.bestMatch !== undefined && r.bestMatch.score < 40)).toBe(true)
    })
  })

  describe('getMatchSummary', () => {
    it('provides correct summary statistics', () => {
      const profiles = [
        createMockProfile('Area', 'string', 0),
        createMockProfile('Station', 'string', 1),
        createMockProfile('XYZABC', 'string', 2)
      ]

      const results = profiles.map(p => matchFieldForColumn(p, getAllFieldDescriptors()))
      const summary = getMatchSummary(results)

      expect(summary.totalColumns).toBe(3)
      expect(summary.matchedColumns).toBe(2)
      expect(summary.unmatchedColumns).toBe(1)
      expect(summary.avgScore).toBeGreaterThan(0)
    })
  })

  describe('formatMatchResult', () => {
    it('formats matched result', () => {
      const profile = createMockProfile('Gun Force')
      const result = matchFieldForColumn(profile, getAllFieldDescriptors())
      const formatted = formatMatchResult(result)

      expect(formatted).toContain('Gun Force')
      expect(formatted).toContain('gun_force')
      expect(formatted).toContain('score')
    })

    it('formats unmatched result', () => {
      const profile = createMockProfile('XYZABC')
      const result = matchFieldForColumn(profile, getAllFieldDescriptors())
      const formatted = formatMatchResult(result)

      expect(formatted).toContain('XYZABC')
      expect(formatted).toContain('No match')
    })
  })

  describe('normalizeScore', () => {
    it('normalizes scores to 0-100 range', () => {
      expect(normalizeScore(50, 100)).toBe(50)
      expect(normalizeScore(100, 100)).toBe(100)
      expect(normalizeScore(150, 100)).toBe(100)
      expect(normalizeScore(-10, 100)).toBe(0)
    })

    it('handles custom max score', () => {
      expect(normalizeScore(25, 50)).toBe(50)
      expect(normalizeScore(10, 20)).toBe(50)
    })
  })

  describe('scoring configuration', () => {
    it('default config has reasonable values', () => {
      expect(DEFAULT_SCORING_CONFIG.exactCanonicalMatch).toBeGreaterThan(30)
      expect(DEFAULT_SCORING_CONFIG.exactSynonymMatch).toBeGreaterThan(20)
      expect(DEFAULT_SCORING_CONFIG.minimumMatchScore).toBeGreaterThan(0)
      expect(DEFAULT_SCORING_CONFIG.typeIncompatibilityPenalty).toBeLessThan(0)
    })

    it('custom scoring config affects results', () => {
      const profile = createMockProfile('Gun Force')
      const descriptors = getAllFieldDescriptors()

      const defaultResult = matchFieldForColumn(profile, descriptors)

      const customConfig = {
        ...DEFAULT_SCORING_CONFIG,
        exactSynonymMatch: 100  // Much higher
      }

      const customResult = matchFieldForColumn(profile, descriptors, customConfig)

      // Custom config should produce different score
      expect(customResult.bestMatch?.score).toBeGreaterThanOrEqual(defaultResult.bestMatch?.score ?? 0)
    })
  })

  describe('real-world Excel headers', () => {
    it('matches simulation status sheet headers', () => {
      const headers = [
        'PERSONS RESPONSIBLE',
        'AREA',
        'ASSEMBLY LINE',
        'STATION',
        'ROBOT',
        'APPLICATION'
      ]

      const profiles = headers.map((h, i) => createMockProfile(h, 'string', i))
      const results = profiles.map(p => matchFieldForColumn(p, getAllFieldDescriptors()))

      // All should have matches
      for (const result of results) {
        expect(result.bestMatch).toBeDefined()
      }
    })

    it('matches robot list sheet headers', () => {
      const headers = [
        'Index',
        'Position',
        'Assembly line',
        'Station Number',
        'Robot caption',
        'Robotnumber (E-Number)',
        'Gun number',
        'Transformer [kVA]'
      ]

      const profiles = headers.map((h, i) => createMockProfile(h, i >= 6 ? 'number' : 'string', i))
      const results = profiles.map(p => matchFieldForColumn(p, getAllFieldDescriptors()))

      // Most should have matches
      const matched = results.filter(r => r.bestMatch !== undefined)
      expect(matched.length).toBeGreaterThan(5)
    })

    it('matches gun force sheet headers', () => {
      const headers = [
        'Quantity',
        'Reserve',
        'Old Line',
        'Gun Number',
        'Gun Force [N]',
        'Area',
        'Robot Number',
        'Required Force'
      ]

      const profiles = headers.map((h, i) => {
        const isNumeric = ['Quantity', 'Reserve', 'Gun Force [N]', 'Required Force'].includes(h)
        return createMockProfile(h, isNumeric ? 'number' : 'string', i)
      })

      const results = profiles.map(p => matchFieldForColumn(p, getAllFieldDescriptors()))

      // Check specific matches
      const gunNumberResult = results.find(r => r.columnProfile.headerRaw === 'Gun Number')
      expect(gunNumberResult?.bestMatch?.fieldId).toBe('gun_number')

      const forceResult = results.find(r => r.columnProfile.headerRaw === 'Gun Force [N]')
      expect(forceResult?.bestMatch).toBeDefined()
      expect(['gun_force_n', 'gun_force_kn']).toContain(forceResult?.bestMatch?.fieldId)
    })

    it('matches reuse list headers', () => {
      const headers = [
        'Proyect',
        'Area',
        'Location',
        'Brand',
        'Height',
        'Standard',
        'Type',
        'Project STLA/P1H/O1H/LPM',
        'New Line',
        'New station',
        'Coments'
      ]

      const profiles = headers.map((h, i) => createMockProfile(h, 'string', i))
      const results = profiles.map(p => matchFieldForColumn(p, getAllFieldDescriptors()))

      // Proyect should match project_id (with typo)
      const proyectResult = results.find(r => r.columnProfile.headerRaw === 'Proyect')
      expect(proyectResult?.bestMatch?.fieldId).toBe('project_id')

      // Coments should match comment (with typo)
      const comentsResult = results.find(r => r.columnProfile.headerRaw === 'Coments')
      expect(comentsResult?.bestMatch?.fieldId).toBe('comment')

      // New Line should match target_line
      const newLineResult = results.find(r => r.columnProfile.headerRaw === 'New Line')
      expect(newLineResult?.bestMatch?.fieldId).toBe('target_line')
    })
  })

  describe('ambiguous header handling', () => {
    it('provides multiple candidates for ambiguous headers', () => {
      const profile = createMockProfile('Model')
      const result = matchFieldForColumn(profile, getAllFieldDescriptors())

      // 'Model' could match multiple fields
      expect(result.matches.length).toBeGreaterThan(0)
    })

    it('ranks candidates by score', () => {
      const profile = createMockProfile('Gun Force')
      const result = matchFieldForColumn(profile, getAllFieldDescriptors())

      if (result.matches.length > 1) {
        for (let i = 1; i < result.matches.length; i++) {
          expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score)
        }
      }
    })
  })
})
