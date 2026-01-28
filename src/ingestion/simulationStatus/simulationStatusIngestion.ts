/**
 * Simulation Status Ingestion
 *
 * Main entry point for ingesting simulation status Excel files.
 * Handles Excel parsing, entity creation, validation, and store integration.
 */

import * as XLSX from 'xlsx'
import {
  normalizeSimulationStatusRows,
  simulationRowToEntity,
  validateSimulationStatusEntities,
  linkSimulationToTooling,
  parseSheetForPanels,
  mergePanelMilestonesByRobot,
  attachPanelMilestonesToEntities,
} from './simulationStatusParser'
import { truncateAreaName } from '../normalizers'
import {
  SimulationStatusEntity,
  SimulationStatusValidationAnomaly,
  SimulationStatusValidationReport
} from './simulationStatusTypes'
import { simulationStatusStore } from '../../domain/simulationStatusStore'
import { isCellStruck } from '../excelUtils'
import { log } from '../../lib/log'

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface SimulationStatusIngestionResult {
  entities: SimulationStatusEntity[]
  report: SimulationStatusValidationReport
  sourceFile: string
  sheetName: string
  /** Area name extracted from the first cell of the sheet (e.g., "UNDERBODY" from "UNDERBODY - SIMULATION") */
  documentAreaName: string | null
}

export interface SimulationStatusIngestionError {
  message: string
  details?: string
  sourceFile: string
}

// ============================================================================
// MAIN INGESTION FUNCTION
// ============================================================================

/**
 * Ingest a Simulation Status Excel file
 *
 * @param workbook - XLSX workbook to parse
 * @param fileName - Name of the file for tracking
 * @param targetSheetName - Optional sheet name (defaults to 'SIMULATION')
 * @returns Ingestion result with entities and validation report
 */
export async function ingestSimulationStatusFile(
  workbook: XLSX.WorkBook,
  fileName: string,
  targetSheetName: string = 'SIMULATION'
): Promise<SimulationStatusIngestionResult> {
  // Validate workbook has the target sheet
  if (!workbook.Sheets[targetSheetName]) {
    const availableSheets = workbook.SheetNames.join(', ')
    throw new Error(
      `Sheet "${targetSheetName}" not found in ${fileName}. Available sheets: ${availableSheets}`
    )
  }

  const sheet = workbook.Sheets[targetSheetName]

  // Find header row
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  // Extract document area name from first cell (e.g., "UNDERBODY - SIMULATION" → "UNDERBODY")
  const firstCellValue = rawData[0]?.[0]
  const documentAreaName = truncateAreaName(firstCellValue)
  let headerRowIndex = -1

  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i] as any[]
    const rowStr = row.join('|').toLowerCase()
    if (rowStr.includes('station') && rowStr.includes('robot')) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      `Could not find header row in sheet "${targetSheetName}". Expected row with "STATION" and "ROBOT" columns.`
    )
  }

  // Parse rows with headers
  const dataWithHeaders = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex })

  // Find ROBOT column index for strike-through detection
  const headers = rawData[headerRowIndex] as string[]
  const robotColIndex = headers.findIndex(h =>
    h && String(h).toLowerCase().includes('robot')
  )

  // Filter out deleted rows (strike-through on ROBOT column)
  const nonDeletedRows = dataWithHeaders.filter((_, idx) => {
    const excelRowIndex = headerRowIndex + 1 + idx // +1 for header row, +idx for data row
    if (robotColIndex === -1) return true // Can't detect, include row
    return !isCellStruck(sheet, excelRowIndex, robotColIndex)
  }) as Array<Record<string, unknown>>

  const deletedCount = dataWithHeaders.length - nonDeletedRows.length

  // Normalize rows
  const normalized = normalizeSimulationStatusRows(
    nonDeletedRows,
    fileName,
    headerRowIndex + 1
  )

  // Convert to entities
  const anomalies: SimulationStatusValidationAnomaly[] = []

  // Add anomalies for deleted rows
  if (deletedCount > 0) {
    anomalies.push({
      type: 'MISSING_ROBOT',
      row: 0,
      message: `${deletedCount} row(s) skipped due to strike-through deletion`,
      data: { deletedCount }
    })
  }

  const entities = normalized
    .map(row => simulationRowToEntity(row, targetSheetName, anomalies))
    .filter((e): e is NonNullable<typeof e> => e !== null)

  // Extract and attach panel milestones from the SIMULATION sheet
  const panelResults = parseSheetForPanels(nonDeletedRows, 'SIMULATION')
  const robotPanelsMap = mergePanelMilestonesByRobot([panelResults])
  attachPanelMilestonesToEntities(entities, robotPanelsMap)

  // Log detected areas and stations
  const uniqueAreas = Array.from(new Set(entities.map(e => e.area))).filter(Boolean)
  const uniqueStations = Array.from(new Set(entities.map(e => e.station))).filter(Boolean).sort()

  console.log('--------------------------------------------------')
  console.log(`[Simulation Ingestion] File: ${fileName}`)
  console.log(`[Simulation Ingestion] Document Area: ${documentAreaName || 'Unknown'}`)
  console.log(`[Simulation Ingestion] Rows/Robots Found: ${entities.length}`)
  console.log(`[Simulation Ingestion] Areas Found: ${uniqueAreas.join(', ')}`)
  console.log(`[Simulation Ingestion] Stations Found: ${uniqueStations.join(', ')}`)
  console.log('--------------------------------------------------')

  // Validate
  const report = validateSimulationStatusEntities(entities, dataWithHeaders.length, anomalies)

  return {
    entities,
    report,
    sourceFile: fileName,
    sheetName: targetSheetName,
    documentAreaName
  }
}

/**
 * Ingest simulation status file and add to store
 *
 * @param workbook - XLSX workbook to parse
 * @param fileName - Name of the file for tracking
 * @param targetSheetName - Optional sheet name (defaults to 'SIMULATION')
 * @param replaceExisting - If true, replace existing entities from this file; if false, add new entities
 * @returns Ingestion result
 */
export async function ingestAndStoreSimulationStatus(
  workbook: XLSX.WorkBook,
  fileName: string,
  targetSheetName: string = 'SIMULATION',
  replaceExisting: boolean = true
): Promise<SimulationStatusIngestionResult> {
  const result = await ingestSimulationStatusFile(workbook, fileName, targetSheetName)

  // Add or replace entities in store
  if (replaceExisting) {
    simulationStatusStore.replaceEntitiesFromFile(result.entities, fileName)
  } else {
    simulationStatusStore.addEntities(result.entities, fileName)
  }

  return result
}

/**
 * Link simulation status entities to tool entities
 *
 * This should be called after both simulation status and tool list data are loaded.
 * It updates the linkedToolingEntityKeys field on simulation status entities.
 *
 * @param toolEntities - Tool entities from tool list ingestion
 */
export function linkSimulationStatusToTools(
  toolEntities: Array<{ canonicalKey: string; areaName: string; stationGroup: string }>
): void {
  const simEntities = simulationStatusStore.getState().entities

  if (simEntities.length === 0) {
    log.warn('No simulation status entities to link')
    return
  }

  if (toolEntities.length === 0) {
    log.warn('No tool entities to link to simulation status')
    return
  }

  // Perform linking
  linkSimulationToTooling(simEntities, toolEntities)

  // Update store with linked entities
  simulationStatusStore.setEntities(simEntities)
}

/**
 * Get ingestion summary for UI display
 */
export function getIngestionSummary(result: SimulationStatusIngestionResult): string {
  const { entities, report } = result

  const lines: string[] = []
  lines.push(`✅ Successfully ingested ${entities.length} robot(s)`)

  if (report.duplicateRobotCount > 0) {
    lines.push(`⚠️  ${report.duplicateRobotCount} duplicate robot(s) found`)
  }

  if (report.invalidFormatCount > 0) {
    lines.push(`❌ ${report.invalidFormatCount} robot(s) with invalid format`)
  }

  if (report.missingStationCount > 0) {
    lines.push(`❌ ${report.missingStationCount} robot(s) missing station`)
  }

  if (report.missingRobotCount > 0) {
    lines.push(`❌ ${report.missingRobotCount} robot(s) missing robot ID`)
  }

  // Station summary
  const stations = new Set<string>()
  entities.forEach(e => stations.add(e.stationFull))
  lines.push(`📍 ${stations.size} station(s) covered`)

  // Application summary
  const applications = new Map<string, number>()
  entities.forEach(e => {
    const count = applications.get(e.application) || 0
    applications.set(e.application, count + 1)
  })
  const appSummary = Array.from(applications.entries())
    .map(([app, count]) => `${app}(${count})`)
    .join(', ')
  lines.push(`🤖 Application types: ${appSummary}`)

  // Completion summary
  const totalCompletion = entities.reduce((sum, e) => sum + e.overallCompletion, 0)
  const avgCompletion = entities.length > 0 ? Math.round(totalCompletion / entities.length) : 0
  lines.push(`📊 Average completion: ${avgCompletion}%`)

  return lines.join('\n')
}
