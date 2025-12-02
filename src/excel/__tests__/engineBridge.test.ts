import { describe, it, expect } from 'vitest'
import {
  fieldIdToColumnRole,
  columnRoleToFieldIds,
  scoreSheetByFieldSignatures,
  detectCategoryByFields,
  profileAndMatchSheet,
  buildRoleMapFromMatchResults,
  generateDiagnosticReport
} from '../engineBridge'
import { profileSheet } from '../sheetProfiler'
import { matchAllColumns } from '../fieldMatcher'

describe('engineBridge', () => {
  describe('fieldIdToColumnRole', () => {
    it('maps identity fields correctly', () => {
      expect(fieldIdToColumnRole('tool_id')).toBe('TOOL_ID')
      expect(fieldIdToColumnRole('robot_id')).toBe('ROBOT_ID')
      expect(fieldIdToColumnRole('gun_number')).toBe('GUN_NUMBER')
      expect(fieldIdToColumnRole('device_name')).toBe('DEVICE_NAME')
    })

    it('maps location fields correctly', () => {
      expect(fieldIdToColumnRole('area_name')).toBe('AREA')
      expect(fieldIdToColumnRole('station_name')).toBe('STATION')
      expect(fieldIdToColumnRole('assembly_line')).toBe('LINE_CODE')
      expect(fieldIdToColumnRole('cell_id')).toBe('CELL')
    })

    it('maps technical fields correctly', () => {
      expect(fieldIdToColumnRole('gun_force_kn')).toBe('GUN_FORCE')
      expect(fieldIdToColumnRole('gun_force_n')).toBe('GUN_FORCE')
      expect(fieldIdToColumnRole('payload_kg')).toBe('PAYLOAD')
      expect(fieldIdToColumnRole('reach_mm')).toBe('REACH')
    })

    it('returns UNKNOWN for unmapped fields', () => {
      expect(fieldIdToColumnRole('target_project')).toBe('UNKNOWN')
      expect(fieldIdToColumnRole('old_line')).toBe('UNKNOWN')
    })
  })

  describe('columnRoleToFieldIds', () => {
    it('finds field IDs for common roles', () => {
      const areaFields = columnRoleToFieldIds('AREA')
      expect(areaFields).toContain('area_name')

      const stationFields = columnRoleToFieldIds('STATION')
      expect(stationFields).toContain('station_name')

      const gunForceFields = columnRoleToFieldIds('GUN_FORCE')
      expect(gunForceFields).toContain('gun_force_kn')
      expect(gunForceFields).toContain('gun_force_n')
    })

    it('returns empty array for roles with no mapped fields', () => {
      const unknownFields = columnRoleToFieldIds('UNKNOWN')
      expect(unknownFields).toEqual([])
    })
  })

  describe('scoreSheetByFieldSignatures', () => {
    it('scores simulation status sheet correctly', () => {
      const rows = [
        ['Area', 'Station', 'Robot', 'Application', 'DCS Configured'],
        ['Front Unit', '010', 'R01', 'SW', '100']
      ]

      const profile = profileSheet(
        { sheetName: 'SIMULATION', rows },
        'test-workbook'
      )
      const matchResults = matchAllColumns(profile)
      const scores = scoreSheetByFieldSignatures(matchResults)

      expect(scores.get('SIMULATION_STATUS')).toBeGreaterThan(0)
    })

    it('scores robot specs sheet correctly', () => {
      const rows = [
        ['Robot Number', 'Robot Type', 'Payload', 'Reach'],
        ['R01', 'M-2000iC', '165', '2655']
      ]

      const profile = profileSheet(
        { sheetName: 'Robots', rows },
        'test-workbook'
      )
      const matchResults = matchAllColumns(profile)
      const scores = scoreSheetByFieldSignatures(matchResults)

      expect(scores.get('ROBOT_SPECS')).toBeGreaterThan(0)
    })

    it('scores gun force sheet correctly', () => {
      const rows = [
        ['Gun Number', 'Gun Force [N]', 'Quantity', 'Reserve'],
        ['KAA32400S', '3600', '5', '2']
      ]

      const profile = profileSheet(
        { sheetName: 'GunInfo', rows },
        'test-workbook'
      )
      const matchResults = matchAllColumns(profile)
      const scores = scoreSheetByFieldSignatures(matchResults)

      expect(scores.get('GUN_FORCE')).toBeGreaterThan(0)
    })
  })

  describe('detectCategoryByFields', () => {
    it('detects simulation status category', () => {
      const rows = [
        ['Area', 'Station', 'Robot', 'Application', '1st Stage Sim Completion'],
        ['Front Unit', '010', 'R01', 'SW', '100']
      ]

      const profile = profileSheet(
        { sheetName: 'SIMULATION', rows },
        'test-workbook'
      )
      const matchResults = matchAllColumns(profile)
      const category = detectCategoryByFields(matchResults)

      expect(category).toBe('SIMULATION_STATUS')
    })

    it('detects robot specs category', () => {
      const rows = [
        ['Robot Number', 'Robot Type', 'Fanuc order code', 'Payload'],
        ['R01', 'M-2000iC', 'G3+ R210F', '165']
      ]

      const profile = profileSheet(
        { sheetName: 'Robots', rows },
        'test-workbook'
      )
      const matchResults = matchAllColumns(profile)
      const category = detectCategoryByFields(matchResults)

      expect(category).toBe('ROBOT_SPECS')
    })

    it('returns UNKNOWN for unrecognizable sheets', () => {
      const rows = [
        ['Col1', 'Col2', 'Col3'],
        ['Val1', 'Val2', 'Val3']
      ]

      const profile = profileSheet(
        { sheetName: 'Unknown', rows },
        'test-workbook'
      )
      const matchResults = matchAllColumns(profile)
      const category = detectCategoryByFields(matchResults)

      expect(category).toBe('UNKNOWN')
    })
  })

  describe('profileAndMatchSheet', () => {
    it('returns profile, match results, and field map', () => {
      const rows = [
        ['Area', 'Station', 'Robot'],
        ['Front Unit', '010', 'R01']
      ]

      const result = profileAndMatchSheet(
        { sheetName: 'Test', rows },
        'test-workbook'
      )

      expect(result.profile).toBeDefined()
      expect(result.profile.sheetName).toBe('Test')
      expect(result.matchResults).toBeDefined()
      expect(result.matchResults.length).toBe(3)
      expect(result.fieldMap).toBeDefined()
      expect(result.fieldMap.size).toBeGreaterThan(0)
    })
  })

  describe('buildRoleMapFromMatchResults', () => {
    it('builds correct role map', () => {
      const rows = [
        ['Area', 'Station', 'Gun Force'],
        ['Front Unit', '010', '3500']
      ]

      const profile = profileSheet(
        { sheetName: 'Test', rows },
        'test-workbook'
      )
      const matchResults = matchAllColumns(profile)
      const roleMap = buildRoleMapFromMatchResults(matchResults)

      expect(roleMap.get('AREA')).toEqual([0])
      expect(roleMap.get('STATION')).toEqual([1])
      expect(roleMap.get('GUN_FORCE')).toEqual([2])
    })
  })

  describe('generateDiagnosticReport', () => {
    it('generates readable diagnostic output', () => {
      const rows = [
        ['Area', 'Station', 'Robot', 'Application'],
        ['Front Unit', '010', 'R01', 'SW']
      ]

      const profile = profileSheet(
        { sheetName: 'SIMULATION', rows },
        'test-workbook'
      )
      const matchResults = matchAllColumns(profile)
      const report = generateDiagnosticReport(profile, matchResults)

      expect(report).toContain('Sheet Profile')
      expect(report).toContain('SIMULATION')
      expect(report).toContain('Column Matches')
      expect(report).toContain('area_name')
      expect(report).toContain('station_name')
      expect(report).toContain('Category Detection')
    })
  })

  describe('real-world sheet detection', () => {
    it('correctly identifies simulation status sheets', () => {
      const rows = [
        ['PERSONS RESPONSIBLE', 'AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION', 'ROBOT POSITION - STAGE 1', 'DCS CONFIGURED'],
        ['John Doe', 'WHR LH', 'BN_B05', '010', 'R01', 'H+W', '100', '50']
      ]

      const profile = profileSheet({ sheetName: 'SIMULATION', rows }, 'test')
      const matchResults = matchAllColumns(profile)
      const category = detectCategoryByFields(matchResults)

      expect(category).toBe('SIMULATION_STATUS')
    })

    it('correctly identifies robot list sheets', () => {
      const rows = [
        ['Index', 'Position', 'Assembly line', 'Station Number', 'Robot caption', 'Robotnumber (E-Number)', 'Tools', 'Robot Type'],
        ['1', '1', 'AL_B09', '010', 'R01', 'E-87822', 'HW+W', 'R-2000iC/210F']
      ]

      const profile = profileSheet({ sheetName: 'STLA-S', rows }, 'test')
      const matchResults = matchAllColumns(profile)
      const category = detectCategoryByFields(matchResults)

      expect(category).toBe('ROBOT_SPECS')
    })

    it('correctly identifies gun force sheets', () => {
      const rows = [
        ['Quantity', 'Reserve', 'Old Line', 'Gun Number', 'Gun Force [N]', 'Area', 'Robot Number'],
        ['5', '2', 'P1Mx', 'KAA32400S', '3600', 'Front Unit', 'R01']
      ]

      const profile = profileSheet({ sheetName: 'Zaragoza', rows }, 'test')
      const matchResults = matchAllColumns(profile)
      const category = detectCategoryByFields(matchResults)

      expect(category).toBe('GUN_FORCE')
    })
  })
})
