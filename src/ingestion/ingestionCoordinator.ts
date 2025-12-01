// Ingestion Coordinator
// Main entry point for ingesting Excel files and routing to appropriate parsers

import { IngestionWarning } from '../domain/core'
import { coreStore } from '../domain/coreStore'
import { readWorkbook } from './excelUtils'
import { parseSimulationStatus } from './simulationStatusParser'
import { parseRobotList } from './robotListParser'
import { parseToolList } from './toolListParser'
import { applyIngestedData, IngestedData } from './applyIngestedData'
import { createUnknownFileTypeWarning, createParserErrorWarning } from './warningUtils'
import {
  scanWorkbook,
  SheetDetection,
  SheetCategory,
  categoryToFileKind,
  FileKind,
  pickBestDetectionForCategory
} from './sheetSniffer'
import * as XLSX from 'xlsx'

// ============================================================================
// PUBLIC API TYPES
// ============================================================================

// Re-export IngestionWarning for convenience
export type { IngestionWarning } from '../domain/core'

/**
 * Input for the ingestion API.
 */
export interface IngestFilesInput {
  simulationFiles: File[]
  equipmentFiles: File[]
  fileSources?: Record<string, 'local' | 'remote'>
  dataSource?: 'Local' | 'MS365'
}

/**
 * Result of ingestion operation.
 */
export interface IngestFilesResult {
  projectsCount: number
  areasCount: number
  cellsCount: number
  robotsCount: number
  toolsCount: number
  warnings: IngestionWarning[]
}

// ============================================================================
// FILE CLASSIFICATION (using Sheet Sniffer)
// ============================================================================

/**
 * Detect file type and best sheet using the Sheet Sniffer.
 * Returns the FileKind and the best sheet name for that kind.
 */
function detectFileTypeAndSheet(
  workbook: XLSX.WorkBook,
  fileName: string
): { kind: FileKind; sheetName: string | null; detection: SheetDetection | null } {
  // Scan all sheets in the workbook
  const scanResult = scanWorkbook(workbook, fileName)

  // If no sheets detected, fall back to filename-based detection
  if (scanResult.bestOverall === null) {
    const fallbackKind = detectFileTypeFromFilename(fileName)
    return { kind: fallbackKind, sheetName: workbook.SheetNames[0] || null, detection: null }
  }

  // Convert category to FileKind
  const kind = categoryToFileKind(scanResult.bestOverall.category)
  return {
    kind,
    sheetName: scanResult.bestOverall.sheetName,
    detection: scanResult.bestOverall
  }
}

/**
 * Fallback file type detection from filename (when header sniffing fails)
 */
function detectFileTypeFromFilename(fileName: string): FileKind {
  const name = fileName.toLowerCase()

  if (name.includes('simulation') && name.includes('status')) {
    return 'SimulationStatus'
  }

  if (name.includes('robot') && name.includes('list')) {
    return 'RobotList'
  }

  if (name.includes('wg') || name.includes('weld') || name.includes('gun')) {
    return 'ToolList'
  }

  if (name.includes('tool') || name.includes('equipment')) {
    return 'ToolList'
  }

  if (name.includes('riser') || name.includes('raiser')) {
    return 'ToolList'
  }

  return 'Unknown'
}

/**
 * Get all detected sheets for a workbook, grouped by category.
 * 
 * This enables processing multiple sheet types from a single workbook.
 */
function getAllDetectedSheets(
  workbook: XLSX.WorkBook,
  fileName: string
): Map<SheetCategory, SheetDetection> {
  const scanResult = scanWorkbook(workbook, fileName)
  const result = new Map<SheetCategory, SheetDetection>()

  // Pick the best detection for each category
  const categories: SheetCategory[] = [
    'SIMULATION_STATUS',
    'IN_HOUSE_TOOLING',
    'ROBOT_SPECS',
    'REUSE_WELD_GUNS',
    'GUN_FORCE',
    'REUSE_RISERS',
    'METADATA'
  ]

  for (const category of categories) {
    const best = pickBestDetectionForCategory(scanResult.allDetections, category)

    if (best === null) {
      continue
    }

    result.set(category, best)
  }

  return result
}

// ============================================================================
// MAIN INGESTION API
// ============================================================================

/**
 * High-level ingestion entry point.
 */
export async function ingestFiles(
  input: IngestFilesInput
): Promise<IngestFilesResult> {
  const allFiles = [...input.simulationFiles, ...input.equipmentFiles]

  // Validate input - require at least one simulation file
  if (input.simulationFiles.length === 0) {
    const warning: IngestionWarning = {
      id: 'no-simulation-files',
      kind: 'PARSER_ERROR',
      fileName: '',
      message: 'At least one Simulation Status file is required. Please upload a file containing project and cell data.',
      createdAt: new Date().toISOString()
    }

    return {
      projectsCount: 0,
      areasCount: 0,
      cellsCount: 0,
      robotsCount: 0,
      toolsCount: 0,
      warnings: [warning]
    }
  }

  const ingestedData: IngestedData = {
    simulation: undefined,
    robots: undefined,
    tools: undefined
  }

  const allWarnings: IngestionWarning[] = []

  // Process each file
  for (const file of allFiles) {
    try {
      // Read workbook first
      const workbook = await readWorkbook(file)

      // Detect type and best sheet using Sheet Sniffer
      const { kind, sheetName } = detectFileTypeAndSheet(workbook, file.name)

      if (kind === 'Unknown') {
        allWarnings.push(createUnknownFileTypeWarning({
          fileName: file.name
        }))
        continue
      }

      // Route to appropriate parser, passing the detected sheet name
      if (kind === 'SimulationStatus') {
        const result = await parseSimulationStatus(workbook, file.name, sheetName || undefined)

        if (!ingestedData.simulation) {
          ingestedData.simulation = result
        } else {
          ingestedData.simulation.projects.push(...result.projects)
          ingestedData.simulation.areas.push(...result.areas)
          ingestedData.simulation.cells.push(...result.cells)
          ingestedData.simulation.warnings.push(...result.warnings)
        }
      }

      if (kind === 'RobotList') {
        const result = await parseRobotList(workbook, file.name, sheetName || undefined)

        if (!ingestedData.robots) {
          ingestedData.robots = result
        } else {
          ingestedData.robots.robots.push(...result.robots)
          ingestedData.robots.warnings.push(...result.warnings)
        }
      }

      if (kind === 'ToolList') {
        const result = await parseToolList(workbook, file.name, sheetName || undefined)

        if (!ingestedData.tools) {
          ingestedData.tools = result
        } else {
          ingestedData.tools.tools.push(...result.tools)
          ingestedData.tools.warnings.push(...result.warnings)
        }
      }

      // Note: Metadata files are currently logged and skipped
      if (kind === 'Metadata') {
        console.log(`[Ingestion] Detected Metadata file: ${file.name} (sheet: ${sheetName}). Skipping for now.`)
      }
    } catch (error) {
      console.error(`[Ingestion] Error processing file ${file.name}:`, error)
      allWarnings.push(createParserErrorWarning({
        fileName: file.name,
        error: String(error)
      }))
    }
  }

  // Apply ingested data and link entities
  const applyResult = applyIngestedData(ingestedData)

  // Collect all warnings (from parsers and linking)
  allWarnings.push(...applyResult.warnings)

  // Update core store (backward compat: store warnings as strings)
  const warningStrings = allWarnings.map(w => w.message)
  coreStore.setData({
    projects: applyResult.projects,
    areas: applyResult.areas,
    cells: applyResult.cells,
    robots: applyResult.robots,
    tools: applyResult.tools,
    warnings: warningStrings
  }, input.dataSource)

  // Get counts from store
  const state = coreStore.getState()

  return {
    projectsCount: state.projects.length,
    areasCount: state.areas.length,
    cellsCount: state.cells.length,
    robotsCount: state.assets.filter(a => a.kind === 'ROBOT').length,
    toolsCount: state.assets.filter(a => a.kind !== 'ROBOT').length,
    warnings: allWarnings
  }
}

// ============================================================================
// ADVANCED INGESTION API (Multi-Sheet Processing)
// ============================================================================

/**
 * Process a single workbook and extract all detected data types.
 * 
 * This function detects ALL sheet types in a workbook and processes each one.
 * For example, a workbook with both a ToolList sheet and a Robot sheet
 * will have both parsed.
 */
export async function processWorkbook(
  workbook: XLSX.WorkBook,
  fileName: string
): Promise<{
  ingestedData: IngestedData
  warnings: IngestionWarning[]
  detections: Map<SheetCategory, SheetDetection>
}> {
  const ingestedData: IngestedData = {
    simulation: undefined,
    robots: undefined,
    tools: undefined
  }
  const warnings: IngestionWarning[] = []

  // Get all detected sheets
  const detections = getAllDetectedSheets(workbook, fileName)

  // Process SIMULATION_STATUS
  const simDetection = detections.get('SIMULATION_STATUS')
  if (simDetection) {
    try {
      const result = await parseSimulationStatus(workbook, fileName, simDetection.sheetName)
      ingestedData.simulation = result
      warnings.push(...result.warnings)
    } catch (error) {
      warnings.push(createParserErrorWarning({
        fileName,
        sheetName: simDetection.sheetName,
        error: String(error)
      }))
    }
  }

  // Process ROBOT_SPECS
  const robotDetection = detections.get('ROBOT_SPECS')
  if (robotDetection) {
    try {
      const result = await parseRobotList(workbook, fileName, robotDetection.sheetName)
      ingestedData.robots = result
      warnings.push(...result.warnings)
    } catch (error) {
      warnings.push(createParserErrorWarning({
        fileName,
        sheetName: robotDetection.sheetName,
        error: String(error)
      }))
    }
  }

  // Process tool-related categories
  const toolCategories: SheetCategory[] = [
    'IN_HOUSE_TOOLING',
    'REUSE_WELD_GUNS',
    'GUN_FORCE',
    'REUSE_RISERS'
  ]

  for (const category of toolCategories) {
    const toolDetection = detections.get(category)

    if (!toolDetection) {
      continue
    }

    try {
      const result = await parseToolList(workbook, fileName, toolDetection.sheetName)

      if (!ingestedData.tools) {
        ingestedData.tools = result
      } else {
        ingestedData.tools.tools.push(...result.tools)
        ingestedData.tools.warnings.push(...result.warnings)
      }

      warnings.push(...result.warnings)
    } catch (error) {
      warnings.push(createParserErrorWarning({
        fileName,
        sheetName: toolDetection.sheetName,
        error: String(error)
      }))
    }
  }

  return { ingestedData, warnings, detections }
}
