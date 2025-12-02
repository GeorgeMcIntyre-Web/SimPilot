// Sheet Sniffer Unit Tests
// Tests the Smart Recon system for detecting sheet categories

import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  sniffSheet,
  scanWorkbook,
  categoryToFileKind,
  CATEGORY_KEYWORDS
} from '../sheetSniffer'

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a mock workbook with given sheets and data
 */
function createMockWorkbook(sheets: Record<string, string[][]>): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  for (const [sheetName, data] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  return workbook
}

// ============================================================================
// CATEGORY KEYWORDS TESTS
// ============================================================================

describe('CATEGORY_KEYWORDS', () => {
  it('contains the exact typo signatures from real files', () => {
    // REUSE_WELD_GUNS should have "Refresment OK" (NOT "Refreshment OK")
    const weldGunKeywords = CATEGORY_KEYWORDS.REUSE_WELD_GUNS.strong
    expect(weldGunKeywords).toContain('Refresment OK')

    // REUSE_RISERS should have "Proyect" (NOT "Project")
    const riserKeywords = CATEGORY_KEYWORDS.REUSE_RISERS.strong
    expect(riserKeywords).toContain('Proyect')

    // REUSE_RISERS should have "Coments" (NOT "Comments")
    expect(riserKeywords).toContain('Coments')
  })

  it('has SIMULATION_STATUS with expected strong keywords', () => {
    const simKeywords = CATEGORY_KEYWORDS.SIMULATION_STATUS.strong
    expect(simKeywords).toContain('1st STAGE SIM COMPLETION')
    expect(simKeywords).toContain('FINAL DELIVERABLES')
    expect(simKeywords).toContain('ROBOT POSITION - STAGE 1')
    // DCS CONFIGURED is now a weak keyword per updated spec
    expect(CATEGORY_KEYWORDS.SIMULATION_STATUS.weak).toContain('DCS CONFIGURED')
  })

  it('has IN_HOUSE_TOOLING with Sim. Leader pattern', () => {
    const toolingKeywords = CATEGORY_KEYWORDS.IN_HOUSE_TOOLING.strong
    expect(toolingKeywords).toContain('Sim. Leader')
    expect(toolingKeywords).toContain('Sim. Employee')
  })

  it('has GUN_FORCE with Gun Force pattern', () => {
    const gunForceKeywords = CATEGORY_KEYWORDS.GUN_FORCE.strong
    // 'Gun Force' matches both 'Gun Force' and 'Gun Force [N]' via substring match
    expect(gunForceKeywords).toContain('Gun Force')
    expect(gunForceKeywords).toContain('Gun Number')
  })
})

// ============================================================================
// SNIFF SHEET TESTS
// ============================================================================

describe('sniffSheet', () => {
  it('detects SIMULATION_STATUS from header keywords', () => {
    const workbook = createMockWorkbook({
      'SIMULATION': [
        ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION'],
        ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', 'PERSONS RESPONSIBLE', '', ''],
        ['Underbody', 'BN_B05', '010', 'R-01', 'Spot Welding']
      ]
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
        ['P1Mx', 'OP-20', 'WG-101', 'Pneumatic', 'Yes', 'SN-12345']
      ]
    })

    const result = sniffSheet(workbook, 'Welding guns')

    expect(result.category).toBe('REUSE_WELD_GUNS')
    expect(result.matchedKeywords).toContain('Refresment OK')
  })

  it('detects REUSE_RISERS with typo "Proyect"', () => {
    const workbook = createMockWorkbook({
      'Raisers': [
        ['Proyect', 'Area', 'Location', 'Brand', 'Height', 'New station', 'Coments'],
        ['STLA-S', 'Underbody', 'P1', 'ABC', '500', 'OP-30', 'Test comment']
      ]
    })

    const result = sniffSheet(workbook, 'Raisers')

    expect(result.category).toBe('REUSE_RISERS')
    expect(result.matchedKeywords).toContain('Proyect')
  })

  it('detects GUN_FORCE from Zangenpool-style headers', () => {
    const workbook = createMockWorkbook({
      'Zaragoza Allocation': [
        ['Gun Number', 'Gun Force [N]', 'Quantity', 'Reserve', 'Old Line', 'Robot Number', 'Area'],
        ['G-001', '4500', '2', '1', 'L-01', 'R-01', 'Underbody']
      ]
    })

    const result = sniffSheet(workbook, 'Zaragoza Allocation')

    expect(result.category).toBe('GUN_FORCE')
    // 'Gun Force' signature matches the 'Gun Force [N]' header via substring
    expect(result.matchedKeywords).toContain('Gun Force')
    expect(result.matchedKeywords).toContain('Gun Number')
  })

  it('detects IN_HOUSE_TOOLING from ToolList headers', () => {
    const workbook = createMockWorkbook({
      'ToolList': [
        ['Tool ID', 'Sim. Leader', 'Sim. Employee', 'Team Leader', 'Sim. Due Date (yyyy/MM/dd)'],
        ['T-001', 'John', 'Jane', 'Bob', '2024/06/15']
      ]
    })

    const result = sniffSheet(workbook, 'ToolList')

    expect(result.category).toBe('IN_HOUSE_TOOLING')
    expect(result.matchedKeywords).toContain('Sim. Leader')
  })

  it('detects ROBOT_SPECS from Robotlist headers', () => {
    const workbook = createMockWorkbook({
      'STLA-S': [
        ['Robotnumber', 'Robot caption', 'Robotnumber (E-Number)', 'Robot w/ J1-J3 Dress Pack (order code)'],
        ['R-001', 'Underbody Robot 1', 'E-12345', 'R-2000i/210F']
      ]
    })

    const result = sniffSheet(workbook, 'STLA-S')

    expect(result.category).toBe('ROBOT_SPECS')
    expect(result.matchedKeywords).toContain('Robotnumber')
  })

  it('returns UNKNOWN for sheets with no matching keywords', () => {
    const workbook = createMockWorkbook({
      'RandomSheet': [
        ['Column A', 'Column B', 'Column C'],
        ['Data 1', 'Data 2', 'Data 3']
      ]
    })

    const result = sniffSheet(workbook, 'RandomSheet')

    expect(result.category).toBe('UNKNOWN')
    expect(result.score).toBe(0)
  })

  it('skips Introduction sheets', () => {
    const workbook = createMockWorkbook({
      'Introduction': [
        ['Welcome to the STLA-S Project'],
        ['This file contains simulation data'],
        ['Area', 'Station', 'Robot'] // Even with some keywords, should skip
      ]
    })

    const result = sniffSheet(workbook, 'Introduction')

    expect(result.category).toBe('UNKNOWN')
  })

  it('skips ChangeIndex sheets', () => {
    const workbook = createMockWorkbook({
      'Change Index': [
        ['Version', 'Date', 'Author', 'Changes'],
        ['1.0', '2024-01-01', 'John', 'Initial']
      ]
    })

    const result = sniffSheet(workbook, 'Change Index')

    expect(result.category).toBe('UNKNOWN')
  })

  it('handles empty sheets gracefully', () => {
    const workbook = createMockWorkbook({
      'EmptySheet': []
    })

    // For empty sheet, sheetToMatrix might throw or return empty
    // The sniffer should handle this gracefully
    const result = sniffSheet(workbook, 'EmptySheet')

    expect(result.category).toBe('UNKNOWN')
    expect(result.score).toBe(0)
  })
})

// ============================================================================
// SCAN WORKBOOK TESTS
// ============================================================================

describe('scanWorkbook', () => {
  it('finds the best sheet across multiple sheets', () => {
    const workbook = createMockWorkbook({
      'Introduction': [
        ['Welcome', 'to', 'SimPilot']
      ],
      'SIMULATION': [
        ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION'],
        ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', 'PERSONS RESPONSIBLE', '', '']
      ],
      'Notes': [
        ['Some', 'random', 'notes']
      ]
    })

    const result = scanWorkbook(workbook)

    expect(result.bestOverall).not.toBeNull()
    expect(result.bestOverall?.category).toBe('SIMULATION_STATUS')
    expect(result.bestOverall?.sheetName).toBe('SIMULATION')
  })

  it('populates byCategory correctly', () => {
    const workbook = createMockWorkbook({
      'SIMULATION': [
        ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION'],
        ['1st STAGE SIM COMPLETION', 'FINAL DELIVERABLES', '', '', '']
      ],
      'ToolList': [
        ['Tool ID', 'Sim. Leader', 'Sim. Employee', 'Team Leader'],
        ['T-001', 'John', 'Jane', 'Bob']
      ]
    })

    const result = scanWorkbook(workbook)

    expect(result.byCategory.SIMULATION_STATUS).not.toBeNull()
    expect(result.byCategory.SIMULATION_STATUS?.sheetName).toBe('SIMULATION')

    expect(result.byCategory.IN_HOUSE_TOOLING).not.toBeNull()
    expect(result.byCategory.IN_HOUSE_TOOLING?.sheetName).toBe('ToolList')
  })

  it('handles workbook with only Introduction sheet', () => {
    const workbook = createMockWorkbook({
      'Introduction': [
        ['Welcome to the project'],
        ['Please see other tabs']
      ]
    })

    const result = scanWorkbook(workbook)

    expect(result.bestOverall).toBeNull()
    expect(result.allDetections).toHaveLength(0)
  })

  it('prefers higher-scoring sheets when multiple match same category', () => {
    // LowScoreSheet has only weak keywords (below minScore)
    // GunForceData has strong + medium keywords (above minScore)
    // Note: Don't use names like "Sheet1", "Sheet2" as they match skip patterns
    const workbook = createMockWorkbook({
      'LowScoreSheet': [
        // Only weak keywords: Gun (+1), Area (+1) = 2, below minScore of 5
        ['Gun', 'Area', 'Force']
      ],
      'GunForceData': [
        // Strong: Gun Number (+3), Gun Force [N] (+3)
        // Medium: Quantity (+2), Reserve (+2), Robot Number (+2)
        // Total = 12, above minScore of 5
        ['Gun Number', 'Gun Force [N]', 'Quantity', 'Reserve', 'Robot Number']
      ]
    })

    const result = scanWorkbook(workbook)

    // LowScoreSheet doesn't meet minScore (5), so only GunForceData should be detected
    expect(result.bestOverall).not.toBeNull()
    expect(result.bestOverall?.sheetName).toBe('GunForceData')
    expect(result.bestOverall?.category).toBe('GUN_FORCE')
    expect(result.bestOverall?.score).toBeGreaterThanOrEqual(5)
  })

  it('returns all non-UNKNOWN detections in allDetections', () => {
    const workbook = createMockWorkbook({
      'Intro': [['Welcome']],
      'SIMULATION': [
        ['AREA', 'STATION', 'ROBOT', '1st STAGE SIM COMPLETION', 'PERSONS RESPONSIBLE']
      ],
      'Raisers': [
        ['Proyect', 'Area', 'Height', 'New station', 'Coments']
      ],
      'Random': [['Col A', 'Col B']]
    })

    const result = scanWorkbook(workbook)

    // Should have SIMULATION_STATUS and REUSE_RISERS but not Intro or Random
    expect(result.allDetections.length).toBeGreaterThanOrEqual(2)
    expect(result.allDetections.some(d => d.category === 'SIMULATION_STATUS')).toBe(true)
    expect(result.allDetections.some(d => d.category === 'REUSE_RISERS')).toBe(true)
    expect(result.allDetections.some(d => d.category === 'UNKNOWN')).toBe(false)
  })
})

// ============================================================================
// CATEGORY TO FILE KIND TESTS
// ============================================================================

describe('categoryToFileKind', () => {
  it('maps SIMULATION_STATUS to SimulationStatus', () => {
    expect(categoryToFileKind('SIMULATION_STATUS')).toBe('SimulationStatus')
  })

  it('maps ROBOT_SPECS to RobotList', () => {
    expect(categoryToFileKind('ROBOT_SPECS')).toBe('RobotList')
  })

  it('maps tool categories to ToolList', () => {
    expect(categoryToFileKind('IN_HOUSE_TOOLING')).toBe('ToolList')
    expect(categoryToFileKind('REUSE_WELD_GUNS')).toBe('ToolList')
    expect(categoryToFileKind('GUN_FORCE')).toBe('ToolList')
    expect(categoryToFileKind('REUSE_RISERS')).toBe('ToolList')
  })

  it('maps METADATA to Metadata', () => {
    expect(categoryToFileKind('METADATA')).toBe('Metadata')
  })

  it('maps UNKNOWN to Unknown', () => {
    expect(categoryToFileKind('UNKNOWN')).toBe('Unknown')
  })
})

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('edge cases', () => {
  it('handles headers with mixed case', () => {
    const workbook = createMockWorkbook({
      'Data': [
        ['DEVICE NAME', 'refresment ok', 'Serial Number Complete WG'], // Mixed case
        ['WG-001', 'Yes', 'SN-123']
      ]
    })

    const result = sniffSheet(workbook, 'Data')

    expect(result.category).toBe('REUSE_WELD_GUNS')
  })

  it('handles headers with extra whitespace', () => {
    const workbook = createMockWorkbook({
      'Data': [
        ['  Gun Number  ', '  Gun Force [N]  ', 'Quantity'],
        ['G-001', '4500', '2']
      ]
    })

    const result = sniffSheet(workbook, 'Data')

    expect(result.category).toBe('GUN_FORCE')
  })

  it('handles partial keyword matches', () => {
    const workbook = createMockWorkbook({
      'Data': [
        ['My Gun Number Column', 'Force Value', 'Qty'],
        ['G-001', '4500', '2']
      ]
    })

    const result = sniffSheet(workbook, 'Data')

    // Should still match because "Gun Number" is contained in "My Gun Number Column"
    expect(result.score).toBeGreaterThan(0)
  })

  it('scans only first 10 rows by default', () => {
    // Create a sheet where header is on row 8 (0-indexed: 7)
    const rows: string[][] = Array(7).fill(['', '', ''])
    rows.push(['Gun Number', 'Gun Force [N]', 'Quantity'])
    rows.push(['G-001', '4500', '2'])

    const workbook = createMockWorkbook({
      'Data': rows
    })

    const result = sniffSheet(workbook, 'Data', 'test.xlsx', 10)

    expect(result.category).toBe('GUN_FORCE')
  })

  it('misses headers beyond scan limit', () => {
    // Create a sheet where header is on row 15 (beyond default 10)
    const rows: string[][] = Array(14).fill(['', '', ''])
    rows.push(['Gun Number', 'Gun Force [N]', 'Quantity'])
    rows.push(['G-001', '4500', '2'])

    const workbook = createMockWorkbook({
      'Data': rows
    })

    const result = sniffSheet(workbook, 'Data', 'test.xlsx', 10)

    // Should NOT detect because header is beyond scan limit
    expect(result.category).toBe('UNKNOWN')
  })
})
