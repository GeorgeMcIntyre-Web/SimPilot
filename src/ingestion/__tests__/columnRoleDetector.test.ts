// Column Role Detector Unit Tests
// Tests the vacuum logic for detecting column roles

import { describe, it, expect } from 'vitest'
import {
  detectColumnRole,
  analyzeHeaderRow,
  interpretRow,
  getColumnForRole,
  getValueByRole,
  getStringByRole,
  hasRole,
  getRoleDisplayName,
  getRoleColorClass,
  ColumnRole
} from '../columnRoleDetector'

// ============================================================================
// DETECT COLUMN ROLE TESTS
// ============================================================================

describe('detectColumnRole', () => {
  describe('identity columns', () => {
    it('detects GUN_NUMBER from various formats', () => {
      expect(detectColumnRole('Gun Number').role).toBe('GUN_NUMBER')
      expect(detectColumnRole('Gun No').role).toBe('GUN_NUMBER')
      expect(detectColumnRole('Gun ID').role).toBe('GUN_NUMBER')
      expect(detectColumnRole('GUN').role).toBe('GUN_NUMBER')
      expect(detectColumnRole('WG Number').role).toBe('GUN_NUMBER')
    })

    it('detects DEVICE_NAME correctly', () => {
      expect(detectColumnRole('Device Name').role).toBe('DEVICE_NAME')
      expect(detectColumnRole('Device ID').role).toBe('DEVICE_NAME')
      expect(detectColumnRole('Asset description').role).toBe('DEVICE_NAME')
    })

    it('detects ROBOT_ID from various formats', () => {
      expect(detectColumnRole('Robotnumber').role).toBe('ROBOT_ID')
      expect(detectColumnRole('Robot Number').role).toBe('ROBOT_ID')
      expect(detectColumnRole('Robot ID').role).toBe('ROBOT_ID')
      expect(detectColumnRole('Robot caption').role).toBe('ROBOT_ID')
      expect(detectColumnRole('Robotnumber (E-Number)').role).toBe('ROBOT_ID')
    })

    it('detects SERIAL_NUMBER', () => {
      expect(detectColumnRole('Serial Number Complete WG').role).toBe('SERIAL_NUMBER')
      expect(detectColumnRole('Serial Number').role).toBe('SERIAL_NUMBER')
      expect(detectColumnRole('S/N').role).toBe('SERIAL_NUMBER')
    })
  })

  describe('location columns', () => {
    it('detects AREA correctly', () => {
      expect(detectColumnRole('Area').role).toBe('AREA')
      expect(detectColumnRole('Area Name').role).toBe('AREA')
      expect(detectColumnRole('Area Code').role).toBe('AREA')
    })

    it('detects STATION correctly', () => {
      expect(detectColumnRole('Station').role).toBe('STATION')
      expect(detectColumnRole('Station Code').role).toBe('STATION')
      expect(detectColumnRole('New station').role).toBe('STATION')
    })

    it('detects LINE_CODE correctly', () => {
      expect(detectColumnRole('Assembly Line').role).toBe('LINE_CODE')
      expect(detectColumnRole('Line Code').role).toBe('LINE_CODE')
      expect(detectColumnRole('Line').role).toBe('LINE_CODE')
      expect(detectColumnRole('New Line').role).toBe('LINE_CODE')
    })
  })

  describe('status columns with typos', () => {
    it('detects REUSE_STATUS with typo "Refresment OK"', () => {
      const result = detectColumnRole('Refresment OK')
      expect(result.role).toBe('REUSE_STATUS')
      expect(result.confidence).toBe('HIGH')
    })

    it('detects PROJECT with typo "Proyect"', () => {
      const result = detectColumnRole('Proyect')
      expect(result.role).toBe('PROJECT')
      expect(result.confidence).toBe('HIGH')
    })

    it('detects COMMENTS with typo "Coments"', () => {
      const result = detectColumnRole('Coments')
      expect(result.role).toBe('COMMENTS')
      expect(result.confidence).toBe('MEDIUM')
    })
  })

  describe('technical columns', () => {
    it('detects GUN_FORCE correctly', () => {
      expect(detectColumnRole('Gun Force [N]').role).toBe('GUN_FORCE')
      expect(detectColumnRole('Gun Force').role).toBe('GUN_FORCE')
      expect(detectColumnRole('Force').role).toBe('GUN_FORCE')
    })

    it('detects OEM_MODEL from various formats', () => {
      expect(detectColumnRole('Robot w/ J1-J3 Dress Pack (order code)').role).toBe('OEM_MODEL')
      expect(detectColumnRole('Fanuc Order Code').role).toBe('OEM_MODEL')
      expect(detectColumnRole('OEM Model').role).toBe('OEM_MODEL')
    })

    it('detects HEIGHT correctly', () => {
      expect(detectColumnRole('Height').role).toBe('HEIGHT')
      expect(detectColumnRole('Riser Height').role).toBe('HEIGHT')
    })
  })

  describe('personnel columns', () => {
    it('detects ENGINEER correctly', () => {
      expect(detectColumnRole('Persons Responsible').role).toBe('ENGINEER')
      expect(detectColumnRole('Engineer').role).toBe('ENGINEER')
      expect(detectColumnRole('Assigned To').role).toBe('ENGINEER')
    })

    it('detects SIM_LEADER correctly', () => {
      expect(detectColumnRole('Sim. Leader').role).toBe('SIM_LEADER')
      expect(detectColumnRole('Sim Leader').role).toBe('SIM_LEADER')
    })
  })

  describe('date columns', () => {
    it('detects DUE_DATE with various formats', () => {
      expect(detectColumnRole('Sim. Due Date (yyyy/MM/dd)').role).toBe('DUE_DATE')
      expect(detectColumnRole('Due Date').role).toBe('DUE_DATE')
      expect(detectColumnRole('Deadline').role).toBe('DUE_DATE')
    })
  })

  describe('confidence levels', () => {
    it('returns HIGH confidence for exact matches', () => {
      expect(detectColumnRole('Gun Number').confidence).toBe('HIGH')
      expect(detectColumnRole('Device Name').confidence).toBe('HIGH')
    })

    it('returns MEDIUM confidence for partial matches on strong keywords', () => {
      expect(detectColumnRole('My Gun Number Here').confidence).toBe('MEDIUM')
    })

    it('returns LOW confidence for unknown columns', () => {
      expect(detectColumnRole('Random Column').confidence).toBe('LOW')
    })
  })

  describe('edge cases', () => {
    it('handles empty headers', () => {
      const result = detectColumnRole('')
      expect(result.role).toBe('UNKNOWN')
      expect(result.explanation).toBe('Empty header')
    })

    it('handles null/undefined input', () => {
      // @ts-expect-error Testing null input
      expect(detectColumnRole(null).role).toBe('UNKNOWN')
      // @ts-expect-error Testing undefined input
      expect(detectColumnRole(undefined).role).toBe('UNKNOWN')
    })

    it('is case-insensitive', () => {
      expect(detectColumnRole('GUN NUMBER').role).toBe('GUN_NUMBER')
      expect(detectColumnRole('gun number').role).toBe('GUN_NUMBER')
      expect(detectColumnRole('Gun Number').role).toBe('GUN_NUMBER')
    })

    it('handles underscores and hyphens', () => {
      expect(detectColumnRole('Gun-Number').role).toBe('GUN_NUMBER')
      expect(detectColumnRole('Gun_Number').role).toBe('GUN_NUMBER')
    })
  })
})

// ============================================================================
// ANALYZE HEADER ROW TESTS
// ============================================================================

describe('analyzeHeaderRow', () => {
  it('analyzes a complete header row', () => {
    const headers = [
      'Gun Number',
      'Gun Force [N]',
      'Area',
      'Station',
      'Refresment OK',
      'Unknown Column'
    ]

    const schema = analyzeHeaderRow(headers, 'TestSheet', 0)

    expect(schema.sheetName).toBe('TestSheet')
    expect(schema.headerRowIndex).toBe(0)
    expect(schema.columns.length).toBe(6)

    // Check specific columns
    expect(schema.columns[0].role).toBe('GUN_NUMBER')
    expect(schema.columns[1].role).toBe('GUN_FORCE')
    expect(schema.columns[2].role).toBe('AREA')
    expect(schema.columns[3].role).toBe('STATION')
    expect(schema.columns[4].role).toBe('REUSE_STATUS')
    expect(schema.columns[5].role).toBe('UNKNOWN')
  })

  it('populates roleMap correctly', () => {
    const headers = ['Gun Number', 'Area', 'Station', 'Line Code']
    const schema = analyzeHeaderRow(headers)

    expect(schema.roleMap.get('GUN_NUMBER')).toEqual([0])
    expect(schema.roleMap.get('AREA')).toEqual([1])
    expect(schema.roleMap.get('STATION')).toEqual([2])
    expect(schema.roleMap.get('LINE_CODE')).toEqual([3])
  })

  it('tracks unknown columns separately', () => {
    const headers = ['Gun Number', 'Random A', 'Area', 'Random B']
    const schema = analyzeHeaderRow(headers)

    expect(schema.unknownColumns.length).toBe(2)
    expect(schema.unknownColumns[0].headerText).toBe('Random A')
    expect(schema.unknownColumns[1].headerText).toBe('Random B')
  })

  it('calculates coverage correctly', () => {
    const headers = ['Gun Number', 'Area', 'Unknown', '']
    const schema = analyzeHeaderRow(headers)

    // 3 non-empty headers, 2 known, 1 unknown
    expect(schema.coverage.total).toBe(3)
    expect(schema.coverage.known).toBe(2)
    expect(schema.coverage.unknown).toBe(1)
    expect(schema.coverage.percentage).toBe(67) // 2/3 ≈ 67%
  })

  it('handles duplicate role columns', () => {
    const headers = ['Gun Number', 'Gun ID', 'Gun'] // All map to GUN_NUMBER
    const schema = analyzeHeaderRow(headers)

    const gunIndices = schema.roleMap.get('GUN_NUMBER')
    expect(gunIndices).toEqual([0, 1, 2])
  })
})

// ============================================================================
// INTERPRET ROW TESTS
// ============================================================================

describe('interpretRow', () => {
  it('maps row values to roles', () => {
    const headers = ['Gun Number', 'Area', 'Station', 'Refresment OK']
    const schema = analyzeHeaderRow(headers)

    const row = ['G-101', 'Underbody', 'OP-20', 'Yes']
    const result = interpretRow(row, 5, schema)

    expect(result.rowIndex).toBe(5)
    expect(result.mappings.length).toBe(4)

    const gunMapping = result.mappings.find(m => m.role === 'GUN_NUMBER')
    expect(gunMapping?.formattedValue).toBe('G-101')

    const areaMapping = result.mappings.find(m => m.role === 'AREA')
    expect(areaMapping?.formattedValue).toBe('Underbody')
  })

  it('builds a human-readable summary', () => {
    const headers = ['Gun Number', 'Station', 'Area', 'Refresment OK']
    const schema = analyzeHeaderRow(headers)

    const row = ['G-101', 'OP-20', 'Underbody', 'CARRY OVER']
    const result = interpretRow(row, 0, schema)

    expect(result.summary).toContain('ID: G-101')
    expect(result.summary).toContain('Station: OP-20')
    expect(result.summary).toContain('Area: Underbody')
  })

  it('handles null values', () => {
    const headers = ['Gun Number', 'Area']
    const schema = analyzeHeaderRow(headers)

    const row = ['G-101', null]
    const result = interpretRow(row, 0, schema)

    const areaMapping = result.mappings.find(m => m.role === 'AREA')
    expect(areaMapping?.formattedValue).toBe('')
  })

  it('formats boolean values', () => {
    const headers = ['Gun Number', 'Active']
    const schema = analyzeHeaderRow(headers)

    const row = ['G-101', true]
    const result = interpretRow(row, 0, schema)

    expect(result.rawValues[1]).toBe(true)
  })

  it('formats number values', () => {
    const headers = ['Gun Number', 'Gun Force [N]']
    const schema = analyzeHeaderRow(headers)

    const row = ['G-101', 4500.123]
    const result = interpretRow(row, 0, schema)

    const forceMapping = result.mappings.find(m => m.role === 'GUN_FORCE')
    expect(forceMapping?.formattedValue).toBe('4500.12')
  })
})

// ============================================================================
// ROLE UTILITY TESTS
// ============================================================================

describe('role utilities', () => {
  const headers = ['Gun Number', 'Area', 'Station', 'Line Code']
  const schema = analyzeHeaderRow(headers)
  const row = ['G-101', 'Underbody', 'OP-20', 'BN_B05']

  describe('getColumnForRole', () => {
    it('returns the column index for a role', () => {
      expect(getColumnForRole(schema, 'GUN_NUMBER')).toBe(0)
      expect(getColumnForRole(schema, 'AREA')).toBe(1)
      expect(getColumnForRole(schema, 'STATION')).toBe(2)
    })

    it('returns null for missing roles', () => {
      expect(getColumnForRole(schema, 'ROBOT_ID')).toBeNull()
      expect(getColumnForRole(schema, 'UNKNOWN')).toBeNull()
    })
  })

  describe('getValueByRole', () => {
    it('returns the raw value for a role', () => {
      expect(getValueByRole(row, schema, 'GUN_NUMBER')).toBe('G-101')
      expect(getValueByRole(row, schema, 'AREA')).toBe('Underbody')
    })

    it('returns null for missing roles', () => {
      expect(getValueByRole(row, schema, 'ROBOT_ID')).toBeNull()
    })
  })

  describe('getStringByRole', () => {
    it('returns formatted string value', () => {
      expect(getStringByRole(row, schema, 'GUN_NUMBER')).toBe('G-101')
      expect(getStringByRole(row, schema, 'AREA')).toBe('Underbody')
    })

    it('returns empty string for missing roles', () => {
      expect(getStringByRole(row, schema, 'ROBOT_ID')).toBe('')
    })
  })

  describe('hasRole', () => {
    it('returns true for present roles', () => {
      expect(hasRole(schema, 'GUN_NUMBER')).toBe(true)
      expect(hasRole(schema, 'AREA')).toBe(true)
    })

    it('returns false for missing roles', () => {
      expect(hasRole(schema, 'ROBOT_ID')).toBe(false)
      expect(hasRole(schema, 'GUN_FORCE')).toBe(false)
    })
  })
})

// ============================================================================
// DISPLAY HELPER TESTS
// ============================================================================

describe('display helpers', () => {
  describe('getRoleDisplayName', () => {
    it('returns human-readable names', () => {
      expect(getRoleDisplayName('GUN_NUMBER')).toBe('Gun Number')
      expect(getRoleDisplayName('REUSE_STATUS')).toBe('Reuse Status')
      expect(getRoleDisplayName('OEM_MODEL')).toBe('OEM Model')
      expect(getRoleDisplayName('UNKNOWN')).toBe('Unknown')
    })
  })

  describe('getRoleColorClass', () => {
    it('returns blue for identity columns', () => {
      const blueClass = getRoleColorClass('GUN_NUMBER')
      expect(blueClass).toContain('blue')
    })

    it('returns green for location columns', () => {
      const greenClass = getRoleColorClass('AREA')
      expect(greenClass).toContain('green')
    })

    it('returns orange for status columns', () => {
      const orangeClass = getRoleColorClass('REUSE_STATUS')
      expect(orangeClass).toContain('orange')
    })

    it('returns yellow for unknown columns', () => {
      const yellowClass = getRoleColorClass('UNKNOWN')
      expect(yellowClass).toContain('yellow')
    })
  })
})
