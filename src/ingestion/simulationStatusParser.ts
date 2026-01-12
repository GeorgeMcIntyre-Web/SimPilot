// Simulation Status Parser (Vacuum Style)
// Parses Excel Simulation Status files into Projects, Areas, and Cells
// Uses vacuum parsing to capture all metrics without hardcoded column lists

import * as XLSX from 'xlsx'
import { log } from '../lib/log'
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
  isEmptyRow,
  isTotalRow,
  isEffectivelyEmptyRow,
  CellValue
} from './excelUtils'
import { createRowSkippedWarning, createParserErrorWarning } from './warningUtils'
import { deriveCustomerFromFileName } from './customerMapping'
import { buildStationId } from './normalizers'

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
  rawValue: string | number | boolean | null
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

  // Normalize rawValue to string | number | null (handle boolean case)
  let normalizedRawValue: string | number | null
  if (typeof rawValue === 'boolean') {
    normalizedRawValue = rawValue ? 'true' : 'false'
  } else {
    normalizedRawValue = rawValue
  }

  return {
    label,
    percent,
    rawValue: normalizedRawValue
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
      // Only warn if row looks like it might have been intended as data
      // Skip warnings for effectively empty rows (reduces noise)
      if (!isEffectivelyEmptyRow(row, 2)) {
        warnings.push(createRowSkippedWarning({
          fileName,
          sheetName,
          rowIndex: i + 1,
          reason: 'Missing required fields: AREA or STATION'
        }))
      }
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
 * Now supports multiple sheets: SIMULATION, MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT
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

  // Determine which sheets to parse
  const sheetsToParse: string[] = targetSheetName 
    ? [targetSheetName]  // Single sheet specified
    : findAllSimulationSheets(workbook)  // Auto-detect all simulation sheets

  if (sheetsToParse.length === 0) {
    throw new Error(`No simulation sheets found in ${fileName}. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }

  log.info(`[Parser] Parsing ${sheetsToParse.length} sheet(s): ${sheetsToParse.join(', ')}`)

  // Parse each sheet and collect all vacuum rows
  const allVacuumRows: VacuumParsedRow[] = []
  const allParsedRows: ParsedSimulationRow[] = []

  for (const sheetName of sheetsToParse) {
    // Validate that the sheet exists
    if (workbook.SheetNames.includes(sheetName) === false) {
      warnings.push(createParserErrorWarning({
        fileName,
        sheetName,
        error: `Sheet "${sheetName}" not found in workbook`
      }))
      continue
    }

    // Convert to matrix
    const rows = sheetToMatrix(workbook, sheetName)

    if (rows.length < 5) {
      warnings.push(createParserErrorWarning({
        fileName,
        sheetName,
        error: `Sheet has too few rows (${rows.length}). Expected at least 5 rows.`
      }))
      continue
    }

    // Find header row
    const headerRowIndex = findHeaderRow(rows, REQUIRED_HEADERS)
    log.debug(`[Parser] ${sheetName}: Header row index: ${headerRowIndex}`)

    if (headerRowIndex === null) {
      warnings.push(createParserErrorWarning({
        fileName,
        sheetName,
        error: `Could not find header row with required columns: ${REQUIRED_HEADERS.join(', ')}`
      }))
      continue
    }

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
      continue
    }

    // Prefix metrics with sheet name to avoid conflicts (except for SIMULATION sheet)
    const prefixedVacuumRows = vacuumRows.map(vr => ({
      ...vr,
      metrics: vr.metrics.map(m => ({
        ...m,
        label: sheetName === 'SIMULATION' 
          ? m.label  // Keep original label for SIMULATION sheet
          : `${sheetName}: ${m.label}`  // Prefix with sheet name for others
      }))
    }))

    allVacuumRows.push(...prefixedVacuumRows)

    // Convert vacuum rows to legacy format for backward compatibility
    const parsedRows: ParsedSimulationRow[] = prefixedVacuumRows.map(vr => {
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

    allParsedRows.push(...parsedRows)
  }

  if (allParsedRows.length === 0) {
    throw new Error(`No valid data rows found in any simulation sheet in ${fileName}`)
  }

  // Use the first sheet name for backward compatibility (or SIMULATION if available)
  const primarySheetName = sheetsToParse.find(s => s.toUpperCase() === 'SIMULATION') || sheetsToParse[0]
  const parsedRows = allParsedRows

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

    // Merge metrics from all rows (multiple sheets may contribute to same cell)
    const mergedMetrics: Record<string, number> = {}
    for (const row of cellRows) {
      Object.assign(mergedMetrics, row.stageMetrics)
    }

    // Build simulation status with all merged metrics from all sheets
    const simulation: SimulationStatus = {
      percentComplete: Math.round(avgComplete),
      hasIssues,
      metrics: mergedMetrics,  // Contains metrics from all sheets (prefixed with sheet name)
      sourceFile: fileName,
      sheetName: primarySheetName,  // Primary sheet name for backward compatibility
      rowIndex: firstRow.sourceRowIndex
    }

    // Build canonical stationId
    const stationId = buildStationId(firstRow.areaName, firstRow.stationCode)

    // Build cell
    const cell: Cell = {
      id: generateId(area.id, 'cell', firstRow.stationCode),
      projectId: project.id,
      areaId: area.id,
      name: `${firstRow.areaName} - ${firstRow.stationCode}`,
      code: firstRow.stationCode,
      stationId,
      status: deriveCellStatus(simulation.percentComplete, hasIssues),
      assignedEngineer: firstRow.engineer,
      lineCode: firstRow.lineCode,
      lastUpdated: new Date().toISOString(),
      simulation
    }

    cells.push(cell)
  }

  // Debug: log a small sample of parsed simulation data for verification
  try {
    const sampleVacuumRows = allVacuumRows.slice(0, 2)
    console.log('[SimPilot][Debug] parseSimulationStatus result', {
      file: fileName,
      sheets: sheetsToParse,
      projects: project ? 1 : 0,
      areas: areas.length,
      cells: cells.length,
      vacuumRowsSample: sampleVacuumRows
    })
  } catch (debugErr) {
    console.warn('[SimPilot][Debug] Failed to log parseSimulationStatus result', debugErr)
  }

  return {
    projects: [project],
    areas,
    cells,
    warnings,
    vacuumRows: allVacuumRows // Include all vacuum rows from all sheets
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find all simulation-related sheets in the workbook.
 * Returns sheets in priority order: SIMULATION, MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT
 */
function findAllSimulationSheets(workbook: XLSX.WorkBook): string[] {
  const sheetNames = workbook.SheetNames
  const found: string[] = []
  const priorityOrder = ['SIMULATION', 'MRS_OLP', 'DOCUMENTATION', 'SAFETY_LAYOUT']

  // Find sheets in priority order
  for (const priorityName of priorityOrder) {
    // Exact match
    if (sheetNames.includes(priorityName)) {
      found.push(priorityName)
      continue
    }

    // Case-insensitive match
    const match = sheetNames.find(name => name.toUpperCase() === priorityName.toUpperCase())
    if (match && !found.includes(match)) {
      found.push(match)
      continue
    }

    // Partial match for MRS_OLP (could be "MRS_OLP", "MRS OLP", etc.)
    if (priorityName === 'MRS_OLP') {
      const mrsMatch = sheetNames.find(name => {
        const upper = name.toUpperCase()
        return (upper.includes('MRS') && upper.includes('OLP')) || upper.includes('MULTI RESOURCE')
      })
      if (mrsMatch && !found.includes(mrsMatch)) {
        found.push(mrsMatch)
        continue
      }
    }

    // Partial match for SAFETY_LAYOUT
    if (priorityName === 'SAFETY_LAYOUT') {
      const safetyMatch = sheetNames.find(name => {
        const upper = name.toUpperCase()
        return (upper.includes('SAFETY') && upper.includes('LAYOUT')) || 
               (upper.includes('SAFETY') && upper.includes('&'))
      })
      if (safetyMatch && !found.includes(safetyMatch)) {
        found.push(safetyMatch)
        continue
      }
    }
  }

  // Fallback: look for any sheet with "SIMULATION" in the name
  if (found.length === 0) {
    const partial = sheetNames.find(name => name.toUpperCase().includes('SIMULATION'))
    if (partial) {
      found.push(partial)
    }
  }

  return found
}

/**
 * Find the SIMULATION sheet in the workbook (backward compatibility)
 */
function findSimulationSheet(workbook: XLSX.WorkBook): string | null {
  const sheets = findAllSimulationSheets(workbook)
  return sheets.length > 0 ? sheets[0] : null
}

/**
 * Derive project name from filename
 * e.g., "STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx" -> "STLA-S"
 *
 * Note: The unit parts (FRONT UNIT, REAR UNIT, UNDERBODY) are NOT part of the project name.
 * They represent Areas within the project, which are already captured in the row data.
 */
function deriveProjectName(fileName: string): string {
  const base = fileName.replace(/\.(xlsx|xlsm|xls)$/i, '')
  const parts = base.split('_')

  // Return just the customer/platform name (first part)
  // e.g., "STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx" -> "STLA-S"
  return parts[0].replace(/-/g, ' ').trim()
}

/**
 * Derive customer from filename
 * Uses customer mapping for consistent assignment
 */
function deriveCustomer(fileName: string): string {
  return deriveCustomerFromFileName(fileName)
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
