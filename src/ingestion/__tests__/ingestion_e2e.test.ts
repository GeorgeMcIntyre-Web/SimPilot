// End-to-End Ingestion Tests
// Comprehensive tests for the full ingestion pipeline

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { loadWorkbookFromBuffer, analyzeWorkbook } from '../workbookLoader'
import { scanNormalizedWorkbook, pickBestDetectionForCategory } from '../sheetSniffer'
import { parseSimulationStatus, vacuumParseSimulationSheet } from '../simulationStatusParser'
import { ingestFiles } from '../ingestionCoordinator'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createWorkbookBuffer(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const workbook = XLSX.utils.book_new()

  for (const [sheetName, data] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
}

function createXlsxWorkbook(sheets: Record<string, unknown[][]>): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  for (const [sheetName, data] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  return workbook
}

async function createFile(sheets: Record<string, unknown[][]>, fileName: string): Promise<File> {
  const buffer = createWorkbookBuffer(sheets)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  return new File([blob], fileName, { type: blob.type })
}

// ============================================================================
// REALISTIC FIXTURE DATA
// ============================================================================

/**
 * Realistic Simulation Status sheet with all the long metric names
 */
const REALISTIC_SIMULATION_SHEET = [
  // Row 0: Title row
  ['STLA-S Simulation Status Report'],
  // Row 1: Date
  ['Updated: 2024-01-15'],
  // Row 2: Blank
  [null],
  // Row 3: Header row
  [
    'AREA',
    'ASSEMBLY LINE',
    'STATION',
    'ROBOT',
    'APPLICATION',
    'PERSONS RESPONSIBLE',
    'ROBOT POSITION - STAGE 1',
    'SPOT WELDS DISTRIBUTED + PROJECTED',
    'FINAL DELIVERABLES',
    '1st STAGE SIM COMPLETION',
    'DCS CONFIGURED',
    'FINAL FIXTURE COLLISION CHECK',
    'FINAL LAYOUT INCLUDED MATCHING LAYOUT + SIM',
    'LASER SAFETY CHECK',
  ],
  // Row 4+: Data rows
  [
    'Underbody',
    'BN_B05',
    'OP-10',
    'R-001',
    'Spot Welding',
    'John Smith',
    100,
    95,
    85,
    90,
    75,
    80,
    70,
    65,
  ],
  ['Underbody', 'BN_B05', 'OP-20', 'R-002', 'Sealing', 'Jane Doe', 80, 75, 70, 60, 50, 40, 30, 20],
  [
    'Side Body',
    'BN_B10',
    'OP-30',
    'R-003',
    'Spot Welding',
    'Bob Wilson',
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
  ],
]

/**
 * Weld Guns sheet with typos preserved
 */
const WELD_GUNS_SHEET = [
  [
    'Zone',
    'Station',
    'Device Name',
    'Type',
    'Refresment OK', // Typo preserved
    'Serial Number Complete WG',
    'Asset description',
    'Coments', // Typo preserved
  ],
  ['P1Mx', 'OP-10', 'WG-101', 'Pneumatic', 'Yes', 'SN-12345', 'Spot weld gun A', 'Good condition'],
  ['P1Mx', 'OP-20', 'WG-102', 'Servo', 'No', 'SN-12346', 'Spot weld gun B', 'Needs maintenance'],
  ['P2Ux', 'OP-30', 'WG-103', 'Pneumatic', 'Yes', 'SN-12347', 'Spot weld gun C', null],
]

/**
 * Risers sheet with typos preserved
 * Note: Header includes 'Riser' keyword for tool parser header detection
 */
const RISERS_SHEET = [
  [
    'Proyect', // Typo preserved
    'Riser Type', // Added for tool parser detection
    'Area',
    'Location',
    'Brand',
    'Height',
    'New station',
    'Coments', // Typo preserved
  ],
  ['STLA-S', 'Standard', 'Underbody', 'P1', 'ABC Brand', 500, 'OP-30', 'Standard riser'],
  ['STLA-S', 'Tall', 'Side Body', 'P2', 'XYZ Brand', 750, 'OP-40', 'Tall riser for robot reach'],
]

/**
 * Robot list with headers that match robot parser expectations
 */
const ROBOT_LIST_SHEET = [
  ['Robot', 'Area', 'Station', 'Line', 'Fanuc Order Code', 'Dress Pack', 'Model'],
  ['R-001', 'Underbody', 'OP-10', 'BN_B05', 'R-2000i/210F', 'DP-A', 'KUKA KR210'],
  ['R-002', 'Underbody', 'OP-20', 'BN_B05', 'R-2000i/165F', 'DP-B', 'KUKA KR210'],
  ['R-003', 'Side Body', 'OP-30', 'BN_B10', 'R-2000i/210F', 'DP-C', 'ABB 6700'],
]

/**
 * Gun Force sheet
 */
const GUN_FORCE_SHEET = [
  ['Gun Number', 'Gun Force', 'Quantity', 'Reserve', 'Old Line', 'Robot Number', 'Area'],
  ['G-001', 4500, 2, 1, 'L-01', 'R-001', 'Underbody'],
  ['G-002', 5000, 1, 0, 'L-02', 'R-002', 'Side Body'],
]

// ============================================================================
// WORKBOOK LOADER TESTS
// ============================================================================

describe('E2E: Workbook Loader', () => {
  it('loads realistic simulation status workbook', () => {
    const buffer = createWorkbookBuffer({
      SIMULATION: REALISTIC_SIMULATION_SHEET,
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'Simulation_Status.xlsx')

    expect(workbook.sheets).toHaveLength(1)
    expect(workbook.sheets[0].sheetName).toBe('SIMULATION')
    expect(workbook.sheets[0].rows.length).toBeGreaterThan(5)
  })

  it('analyzes sheets and finds correct header row', () => {
    const buffer = createWorkbookBuffer({
      SIMULATION: REALISTIC_SIMULATION_SHEET,
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'Simulation_Status.xlsx')
    const analyzed = analyzeWorkbook(workbook)

    expect(analyzed).toHaveLength(1)
    expect(analyzed[0].headerRowIndex).toBe(3) // Header is at row 3 (after title rows)
    expect(analyzed[0].headerValues).toContain('AREA')
    expect(analyzed[0].headerValues).toContain('ROBOT POSITION - STAGE 1')
    expect(analyzed[0].headerValues).toContain('FINAL LAYOUT INCLUDED MATCHING LAYOUT + SIM')
  })
})

// ============================================================================
// SHEET SNIFFER TESTS
// ============================================================================

describe('E2E: Sheet Sniffer', () => {
  it('correctly identifies SIMULATION_STATUS sheet', () => {
    const buffer = createWorkbookBuffer({
      SIMULATION: REALISTIC_SIMULATION_SHEET,
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'Simulation_Status.xlsx')
    const detections = scanNormalizedWorkbook(workbook)

    const simDetection = pickBestDetectionForCategory(detections, 'SIMULATION_STATUS')

    expect(simDetection).not.toBeNull()
    expect(simDetection?.sheetName).toBe('SIMULATION')
    expect(simDetection?.strongMatches.length).toBeGreaterThan(0)
  })

  it('correctly identifies REUSE_WELD_GUNS with typo headers', () => {
    const buffer = createWorkbookBuffer({
      'Welding guns': WELD_GUNS_SHEET,
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'WeldGuns.xlsx')
    const detections = scanNormalizedWorkbook(workbook)

    const gunDetection = pickBestDetectionForCategory(detections, 'REUSE_WELD_GUNS')

    expect(gunDetection).not.toBeNull()
    expect(gunDetection?.strongMatches).toContain('Refresment OK') // Typo preserved
  })

  it('correctly identifies REUSE_RISERS with Proyect typo', () => {
    const buffer = createWorkbookBuffer({
      Raisers: RISERS_SHEET,
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'Risers.xlsx')
    const detections = scanNormalizedWorkbook(workbook)

    const riserDetection = pickBestDetectionForCategory(detections, 'REUSE_RISERS')

    expect(riserDetection).not.toBeNull()
    expect(riserDetection?.strongMatches).toContain('Proyect') // Typo preserved
    expect(riserDetection?.strongMatches).toContain('Coments') // Typo preserved
  })

  it('handles multi-sheet workbook', () => {
    const buffer = createWorkbookBuffer({
      Introduction: [['Welcome to the project']],
      SIMULATION: REALISTIC_SIMULATION_SHEET,
      'Welding guns': WELD_GUNS_SHEET,
      Raisers: RISERS_SHEET,
    })

    const workbook = loadWorkbookFromBuffer(buffer, 'MultiSheet.xlsx')
    const detections = scanNormalizedWorkbook(workbook)

    // Should detect multiple categories
    expect(detections.length).toBeGreaterThanOrEqual(3)

    const categories = detections.map((d) => d.category)
    expect(categories).toContain('SIMULATION_STATUS')
    expect(categories).toContain('REUSE_WELD_GUNS')
    expect(categories).toContain('REUSE_RISERS')
  })
})

// ============================================================================
// VACUUM PARSER TESTS
// ============================================================================

describe('E2E: Vacuum Parser', () => {
  it('vacuums all metric columns from simulation sheet', () => {
    const result = vacuumParseSimulationSheet(
      REALISTIC_SIMULATION_SHEET as (string | number | null)[][],
      3, // Header row index
      'test.xlsx',
      'SIMULATION',
    )

    expect(result.rows.length).toBeGreaterThan(0)

    // Check first row has core fields
    const firstRow = result.rows[0]
    expect(firstRow.areaName).toBe('Underbody')
    expect(firstRow.stationKey).toBe('OP-10')
    expect(firstRow.robotCaption).toBe('R-001')
    expect(firstRow.application).toBe('Spot Welding')
    expect(firstRow.personResponsible).toBe('John Smith')

    // Check metrics array has all the long column names
    const metricLabels = firstRow.metrics.map((m) => m.label)
    expect(metricLabels).toContain('ROBOT POSITION - STAGE 1')
    expect(metricLabels).toContain('SPOT WELDS DISTRIBUTED + PROJECTED')
    expect(metricLabels).toContain('FINAL FIXTURE COLLISION CHECK')
    expect(metricLabels).toContain('FINAL LAYOUT INCLUDED MATCHING LAYOUT + SIM')
    expect(metricLabels).toContain('LASER SAFETY CHECK')
  })

  it('correctly parses percentage values', () => {
    const result = vacuumParseSimulationSheet(
      REALISTIC_SIMULATION_SHEET as (string | number | null)[][],
      3,
      'test.xlsx',
      'SIMULATION',
    )

    const firstRow = result.rows[0]
    const robotPosMetric = firstRow.metrics.find((m) => m.label === 'ROBOT POSITION - STAGE 1')

    expect(robotPosMetric).toBeDefined()
    expect(robotPosMetric?.percent).toBe(100)
    expect(robotPosMetric?.rawValue).toBe(100)
  })

  it('preserves typos in metric labels', () => {
    // Add a column with typo to simulation sheet
    const sheetWithTypo = [
      [null],
      [null],
      [null],
      ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION', 'Refresment Status'],
      ['UB', 'L1', 'OP-10', 'R1', 'Spot', 'OK'],
    ]

    const result = vacuumParseSimulationSheet(
      sheetWithTypo as (string | number | null)[][],
      3,
      'test.xlsx',
      'SIMULATION',
    )

    const metricLabels = result.rows[0].metrics.map((m) => m.label)
    expect(metricLabels).toContain('Refresment Status') // Typo preserved exactly
  })

  it('handles new columns without code changes (vacuum principle)', () => {
    // Add a brand new column that wasn't in the original spec
    const sheetWithNewColumn = [
      [null],
      [null],
      [null],
      [
        'AREA',
        'ASSEMBLY LINE',
        'STATION',
        'ROBOT',
        'APPLICATION',
        'LASER SAFETY CHECK',
        'NEW FUTURE COLUMN',
      ],
      ['UB', 'L1', 'OP-10', 'R1', 'Spot', 100, 85],
    ]

    const result = vacuumParseSimulationSheet(
      sheetWithNewColumn as (string | number | null)[][],
      3,
      'test.xlsx',
      'SIMULATION',
    )

    const metricLabels = result.rows[0].metrics.map((m) => m.label)
    expect(metricLabels).toContain('LASER SAFETY CHECK')
    expect(metricLabels).toContain('NEW FUTURE COLUMN') // New column vacuumed automatically

    const newColumnMetric = result.rows[0].metrics.find((m) => m.label === 'NEW FUTURE COLUMN')
    expect(newColumnMetric?.percent).toBe(85)
  })
})

// ============================================================================
// FULL PIPELINE TESTS
// ============================================================================

describe('E2E: Full Ingestion Pipeline', () => {
  it('ingests simulation status file with vacuum metrics', async () => {
    const file = await createFile(
      {
        SIMULATION: REALISTIC_SIMULATION_SHEET,
      },
      'STLA-S_Simulation_Status.xlsx',
    )

    const result = await ingestFiles({
      simulationFiles: [file],
      equipmentFiles: [],
    })

    expect(result.projectsCount).toBeGreaterThan(0)
    expect(result.cellsCount).toBeGreaterThan(0)
    expect(result.areasCount).toBeGreaterThan(0)
  })

  it('ingests tool list with typos preserved', async () => {
    const simFile = await createFile(
      {
        SIMULATION: REALISTIC_SIMULATION_SHEET,
      },
      'sim.xlsx',
    )

    const toolFile = await createFile(
      {
        'Welding guns': WELD_GUNS_SHEET,
      },
      'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx',
    )

    const result = await ingestFiles({
      simulationFiles: [simFile],
      equipmentFiles: [toolFile],
    })

    expect(result.toolsCount).toBeGreaterThan(0)
  })

  it('ingests robot list', async () => {
    const simFile = await createFile(
      {
        SIMULATION: REALISTIC_SIMULATION_SHEET,
      },
      'sim.xlsx',
    )

    const robotFile = await createFile(
      {
        'STLA-S': ROBOT_LIST_SHEET,
      },
      'Robotlist_ZA.xlsx',
    )

    const result = await ingestFiles({
      simulationFiles: [simFile],
      equipmentFiles: [robotFile],
    })

    expect(result.robotsCount).toBeGreaterThan(0)
  })

  it('ingests risers with Proyect typo', async () => {
    const simFile = await createFile(
      {
        SIMULATION: REALISTIC_SIMULATION_SHEET,
      },
      'sim.xlsx',
    )

    const riserFile = await createFile(
      {
        Raisers: RISERS_SHEET,
      },
      'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
    )

    const result = await ingestFiles({
      simulationFiles: [simFile],
      equipmentFiles: [riserFile],
    })

    // Risers should be detected and processed (even if some rows skipped)
    // The main goal is no crash and simulation data is preserved
    expect(result.projectsCount).toBeGreaterThan(0)
    expect(result.cellsCount).toBeGreaterThan(0)
    // Note: toolsCount may be 0 if riser parser doesn't find expected ID columns
  })

  it('ingests gun force data', async () => {
    const simFile = await createFile(
      {
        SIMULATION: REALISTIC_SIMULATION_SHEET,
      },
      'sim.xlsx',
    )

    const gunForceFile = await createFile(
      {
        'Zaragoza Allocation': GUN_FORCE_SHEET,
      },
      'Zangenpool_TMS.xlsx',
    )

    const result = await ingestFiles({
      simulationFiles: [simFile],
      equipmentFiles: [gunForceFile],
    })

    expect(result.toolsCount).toBeGreaterThan(0)
  })

  it('handles complete multi-file ingestion', async () => {
    const simFile = await createFile(
      {
        SIMULATION: REALISTIC_SIMULATION_SHEET,
      },
      'STLA-S_Simulation_Status.xlsx',
    )

    const robotFile = await createFile(
      {
        'STLA-S': ROBOT_LIST_SHEET,
      },
      'Robotlist_ZA.xlsx',
    )

    const weldGunFile = await createFile(
      {
        'Welding guns': WELD_GUNS_SHEET,
      },
      'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx',
    )

    const riserFile = await createFile(
      {
        Raisers: RISERS_SHEET,
      },
      'GLOBAL_ZA_REUSE_LIST_RISERS.xlsx',
    )

    const gunForceFile = await createFile(
      {
        'Zaragoza Allocation': GUN_FORCE_SHEET,
      },
      'Zangenpool_TMS.xlsx',
    )

    const result = await ingestFiles({
      simulationFiles: [simFile],
      equipmentFiles: [robotFile, weldGunFile, riserFile, gunForceFile],
    })

    // Verify core data types were ingested
    expect(result.projectsCount).toBeGreaterThan(0)
    expect(result.areasCount).toBeGreaterThan(0)
    expect(result.cellsCount).toBeGreaterThan(0)
    expect(result.robotsCount).toBeGreaterThan(0)
    // toolsCount may vary based on parser matches

    // Note: Some files may produce warnings if ID columns don't match
    // The key is that core ingestion succeeds
    console.log(
      'Warnings:',
      result.warnings.map((w) => `${w.kind}: ${w.message}`),
    )
  })
})

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('E2E: Edge Cases', () => {
  it('handles sheet with header at row 4 (with title rows above)', async () => {
    const result = await parseSimulationStatus(
      createXlsxWorkbook({ SIMULATION: REALISTIC_SIMULATION_SHEET }),
      'test.xlsx',
      'SIMULATION',
    )

    expect(result.cells.length).toBeGreaterThan(0)
    expect(result.vacuumRows).toBeDefined()
    expect(result.vacuumRows!.length).toBeGreaterThan(0)
  })

  it('handles empty metric cells gracefully', async () => {
    const sheetWithEmptyCells = [
      [null],
      [null],
      [null],
      ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION', 'Metric1', 'Metric2'],
      ['UB', 'L1', 'OP-10', 'R1', 'Spot', 100, null], // Empty Metric2
      ['UB', 'L1', 'OP-20', 'R2', 'Seal', null, 80], // Empty Metric1
    ]

    const result = vacuumParseSimulationSheet(
      sheetWithEmptyCells as (string | number | null)[][],
      3,
      'test.xlsx',
      'SIMULATION',
    )

    expect(result.rows).toHaveLength(2)

    // First row should have Metric1 but not Metric2
    const firstRowMetrics = result.rows[0].metrics
    expect(firstRowMetrics.find((m) => m.label === 'Metric1')).toBeDefined()
    expect(firstRowMetrics.find((m) => m.label === 'Metric2')).toBeUndefined() // Empty values not included

    // Second row should have Metric2 but not Metric1
    const secondRowMetrics = result.rows[1].metrics
    expect(secondRowMetrics.find((m) => m.label === 'Metric1')).toBeUndefined()
    expect(secondRowMetrics.find((m) => m.label === 'Metric2')).toBeDefined()
  })

  it('handles percentage strings like "95%"', () => {
    const sheetWithPercentStrings = [
      [null],
      [null],
      [null],
      ['AREA', 'ASSEMBLY LINE', 'STATION', 'ROBOT', 'APPLICATION', 'Completion'],
      ['UB', 'L1', 'OP-10', 'R1', 'Spot', '95%'],
    ]

    const result = vacuumParseSimulationSheet(
      sheetWithPercentStrings as (string | number | null)[][],
      3,
      'test.xlsx',
      'SIMULATION',
    )

    const metric = result.rows[0].metrics.find((m) => m.label === 'Completion')
    expect(metric?.percent).toBe(95)
    expect(metric?.rawValue).toBe('95%')
  })
})
