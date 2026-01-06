// Ingestion Coordinator
// Main entry point for ingesting Excel files and routing to appropriate parsers

import { IngestionWarning, UnifiedAsset } from '../domain/core'
import { coreStore } from '../domain/coreStore'
import { readWorkbook, sheetToMatrix } from './excelUtils'
import { parseSimulationStatus } from './simulationStatusParser'
import { parseRobotList } from './robotListParser'
import { parseToolList } from './toolListParser'
import { parseAssembliesList } from './assembliesListParser'
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
import {
  compareVersions,
  VersionComparisonResult
} from './versionComparison'
import { buildCrossRef } from '../domain/crossRef/CrossRefEngine'
import { setCrossRefData } from '../hooks/useCrossRefData'
import type { CrossRefInput, SimulationStatusSnapshot, ToolSnapshot, RobotSnapshot } from '../domain/crossRef/CrossRefTypes'
import { normalizeStationId } from '../domain/crossRef/CrossRefUtils'
import * as XLSX from 'xlsx'
import { syncSimulationStore } from '../features/simulation'
import { log } from '../lib/log'

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
  previewOnly?: boolean  // If true, only return version comparison without applying data
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
  versionComparison?: VersionComparisonResult
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

  if (name.includes('assemblies') && name.includes('list')) {
    return 'AssembliesList'
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
    'ASSEMBLIES_LIST',
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

// ============================================================================
// CROSSREF TRANSFORMATION HELPERS
// ============================================================================

/**
 * Convert ApplyResult to CrossRefInput format for dashboard consumption
 */
function buildCrossRefInputFromApplyResult(applyResult: import('./applyIngestedData').ApplyResult): CrossRefInput {
  // Build area ID to name mapping
  const areaIdToName = new Map<string, string>()
  applyResult.areas.forEach(area => {
    areaIdToName.set(area.id, area.name)
  })

  // Convert Cells to SimulationStatusSnapshot
  const simulationStatusRows: SimulationStatusSnapshot[] = applyResult.cells.map(cell => ({
    stationKey: normalizeStationId(cell.code) || cell.code,
    areaKey: areaIdToName.get(cell.areaId) || cell.areaId, // Map areaId to area name
    lineCode: cell.lineCode, // Use lineCode field
    application: undefined, // Not available in Cell type
    firstStageCompletion: cell.simulation?.percentComplete, // From simulation status
    finalDeliverablesCompletion: cell.simulation?.percentComplete, // Use same value
    dcsConfigured: undefined, // Not available in Cell type
    engineer: cell.assignedEngineer, // Use assignedEngineer
    raw: cell
  }))

  // Convert Tools to ToolSnapshot
  const toolingRows: ToolSnapshot[] = applyResult.tools.map(tool => ({
    stationKey: normalizeStationId(tool.stationNumber || '') || tool.stationNumber || '',
    areaKey: tool.areaName,
    toolId: tool.id,
    simLeader: undefined, // Not in Tool type
    simEmployee: undefined,
    teamLeader: undefined,
    simDueDate: undefined,
    toolType: tool.kind,
    raw: tool
  }))

  // Convert Robots to RobotSnapshot
  const robotSpecsRows: RobotSnapshot[] = applyResult.robots.map(robot => ({
    stationKey: normalizeStationId(robot.stationNumber || '') || robot.stationNumber || '',
    robotKey: robot.id,
    caption: robot.name,
    eNumber: undefined, // Not in Robot type
    hasDressPackInfo: false, // Would need to check metadata
    oemModel: robot.oemModel,
    raw: robot
  }))

  // Empty arrays for data types not available in ApplyResult
  const weldGunRows: any[] = []
  const gunForceRows: any[] = []
  const riserRows: any[] = []

  return {
    simulationStatusRows,
    toolingRows,
    robotSpecsRows,
    weldGunRows,
    gunForceRows,
    riserRows
  }
}

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
        // For simulation status, prefer "SIMULATION" sheet if it exists and detected sheet is too small
        let targetSheet = sheetName || undefined
        if (targetSheet && workbook.SheetNames.includes('SIMULATION')) {
          // Check if detected sheet is too small (likely a summary sheet like "DATA")
          try {
            const testRows = sheetToMatrix(workbook, targetSheet)
            if (testRows.length < 10) {
              // Prefer SIMULATION sheet if it has more data
              const simRows = sheetToMatrix(workbook, 'SIMULATION')
              if (simRows.length > testRows.length) {
                targetSheet = 'SIMULATION'
                log.debug(`[Ingestion] Using SIMULATION sheet instead of ${sheetName} (more rows)`)
              }
            }
          } catch {
            // If we can't read the sheet, try SIMULATION
            targetSheet = 'SIMULATION'
          }
        }
        
        const result = await parseSimulationStatus(workbook, file.name, targetSheet)

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

      if (kind === 'AssembliesList') {
        const result = await parseAssembliesList(workbook, file.name, sheetName || undefined)

        if (!ingestedData.tools) {
          ingestedData.tools = result
        } else {
          ingestedData.tools.tools.push(...result.tools)
          ingestedData.tools.warnings.push(...result.warnings)
        }
      }

      // Note: Metadata files are currently logged and skipped
      if (kind === 'Metadata') {
        log.info(`[Ingestion] Detected Metadata file: ${file.name} (sheet: ${sheetName}). Skipping for now.`)
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

  // NEW: Perform version comparison if store has existing data
  let versionComparison: VersionComparisonResult | undefined = undefined
  const currentState = coreStore.getState()
  const hasExistingData = currentState.projects.length > 0 || currentState.assets.length > 0

  if (hasExistingData) {
    // Convert robots and tools to UnifiedAsset for comparison
    const newAssets: UnifiedAsset[] = [
      ...applyResult.robots.map(r => ({
        id: r.id,
        name: r.name,
        kind: 'ROBOT' as const,
        sourcing: r.sourcing,
        metadata: r.metadata || {},
        areaId: r.areaId,
        areaName: r.areaName,
        cellId: r.cellId,
        stationNumber: r.stationNumber,
        oemModel: r.oemModel,
        description: r.description,
        sourceFile: r.sourceFile,
        sheetName: r.sheetName,
        rowIndex: r.rowIndex
      })),
      ...applyResult.tools.map(t => ({
        id: t.id,
        name: t.name,
        kind: t.kind,
        sourcing: t.sourcing,
        metadata: t.metadata || {},
        areaId: t.areaId,
        areaName: t.areaName,
        cellId: t.cellId,
        stationNumber: t.stationNumber,
        oemModel: t.oemModel,
        description: t.description,
        sourceFile: t.sourceFile,
        sheetName: t.sheetName,
        rowIndex: t.rowIndex
      }))
    ]

    versionComparison = compareVersions(
      applyResult.projects,
      applyResult.areas,
      applyResult.cells,
      newAssets
    )

    log.info('[Version Comparison]', versionComparison.summary)
  }

  // If previewOnly mode, return comparison without applying data
  if (input.previewOnly && versionComparison) {
    return {
      projectsCount: applyResult.projects.length,
      areasCount: applyResult.areas.length,
      cellsCount: applyResult.cells.length,
      robotsCount: applyResult.robots.length,
      toolsCount: applyResult.tools.length,
      warnings: allWarnings,
      versionComparison
    }
  }

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
  syncSimulationStore()

  // NEW: Build and populate CrossRef data for dashboard
  try {
    const crossRefInput = buildCrossRefInputFromApplyResult(applyResult)
    const crossRefResult = buildCrossRef(crossRefInput)
    setCrossRefData(crossRefResult)
    log.debug('[Ingestion] CrossRef data populated for dashboard:', {
      cells: crossRefResult.cells.length,
      flags: crossRefResult.globalFlags.length,
      stats: crossRefResult.stats
    })
  } catch (error) {
    console.error('[Ingestion] Failed to build CrossRef data:', error)
    // Don't fail the entire ingestion if CrossRef fails
  }

  // Get counts from store
  const state = coreStore.getState()

  return {
    projectsCount: state.projects.length,
    areasCount: state.areas.length,
    cellsCount: state.cells.length,
    robotsCount: state.assets.filter(a => a.kind === 'ROBOT').length,
    toolsCount: state.assets.filter(a => a.kind !== 'ROBOT').length,
    warnings: allWarnings,
    versionComparison
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

  // Process ASSEMBLIES_LIST
  const assembliesDetection = detections.get('ASSEMBLIES_LIST')
  if (assembliesDetection) {
    try {
      const result = await parseAssembliesList(workbook, fileName, assembliesDetection.sheetName)

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
        sheetName: assembliesDetection.sheetName,
        error: String(error)
      }))
    }
  }

  return { ingestedData, warnings, detections }
}
