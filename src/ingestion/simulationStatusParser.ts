// Simulation Status Parser (Vacuum Style)
// Parses Excel Simulation Status files into Projects, Areas, and Cells
// Uses vacuum parsing to capture all metrics without hardcoded column lists

import * as XLSX from 'xlsx'
import { log } from '../lib/log'
import type { Cell, IngestionWarning } from '../domain/core'
import { sheetToMatrix, findHeaderRow } from './excelUtils'
import { createRowSkippedWarning, createParserErrorWarning } from './warningUtils'
import { parseOverviewSchedule } from './simulationStatus/overviewSchedule'
import { findAllSimulationSheets, extractAreaNameFromTitle } from './simulationStatus/sheetDiscovery'
import { deriveProjectName, deriveCustomer } from './simulationStatus/projectNaming'
import { COLUMN_ALIASES, REQUIRED_HEADERS } from './simulationStatus/headerMapping'
import { vacuumParseSimulationSheet } from './simulationStatus/vacuumParser'
import { convertVacuumRowsToPanelMilestones, getPanelMilestonesForRobot } from './simulationStatus/panelMilestones'
import { extractRobotsFromVacuumRows } from './simulationStatus/robotExtraction'
import { buildEntities } from './simulationStatus/entityBuilder'
import {
  SimulationMetric,
  VacuumParsedRow,
  ParsedSimulationRow,
  SimulationRobot,
  SimulationStatusResult
} from './simulationStatus/types'

// Re-export selected helpers for external consumers
export { vacuumParseSimulationSheet } from './simulationStatus/vacuumParser'
export { convertVacuumRowsToPanelMilestones, getPanelMilestonesForRobot } from './simulationStatus/panelMilestones'
export type {
  SimulationMetric,
  VacuumParsedRow,
  ParsedSimulationRow,
  SimulationRobot,
  SimulationStatusResult
} from './simulationStatus/types'

// ============================================================================
// LEGACY ROW TRANSFORM
// ============================================================================

function toParsedRows(vacuumRows: VacuumParsedRow[]): ParsedSimulationRow[] {
  return vacuumRows.map(vr => {
    const stageMetrics: Record<string, number> = {}

    for (const metric of vr.metrics) {
      if (metric.percent !== null) {
        stageMetrics[metric.label] = metric.percent
      }
    }

    return {
      engineer: vr.personResponsible,
      areaName: vr.areaName, // Use the proper area name (e.g. UNDERBODY)
      areaCode: vr.areaCode, // Preserve area code (e.g. 8X)
      lineCode: vr.assemblyLine || '',
      stationCode: vr.stationKey,
      robotName: vr.robotCaption,
      application: vr.application,
      stageMetrics,
      sourceRowIndex: vr.sourceRowIndex
    }
  })
}

// ============================================================================
// MAIN PARSER (Backward Compatible)
// ============================================================================

/**
 * Parse a Simulation Status Excel file into domain entities.
 * Uses vacuum parsing internally but maintains backward-compatible output.
 * Now supports multiple sheets: SIMULATION, MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT
 */
export async function parseSimulationStatus(
  workbook: XLSX.WorkBook,
  fileName: string,
  targetSheetName?: string
): Promise<SimulationStatusResult> {
  const warnings: IngestionWarning[] = []
  const overviewSchedule = parseOverviewSchedule(workbook)

  // Determine which sheets to parse
  const sheetsToParse: string[] = targetSheetName
    ? [targetSheetName]
    : findAllSimulationSheets(workbook)

  log.debug('[SimStatus] Sheet detection', {
    workbookSheets: workbook.SheetNames,
    targetSheetName,
    sheetsToParse,
    parsedFile: fileName
  })

  if (sheetsToParse.length === 0) {
    throw new Error(`No simulation sheets found in ${fileName}. Available sheets: ${workbook.SheetNames.join(', ')}`)
  }

  log.info(`[Parser] Parsing ${sheetsToParse.length} sheet(s): ${sheetsToParse.join(', ')}`)

  const allVacuumRows: VacuumParsedRow[] = []
  const allParsedRows: ParsedSimulationRow[] = []

  for (const sheetName of sheetsToParse) {
    if (workbook.SheetNames.includes(sheetName) === false) {
      warnings.push(createParserErrorWarning({
        fileName,
        sheetName,
        error: `Sheet "${sheetName}" not found in workbook`
      }))
      continue
    }

    const isSimulationSheet = sheetName.toUpperCase().includes('SIMULATION')

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

    // Extract global area name from first cell (A1) or title row
    let globalAreaName: string | undefined
    if (rows.length > 0 && rows[0].length > 0) {
      const titleCell = String(rows[0][0] || '').trim()
      globalAreaName = extractAreaNameFromTitle(titleCell)
      if (globalAreaName) {
        log.debug(`[Parser] ${sheetName}: Found global area name in A1: "${globalAreaName}"`)
      }
    }

    const { rows: vacuumRows, warnings: parseWarnings } = vacuumParseSimulationSheet(
      rows,
      headerRowIndex,
      fileName,
      sheetName,
      globalAreaName
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
          ? m.label
          : `${sheetName}: ${m.label}`
      }))
    }))

    allVacuumRows.push(...prefixedVacuumRows)

    const parsedRows = toParsedRows(prefixedVacuumRows)
    allParsedRows.push(...parsedRows)
  }

  if (allParsedRows.length === 0) {
    throw new Error(`No valid data rows found in any simulation sheet in ${fileName}`)
  }

  // Use the first sheet name for backward compatibility (or SIMULATION if available)
  const primarySheetName = sheetsToParse.find(s => s.toUpperCase() === 'SIMULATION') || sheetsToParse[0]

  const projectName = deriveProjectName(fileName)
  const customer = deriveCustomer(fileName)

  // Build entities
  const { project, areas, cells } = buildEntities(
    allParsedRows,
    projectName,
    customer,
    fileName,
    primarySheetName,
    overviewSchedule
  )

  // Extract robots from vacuum rows and detect duplicate station+robot combinations
  const { robots: robotsFromSimStatus, warnings: robotWarnings } = extractRobotsFromVacuumRows(
    allVacuumRows,
    fileName,
    primarySheetName
  )
  warnings.push(...robotWarnings)

  const areaNames = areas.map(a => `${a.name} (${a.code || 'No Code'})`).join(', ')

  // Console debug message for import summary
  log.info(`[Parser] Simulation document imported: ${fileName}`)
  log.info(`  - Project: ${projectName}`)
  log.info(`  - Total Areas: ${areas.length} [${areaNames}]`)
  log.info(`  - Total Stations: ${cells.length}`)
  log.info(`  - Total Robots: ${robotsFromSimStatus ? robotsFromSimStatus.length : 0}`)

  return {
    projects: [project],
    areas,
    cells,
    warnings,
    vacuumRows: allVacuumRows,
    robotsFromSimStatus,
    overviewSchedule
  }
}

// ============================================================================
// Support functions that remained local
// ============================================================================

// Retain createRowSkippedWarning export for downstream callers
export { createRowSkippedWarning }

// Re-export mapping/constants for consumers/tests
export { COLUMN_ALIASES, REQUIRED_HEADERS }

// Build entities helper (exposed for tests/dev tools)
export { buildEntities }
