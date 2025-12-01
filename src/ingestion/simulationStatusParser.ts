// Simulation Status Parser
// Parses Excel Simulation Status files into Projects, Areas, and Cells

import * as XLSX from 'xlsx'
import {
  Project,
  Area,
  Cell,
  SimulationStatus,
  generateId,
  deriveCellStatus,
  IngestionWarning
} from '../domain/core'
import {
  sheetToMatrix,
  findHeaderRow,
  buildColumnMap,
  getCellString,
  getCellNumber,
  isEmptyRow,
  isTotalRow
} from './excelUtils'
import { createRowSkippedWarning, createParserErrorWarning } from './warningUtils'

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedSimulationRow {
  engineer?: string
  areaName: string
  lineCode: string
  stationCode: string
  robotName?: string
  application?: string
  stageMetrics: Record<string, number>
  sourceRowIndex: number
}

export interface SimulationStatusResult {
  projects: Project[]
  areas: Area[]
  cells: Cell[]
  warnings: IngestionWarning[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const REQUIRED_HEADERS = [
  'AREA',
  'ASSEMBLY LINE',
  'STATION',
  'ROBOT',
  'APPLICATION'
]

// Key stage columns we care about for completion percentage
const KEY_STAGE_COLUMNS = [
  'ROBOT POSITION - STAGE 1',
  'DCS CONFIGURED',
  'DRESS PACK & FRYING PAN CONFIGURED - STAGE 1',
  'ROBOT TYPE CONFIRMED',
  'ROBOT RISER CONFIRMED'
]

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse a Simulation Status Excel file into domain entities
 * 
 * @param workbook - The Excel workbook to parse
 * @param fileName - Name of the file (for warnings and metadata)
 * @param targetSheetName - Optional: specific sheet to parse (bypasses auto-detection)
 */
export async function parseSimulationStatus(
  workbook: XLSX.WorkBook,
  fileName: string,
  targetSheetName?: string
): Promise<SimulationStatusResult> {
  const warnings: IngestionWarning[] = []

  // Use provided sheet name or auto-detect
  const sheetName = targetSheetName ?? findSimulationSheet(workbook)
  if (!sheetName) {
    throw new Error(`No SIMULATION sheet found in ${fileName}. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }

  // Validate that the target sheet exists
  if (workbook.SheetNames.includes(sheetName) === false) {
    throw new Error(`Sheet "${sheetName}" not found in ${fileName}. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }

  // Convert to matrix
  const rows = sheetToMatrix(workbook, sheetName)
  if (rows.length < 5) {
    throw new Error(`Sheet "${sheetName}" has too few rows (${rows.length}). Expected at least 5 rows.`)
  }

  // Find header row
  const headerRowIndex = findHeaderRow(rows, REQUIRED_HEADERS)
  console.log(`[Parser] Header row index: ${headerRowIndex}`)
  if (headerRowIndex === null) {
    throw new Error(`Could not find header row with required columns: ${REQUIRED_HEADERS.join(', ')}`)
  }

  // Build column map
  const headerRow = rows[headerRowIndex]
  console.log(`[Parser] Header row content: ${JSON.stringify(headerRow)}`)
  const columnMap = buildColumnMap(headerRow, [
    'PERSONS RESPONSIBLE',
    'AREA',
    'ASSEMBLY LINE',
    'STATION',
    'ROBOT',
    'APPLICATION',
    ...KEY_STAGE_COLUMNS
  ])

  // Validate critical columns
  const missingColumns = REQUIRED_HEADERS.filter(col => columnMap[col] === null)
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
  }

  // Parse data rows
  const dataStartIndex = headerRowIndex + 2 // Skip header and blank row
  const parsedRows: ParsedSimulationRow[] = []

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i]

    // Stop at total row
    if (isTotalRow(row)) break

    // Skip empty rows
    if (isEmptyRow(row)) continue

    // Extract basic fields
    const areaName = getCellString(row, columnMap, 'AREA')
    const lineCode = getCellString(row, columnMap, 'ASSEMBLY LINE')
    const stationCode = getCellString(row, columnMap, 'STATION')

    // Skip rows without critical data
    if (!areaName || !stationCode) {
      warnings.push(createRowSkippedWarning({
        fileName,
        sheetName,
        rowIndex: i + 1,
        reason: 'Missing required fields: AREA or STATION'
      }))
      continue
    }

    // Extract optional fields
    const engineer = getCellString(row, columnMap, 'PERSONS RESPONSIBLE')
    const robotName = getCellString(row, columnMap, 'ROBOT')
    const application = getCellString(row, columnMap, 'APPLICATION')

    // Extract stage metrics
    const stageMetrics: Record<string, number> = {}
    for (const stageName of KEY_STAGE_COLUMNS) {
      const value = getCellNumber(row, columnMap, stageName)
      if (value !== null) {
        stageMetrics[stageName] = value
      }
    }

    parsedRows.push({
      engineer: engineer || undefined,
      areaName,
      lineCode,
      stationCode,
      robotName: robotName || undefined,
      application: application || undefined,
      stageMetrics,
      sourceRowIndex: i
    })
  }

  if (parsedRows.length === 0) {
    warnings.push(createParserErrorWarning({
      fileName,
      sheetName,
      error: 'No valid data rows found after parsing'
    }))
  }

  // Derive project name from filename
  const projectName = deriveProjectName(fileName)
  const customer = deriveCustomer(fileName)

  // Group rows by cell (area + line + station)
  const cellGroups = groupByCell(parsedRows)

  // Build domain entities
  const project: Project = {
    id: generateId('proj', customer, projectName.replace(/\s+/g, '-')),
    name: projectName,
    customer,
    status: 'Running',
    manager: 'Dale'
  }

  const areas: Area[] = []
  const cells: Cell[] = []
  const areaMap = new Map<string, Area>()

  for (const [, cellRows] of cellGroups) {
    const firstRow = cellRows[0]

    // Get or create area
    const areaKey = `${project.id}:${firstRow.areaName}`
    let area = areaMap.get(areaKey)
    if (!area) {
      area = {
        id: generateId(project.id, 'area', firstRow.areaName.replace(/\s+/g, '-')),
        projectId: project.id,
        name: firstRow.areaName,
        code: firstRow.lineCode
      }
      areaMap.set(areaKey, area)
      areas.push(area)
    }

    // Calculate average completion
    const allMetrics = cellRows.flatMap(r => Object.values(r.stageMetrics))
    const avgComplete = allMetrics.length > 0
      ? allMetrics.reduce((sum, val) => sum + val, 0) / allMetrics.length
      : 0

    // Detect issues (e.g., some stages lagging significantly)
    const hasIssues = detectIssues(cellRows)

    // Build simulation status
    const simulation: SimulationStatus = {
      percentComplete: Math.round(avgComplete),
      hasIssues,
      metrics: firstRow.stageMetrics,
      sourceFile: fileName,
      sheetName,
      rowIndex: firstRow.sourceRowIndex
    }

    // Build cell
    const cell: Cell = {
      id: generateId(area.id, 'cell', firstRow.stationCode),
      projectId: project.id,
      areaId: area.id,
      name: `${firstRow.areaName} - ${firstRow.stationCode}`,
      code: firstRow.stationCode,
      status: deriveCellStatus(simulation.percentComplete, hasIssues),
      assignedEngineer: firstRow.engineer,
      lineCode: firstRow.lineCode,
      lastUpdated: new Date().toISOString(),
      simulation
    }

    cells.push(cell)
  }

  return {
    projects: [project],
    areas,
    cells,
    warnings
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find the SIMULATION sheet in the workbook
 */
function findSimulationSheet(workbook: XLSX.WorkBook): string | null {
  const sheetNames = workbook.SheetNames

  // Look for exact match first
  if (sheetNames.includes('SIMULATION')) return 'SIMULATION'

  // Look for case-insensitive match
  const match = sheetNames.find(name => name.toUpperCase() === 'SIMULATION')
  return match || null
}

/**
 * Derive project name from filename
 * e.g., "STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx" -> "STLA-S Rear Unit"
 */
function deriveProjectName(fileName: string): string {
  const base = fileName.replace(/\.(xlsx|xlsm|xls)$/i, '')
  const parts = base.split('_')

  // Find the customer part (e.g., "STLA-S")
  const customer = parts[0]

  // Find the area/unit part (e.g., "REAR UNIT" or "UNDERBODY")
  const unitParts: string[] = []
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    if (part.toLowerCase().includes('simulation') || part.toLowerCase().includes('status')) {
      break
    }
    unitParts.push(part)
  }

  const unit = unitParts.join(' ')
  return `${customer} ${unit}`.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Derive customer from filename
 */
function deriveCustomer(fileName: string): string {
  const parts = fileName.split('_')
  return parts[0] || 'Unknown'
}

/**
 * Group parsed rows by cell (area + line + station)
 */
function groupByCell(rows: ParsedSimulationRow[]): Map<string, ParsedSimulationRow[]> {
  const groups = new Map<string, ParsedSimulationRow[]>()

  for (const row of rows) {
    const cellKey = `${row.areaName}:${row.lineCode}:${row.stationCode}`
    const group = groups.get(cellKey)
    if (group) {
      group.push(row)
    } else {
      groups.set(cellKey, [row])
    }
  }

  return groups
}

/**
 * Detect if a cell has issues based on stage metrics
 */
function detectIssues(rows: ParsedSimulationRow[]): boolean {
  if (rows.length === 0) return false

  // Collect all metric values
  const allValues: number[] = []
  for (const row of rows) {
    allValues.push(...Object.values(row.stageMetrics))
  }

  if (allValues.length === 0) return false

  // Calculate average and min
  const avg = allValues.reduce((sum, val) => sum + val, 0) / allValues.length
  const min = Math.min(...allValues)

  // Flag as issue if:
  // 1. Average is low (< 50%)
  // 2. Or there's high variance (min is < 50% of average and average > 30)
  if (avg < 50) return true
  if (min < avg * 0.5 && avg > 30) return true

  return false
}
