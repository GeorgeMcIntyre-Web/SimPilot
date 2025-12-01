// Workbook Loader Tests
// Tests for workbook loading, header detection, and sheet analysis

import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  loadWorkbookFromBuffer,
  loadWorkbook,
  detectHeaderRow,
  toAnalyzedSheet,
  analyzeWorkbook,
  type NormalizedSheet,
  type NormalizedWorkbook
} from '../workbookLoader'

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create an in-memory workbook and return its buffer
 */
function createWorkbookBuffer(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const workbook = XLSX.utils.book_new()

  for (const [sheetName, data] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  // XLSX.write with type: 'array' returns ArrayBuffer directly
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return buffer
}

/**
 * Create a File object from a workbook
 */
function createFileFromSheets(
  sheets: Record<string, unknown[][]>,
  fileName: string
): File {
  const buffer = createWorkbookBuffer(sheets)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  return new File([blob], fileName, { type: blob.type })
}

/**
 * Create a NormalizedSheet for testing
 */
function createNormalizedSheet(
  sheetName: string,
  rows: (string | number | null)[][]
): NormalizedSheet {
  return { sheetName, rows }
}

// ============================================================================
// WORKBOOK LOADING TESTS
// ============================================================================

describe('loadWorkbookFromBuffer', () => {
  describe('single sheet workbooks', () => {
    it('loads a simple workbook with one sheet', () => {
      const buffer = createWorkbookBuffer({
        'Sheet1': [
          ['Name', 'Value'],
          ['Test', 123]
        ]
      })

      const result = loadWorkbookFromBuffer(buffer, 'test.xlsx')

      expect(result.fileName).toBe('test.xlsx')
      expect(result.sheets).toHaveLength(1)
      expect(result.sheets[0].sheetName).toBe('Sheet1')
      expect(result.sheets[0].rows).toHaveLength(2)
    })

    it('normalizes cell values correctly', () => {
      const buffer = createWorkbookBuffer({
        'Data': [
          ['String', 123, null, true, '  trimmed  ']
        ]
      })

      const result = loadWorkbookFromBuffer(buffer, 'test.xlsx')
      const row = result.sheets[0].rows[0]

      expect(row[0]).toBe('String')      // String preserved
      expect(row[1]).toBe(123)           // Number preserved
      expect(row[2]).toBe(null)          // Null preserved
      expect(row[3]).toBe(1)             // Boolean → 1
      expect(row[4]).toBe('trimmed')     // String trimmed
    })

    it('preserves line breaks in headers', () => {
      const buffer = createWorkbookBuffer({
        'Data': [
          ['Header With\nLine Break', 'Normal Header'],
          ['Data 1', 'Data 2']
        ]
      })

      const result = loadWorkbookFromBuffer(buffer, 'test.xlsx')
      const headerRow = result.sheets[0].rows[0]

      expect(headerRow[0]).toBe('Header With\nLine Break')
    })

    it('drops trailing empty rows', () => {
      const buffer = createWorkbookBuffer({
        'Data': [
          ['Header1', 'Header2'],
          ['Data', 'More Data'],
          [null, null],
          [null, null]
        ]
      })

      const result = loadWorkbookFromBuffer(buffer, 'test.xlsx')

      expect(result.sheets[0].rows).toHaveLength(2)
    })
  })

  describe('multi-sheet workbooks', () => {
    it('loads workbook with multiple sheets', () => {
      const buffer = createWorkbookBuffer({
        'Sheet1': [['A', 'B'], [1, 2]],
        'Sheet2': [['X', 'Y'], [3, 4]],
        'Sheet3': [['M', 'N'], [5, 6]]
      })

      const result = loadWorkbookFromBuffer(buffer, 'multi.xlsx')

      expect(result.sheets).toHaveLength(3)
      expect(result.sheets.map(s => s.sheetName)).toEqual(['Sheet1', 'Sheet2', 'Sheet3'])
    })

    it('handles sheets with different column counts', () => {
      const buffer = createWorkbookBuffer({
        'Wide': [['A', 'B', 'C', 'D', 'E']],
        'Narrow': [['X', 'Y']]
      })

      const result = loadWorkbookFromBuffer(buffer, 'test.xlsx')

      expect(result.sheets[0].rows[0]).toHaveLength(5)
      expect(result.sheets[1].rows[0]).toHaveLength(2)
    })
  })

  describe('error handling', () => {
    it('returns empty sheets array for empty buffer', () => {
      const result = loadWorkbookFromBuffer(new ArrayBuffer(0), 'empty.xlsx')

      expect(result.fileName).toBe('empty.xlsx')
      expect(result.sheets).toHaveLength(0)
    })

    it('returns empty sheets array for unknown file type', () => {
      const randomBuffer = new ArrayBuffer(100)
      new Uint8Array(randomBuffer).fill(0x00)

      const result = loadWorkbookFromBuffer(randomBuffer, 'unknown.bin')

      expect(result.sheets).toHaveLength(0)
    })

    it('handles corrupted xlsx gracefully', () => {
      // Create buffer with xlsx magic bytes but corrupted content
      const buffer = new ArrayBuffer(100)
      const view = new Uint8Array(buffer)
      view[0] = 0x50 // P
      view[1] = 0x4B // K
      view[2] = 0x03
      view[3] = 0x04
      // Rest is garbage

      const result = loadWorkbookFromBuffer(buffer, 'corrupted.xlsx')

      expect(result.sheets).toHaveLength(0)
    })
  })
})

describe('loadWorkbook (async)', () => {
  it('loads workbook from File object', async () => {
    const file = createFileFromSheets(
      { 'TestSheet': [['Header'], ['Data']] },
      'test.xlsx'
    )

    const result = await loadWorkbook(file)

    expect(result.fileName).toBe('test.xlsx')
    expect(result.sheets).toHaveLength(1)
  })

  it('loads workbook from Blob with filename override', async () => {
    const buffer = createWorkbookBuffer({ 'Data': [['A'], [1]] })
    const blob = new Blob([buffer])

    const result = await loadWorkbook(blob, 'override.xlsx')

    expect(result.fileName).toBe('override.xlsx')
  })
})

// ============================================================================
// HEADER DETECTION TESTS
// ============================================================================

describe('detectHeaderRow', () => {
  describe('header at row 0', () => {
    it('detects header at first row', () => {
      const sheet = createNormalizedSheet('Data', [
        ['Name', 'Age', 'City'],
        ['John', 30, 'NYC']
      ])

      const result = detectHeaderRow(sheet)

      expect(result).toBe(0)
    })

    it('requires at least 3 non-empty cells', () => {
      const sheet = createNormalizedSheet('Data', [
        ['A', 'B'],  // Only 2 cells - not a header
        ['X', 'Y', 'Z']  // 3 cells - valid header
      ])

      const result = detectHeaderRow(sheet)

      expect(result).toBe(1)
    })

    it('requires all non-empty cells to be strings', () => {
      const sheet = createNormalizedSheet('Data', [
        [123, 'Header', 'Another'],  // First cell is number
        ['A', 'B', 'C']  // All strings
      ])

      const result = detectHeaderRow(sheet)

      expect(result).toBe(1)
    })
  })

  describe('header with title rows above', () => {
    it('detects header at row 4 with title rows above', () => {
      const sheet = createNormalizedSheet('Data', [
        ['Company Report'],           // Title row
        ['Date: 2024-01-01'],          // Info row
        [null],                        // Empty row
        ['Author: John'],              // Another info row
        ['Name', 'Value', 'Status', 'Notes'],  // Header row (index 4)
        ['Item 1', 100, 'OK', 'Test']  // Data row
      ])

      const result = detectHeaderRow(sheet)

      expect(result).toBe(4)
    })

    it('picks row with most non-empty cells when multiple candidates exist', () => {
      const sheet = createNormalizedSheet('Data', [
        ['A', 'B', 'C'],           // 3 cells
        ['X', 'Y', 'Z', 'W', 'V']  // 5 cells - should win
      ])

      const result = detectHeaderRow(sheet)

      expect(result).toBe(1)
    })
  })

  describe('no valid header', () => {
    it('returns null for empty sheet', () => {
      const sheet = createNormalizedSheet('Empty', [])

      const result = detectHeaderRow(sheet)

      expect(result).toBeNull()
    })

    it('returns null when no row has 3+ string cells', () => {
      const sheet = createNormalizedSheet('Numbers', [
        [1, 2, 3, 4],
        [5, 6, 7, 8]
      ])

      const result = detectHeaderRow(sheet)

      expect(result).toBeNull()
    })

    it('returns null when all rows have less than 3 cells', () => {
      const sheet = createNormalizedSheet('Sparse', [
        ['A', 'B'],
        ['X', 'Y']
      ])

      const result = detectHeaderRow(sheet)

      expect(result).toBeNull()
    })
  })

  describe('scan limit', () => {
    it('respects maxRows parameter', () => {
      const rows: (string | number | null)[][] = []

      // 15 rows of numbers
      for (let i = 0; i < 15; i++) {
        rows.push([i, i + 1, i + 2])
      }

      // Header at row 12 (beyond default limit)
      rows[12] = ['Header1', 'Header2', 'Header3']

      const sheet = createNormalizedSheet('Deep', rows)

      // Default scan (10 rows) shouldn't find it
      expect(detectHeaderRow(sheet, 10)).toBeNull()

      // Extended scan should find it
      expect(detectHeaderRow(sheet, 15)).toBe(12)
    })
  })
})

// ============================================================================
// TO ANALYZED SHEET TESTS
// ============================================================================

describe('toAnalyzedSheet', () => {
  describe('successful analysis', () => {
    it('creates analyzed sheet with header and data rows', () => {
      const sheet = createNormalizedSheet('Data', [
        ['Name', 'Value', 'Status'],
        ['Item 1', 100, 'OK'],
        ['Item 2', 200, 'Pending']
      ])

      const result = toAnalyzedSheet(sheet)

      expect(result).not.toBeNull()
      expect(result!.sheetName).toBe('Data')
      expect(result!.headerRowIndex).toBe(0)
      expect(result!.headerValues).toEqual(['Name', 'Value', 'Status'])
      expect(result!.dataRows).toHaveLength(2)
    })

    it('preserves header typos exactly', () => {
      // Test with real-world typos from STLA files
      const sheet = createNormalizedSheet('WeldGuns', [
        ['Proyect', 'Refresment OK', 'Coments'],
        ['STLA-S', 'Yes', 'Test']
      ])

      const result = toAnalyzedSheet(sheet)

      expect(result!.headerValues).toEqual(['Proyect', 'Refresment OK', 'Coments'])
    })

    it('handles header row with empty cells', () => {
      const sheet = createNormalizedSheet('Data', [
        ['A', null, 'C', 'D', null, 'F'],
        [1, 2, 3, 4, 5, 6]
      ])

      const result = toAnalyzedSheet(sheet)

      expect(result!.headerValues).toEqual(['A', '', 'C', 'D', '', 'F'])
    })

    it('handles header row after title rows', () => {
      const sheet = createNormalizedSheet('Report', [
        ['Project Report'],
        ['Generated: 2024-01-01'],
        [null],
        ['Area', 'Station', 'Robot', 'Status'],
        ['UB', 'OP-10', 'R-01', 'OK']
      ])

      const result = toAnalyzedSheet(sheet)

      expect(result!.headerRowIndex).toBe(3)
      expect(result!.headerValues).toEqual(['Area', 'Station', 'Robot', 'Status'])
      expect(result!.dataRows).toHaveLength(1)
    })

    it('drops trailing empty data rows', () => {
      const sheet = createNormalizedSheet('Data', [
        ['A', 'B', 'C'],
        [1, 2, 3],
        [4, 5, 6],
        [null, null, null],
        [null, null, null]
      ])

      const result = toAnalyzedSheet(sheet)

      expect(result!.dataRows).toHaveLength(2)
    })
  })

  describe('failed analysis', () => {
    it('returns null when no header row found', () => {
      const sheet = createNormalizedSheet('Numbers', [
        [1, 2, 3],
        [4, 5, 6]
      ])

      const result = toAnalyzedSheet(sheet)

      expect(result).toBeNull()
    })

    it('returns null for empty sheet', () => {
      const sheet = createNormalizedSheet('Empty', [])

      const result = toAnalyzedSheet(sheet)

      expect(result).toBeNull()
    })
  })
})

// ============================================================================
// ANALYZE WORKBOOK TESTS
// ============================================================================

describe('analyzeWorkbook', () => {
  it('analyzes all sheets with valid headers', () => {
    const workbook: NormalizedWorkbook = {
      fileName: 'multi.xlsx',
      sheets: [
        createNormalizedSheet('Data1', [
          ['A', 'B', 'C'],
          [1, 2, 3]
        ]),
        createNormalizedSheet('Data2', [
          ['X', 'Y', 'Z'],
          [4, 5, 6]
        ])
      ]
    }

    const result = analyzeWorkbook(workbook)

    expect(result).toHaveLength(2)
    expect(result[0].sheetName).toBe('Data1')
    expect(result[1].sheetName).toBe('Data2')
  })

  it('skips sheets without valid headers', () => {
    const workbook: NormalizedWorkbook = {
      fileName: 'mixed.xlsx',
      sheets: [
        createNormalizedSheet('GoodSheet', [
          ['Header1', 'Header2', 'Header3'],
          ['data', 'data', 'data']
        ]),
        createNormalizedSheet('BadSheet', [
          [1, 2, 3],  // No string headers
          [4, 5, 6]
        ])
      ]
    }

    const result = analyzeWorkbook(workbook)

    expect(result).toHaveLength(1)
    expect(result[0].sheetName).toBe('GoodSheet')
  })

  it('returns empty array for workbook with no analyzable sheets', () => {
    const workbook: NormalizedWorkbook = {
      fileName: 'empty.xlsx',
      sheets: []
    }

    const result = analyzeWorkbook(workbook)

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// REAL-WORLD SCENARIOS
// ============================================================================

describe('real-world scenarios', () => {
  it('handles Simulation Status file structure', () => {
    const buffer = createWorkbookBuffer({
      'SIMULATION': [
        ['STLA-S Project'],  // Title row
        ['Updated: 2024-01-15'],  // Info row
        [null],  // Blank row
        ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION', 'PERSONS RESPONSIBLE'],
        ['Underbody', 'BN_B05', 'OP-10', 'R-01', 'Spot Welding', 'John']
      ]
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'Simulation_Status.xlsx')
    const analyzed = analyzeWorkbook(workbook)

    expect(analyzed).toHaveLength(1)
    expect(analyzed[0].headerRowIndex).toBe(3)
    expect(analyzed[0].headerValues).toContain('AREA')
    expect(analyzed[0].headerValues).toContain('PERSONS RESPONSIBLE')
  })

  it('handles Weld Guns file with typos', () => {
    const buffer = createWorkbookBuffer({
      'Welding guns': [
        ['Zone', 'Station', 'Device Name', 'Type', 'Refresment OK', 'Serial Number Complete WG', 'Coments'],
        ['P1Mx', 'OP-20', 'WG-101', 'Pneumatic', 'Yes', 'SN-12345', 'Good condition']
      ]
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx')
    const analyzed = analyzeWorkbook(workbook)

    expect(analyzed).toHaveLength(1)
    // Typos preserved exactly
    expect(analyzed[0].headerValues).toContain('Refresment OK')
    expect(analyzed[0].headerValues).toContain('Coments')
  })

  it('handles Risers file with "Proyect" typo', () => {
    const buffer = createWorkbookBuffer({
      'Raisers': [
        ['Proyect', 'Area', 'Location', 'Brand', 'Height', 'New station', 'Coments'],
        ['STLA-S', 'Underbody', 'P1', 'ABC', 500, 'OP-30', 'Test comment']
      ]
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx')
    const analyzed = analyzeWorkbook(workbook)

    expect(analyzed).toHaveLength(1)
    expect(analyzed[0].headerValues[0]).toBe('Proyect')  // Typo preserved
  })

  it('handles Robot list with line breaks in headers', () => {
    const buffer = createWorkbookBuffer({
      'STLA-S': [
        ['Robotnumber\n(E-Number)', 'Robot caption', 'Station Number', 'Fanuc order code'],
        ['E-12345', 'UB Robot 1', 'OP-10', 'R-2000i/210F']
      ]
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'Robotlist_ZA.xlsx')
    const analyzed = analyzeWorkbook(workbook)

    expect(analyzed).toHaveLength(1)
    expect(analyzed[0].headerValues[0]).toBe('Robotnumber\n(E-Number)')  // Line break preserved
  })
})
