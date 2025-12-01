// Simulation Status Parser (Vacuum Style)
// Parses Excel Simulation Status files into Projects, Areas, and Cells
// Uses vacuum parsing to capture all metrics without hardcoded column lists

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
  isTotalRow,
  CellValue
} from './excelUtils'
import { createRowSkippedWarning, createParserErrorWarning } from './warningUtils'
import { AnalyzedSheet, toAnalyzedSheet, NormalizedSheet } from './workbookLoader'

// ============================================================================
// VACUUM PARSER TYPES
// ============================================================================

/**
 * A single metric vacuumed from a non-core column.
 */
export interface SimulationMetric {
  /** Exact header text (preserving typos) */
  label: string
  /** 0-100 if parsed successfully, null otherwise */
  percent: number | null
  /** Original cell value before normalization */
  rawValue: string | number | null
}

/**
 * A parsed row with core fields + vacuum-captured metrics.
 */
export interface VacuumParsedRow {
  area: string
  assemblyLine?: string
  stationKey: string
  robotCaption?: string
  application?: string
  personResponsible?: string
  metrics: SimulationMetric[]
  sourceRowIndex: number
}

// Legacy type for backward compatibility
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
  /** Vacuum-parsed rows for advanced consumers */
  vacuumRows?: VacuumParsedRow[]
}

// ============================================================================
// CORE FIELDS (Known Columns)
// ============================================================================

/**
 * Core fields that are mapped to specific row properties.
 * Any column NOT in this list becomes a metric.
 */
const CORE_FIELDS = [
  'AREA',
  'ASSEMBLY LINE',
  'STATION',
  'ROBOT',
  'APPLICATION',
  'PERSONS RESPONSIBLE'
]

// Column name aliases for flexible matching
const COLUMN_ALIASES: Record<string, string[]> = {
  'AREA': ['AREA', 'AREA NAME'],
  'ASSEMBLY LINE': ['ASSEMBLY LINE', 'LINE', 'LINE CODE'],
  'STATION': ['STATION', 'STATION CODE', 'STATION KEY'],
  'ROBOT': ['ROBOT', 'ROBOT CAPTION', 'ROBOT NAME'],
  'APPLICATION': ['APPLICATION', 'APP'],
  'PERSONS RESPONSIBLE': ['PERSONS RESPONSIBLE', 'PERSON RESPONSIBLE', 'ENGINEER', 'RESPONSIBLE']
}

const REQUIRED_HEADERS = [
  'AREA',
  'ASSEMBLY LINE',
  'STATION',
  'ROBOT',
  'APPLICATION'
]

// ============================================================================
// METRIC NORMALIZATION
// ============================================================================

/**
 * Parse a cell value into a percentage.
 * - Number 0-100 → percent = value
 * - String like "95%" → strip % and parse
 * - Otherwise → null
 */
function parsePercent(value: CellValue): number | null {
  if (value === null || value === undefined) {
    return null
  }

  // Already a number
  if (typeof value === 'number') {
    // Assume values > 1 are percentages already
    if (value >= 0 && value <= 100) {
      return value
    }

    // If value is decimal like 0.95, convert to 95
    if (value >= 0 && value <= 1) {
      return Math.round(value * 100)
    }

    return null
  }

  // String parsing
  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed === '') {
      return null
    }

    // Handle percentage strings like "95%" or "95 %"
    const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*%?$/)

    if (percentMatch) {
      const num = parseFloat(percentMatch[1])

      if (!isNaN(num) && num >= 0 && num <= 100) {
        return Math.round(num)
      }
    }

    // Handle decimal strings like "0.95"
    const decimalMatch = trimmed.match(/^0\.(\d+)$/)

    if (decimalMatch) {
      const num = parseFloat(trimmed)

      if (!isNaN(num) && num >= 0 && num <= 1) {
        return Math.round(num * 100)
      }
    }
  }

  return null
}

/**
 * Create a SimulationMetric from a header and cell value.
 */
function createMetric(label: string, rawValue: CellValue): SimulationMetric {
  const percent = parsePercent(rawValue)

  return {
    label,
    percent,
    rawValue
  }
}

// ============================================================================
// VACUUM PARSER
// ============================================================================

/**
 * Vacuum-parse a simulation status sheet.
 * 
 * Core fields are mapped to row properties.
 * All other columns are captured as metrics[].
 */
export function vacuumParseSimulationSheet(
  rows: CellValue[][],
  headerRowIndex: number,
  fileName: string,
  sheetName: string
): { rows: VacuumParsedRow[]; warnings: IngestionWarning[] } {
  const warnings: IngestionWarning[] = []
  const vacuumRows: VacuumParsedRow[] = []

  const headerRow = rows[headerRowIndex]

  if (!headerRow || headerRow.length === 0) {
    return { rows: [], warnings }
  }

  // Build column index map for core fields
  const coreIndices: Record<string, number> = {}

  for (const [coreField, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < headerRow.length; i++) {
      const headerText = String(headerRow[i] || '').toUpperCase().trim()

      for (const alias of aliases) {
        if (headerText === alias.toUpperCase() || headerText.includes(alias.toUpperCase())) {
          coreIndices[coreField] = i
          break
        }
      }

      if (coreIndices[coreField] !== undefined) {
        break
      }
    }
  }

  // Find metric columns (everything not mapped to core)
  const metricIndices: number[] = []
  const metricLabels: string[] = []
  const coreIndexSet = new Set(Object.values(coreIndices))

  for (let i = 0; i < headerRow.length; i++) {
    if (coreIndexSet.has(i)) {
      continue
    }

    const headerText = String(headerRow[i] || '').trim()

    // Skip empty headers
    if (headerText === '') {
      continue
    }

    metricIndices.push(i)
    metricLabels.push(headerText) // Preserve exact header text including typos
  }

  // Parse data rows (starting after header)
  const dataStartIndex = headerRowIndex + 1

  for (let i = dataStartIndex; i < rows.length; i++) {
    const row = rows[i]

    // Stop at total row
    if (isTotalRow(row)) {
      break
    }

    // Skip empty rows
    if (isEmptyRow(row)) {
      continue
    }

    // Extract core fields
    const area = coreIndices['AREA'] !== undefined ? String(row[coreIndices['AREA']] || '').trim() : ''
    const assemblyLine = coreIndices['ASSEMBLY LINE'] !== undefined ? String(row[coreIndices['ASSEMBLY LINE']] || '').trim() : undefined
    const stationKey = coreIndices['STATION'] !== undefined ? String(row[coreIndices['STATION']] || '').trim() : ''
    const robotCaption = coreIndices['ROBOT'] !== undefined ? String(row[coreIndices['ROBOT']] || '').trim() || undefined : undefined
    const application = coreIndices['APPLICATION'] !== undefined ? String(row[coreIndices['APPLICATION']] || '').trim() || undefined : undefined
    const personResponsible = coreIndices['PERSONS RESPONSIBLE'] !== undefined ? String(row[coreIndices['PERSONS RESPONSIBLE']] || '').trim() || undefined : undefined

    // Skip rows without critical data
    if (!area || !stationKey) {
      warnings.push(createRowSkippedWarning({
        fileName,
        sheetName,
        rowIndex: i + 1,
        reason: 'Missing required fields: AREA or STATION'
      }))
      continue
    }

    // Vacuum up all metrics
    const metrics: SimulationMetric[] = []

    for (let j = 0; j < metricIndices.length; j++) {
      const colIndex = metricIndices[j]
      const label = metricLabels[j]
      const rawValue = row[colIndex] ?? null

      // Only include if there's a value
      if (rawValue !== null && rawValue !== '') {
        metrics.push(createMetric(label, rawValue))
      }
    }

    vacuumRows.push({
      area,
      assemblyLine,
      stationKey,
      robotCaption,
      application,
      personResponsible,
      metrics,
      sourceRowIndex: i
    })
  }

  return { rows: vacuumRows, warnings }
}

// ============================================================================
// MAIN PARSER (Backward Compatible)
// ============================================================================

/**
 * Parse a Simulation Status Excel file into domain entities.
 * Uses vacuum parsing internally but maintains backward-compatible output.
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

  console.log(`[Parser] Header row content: ${JSON.stringify(rows[headerRowIndex])}`)

  // Use vacuum parser
  const { rows: vacuumRows, warnings: parseWarnings } = vacuumParseSimulationSheet(
    rows,
    headerRowIndex,
    fileName,
    sheetName
  )

  warnings.push(...parseWarnings)

  if (vacuumRows.length === 0) {
    warnings.push(createParserErrorWarning({
      fileName,
      sheetName,
      error: 'No valid data rows found after parsing'
    }))
  }

  // Convert vacuum rows to legacy format for backward compatibility
  const parsedRows: ParsedSimulationRow[] = vacuumRows.map(vr => {
    const stageMetrics: Record<string, number> = {}

    for (const metric of vr.metrics) {
      if (metric.percent !== null) {
        stageMetrics[metric.label] = metric.percent
      }
    }

    return {
      engineer: vr.personResponsible,
      areaName: vr.area,
      lineCode: vr.assemblyLine || '',
      stationCode: vr.stationKey,
      robotName: vr.robotCaption,
      application: vr.application,
      stageMetrics,
      sourceRowIndex: vr.sourceRowIndex
    }
  })

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

    // Build simulation status with all vacuum-captured metrics
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
    warnings,
    vacuumRows // Include vacuum rows for advanced consumers
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
  if (sheetNames.includes('SIMULATION')) {
    return 'SIMULATION'
  }

  // Look for case-insensitive match
  const match = sheetNames.find(name => name.toUpperCase() === 'SIMULATION')

  if (match) {
    return match
  }

  // Look for partial match
  const partial = sheetNames.find(name => name.toUpperCase().includes('SIMULATION'))

  return partial || null
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
  if (rows.length === 0) {
    return false
  }

  // Collect all metric values
  const allValues: number[] = []

  for (const row of rows) {
    allValues.push(...Object.values(row.stageMetrics))
  }

  if (allValues.length === 0) {
    return false
  }

  // Calculate average and min
  const avg = allValues.reduce((sum, val) => sum + val, 0) / allValues.length
  const min = Math.min(...allValues)

  // Flag as issue if:
  // 1. Average is low (< 50%)
  // 2. Or there's high variance (min is < 50% of average and average > 30)
  if (avg < 50) {
    return true
  }

  if (min < avg * 0.5 && avg > 30) {
    return true
  }

  return false
}
