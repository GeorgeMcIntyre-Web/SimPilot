// Ingestion Coordinator
// Main entry point for ingesting Excel files and routing to appropriate parsers

import { IngestionWarning, UnifiedAsset } from '../domain/core'
import { coreStore } from '../domain/coreStore'
import { readWorkbook, sheetToMatrix } from './excelUtils'
import { parseSimulationStatus, VacuumParsedRow, convertVacuumRowsToPanelMilestones } from './simulationStatusParser'
import { calculateOverallCompletion } from './simulationStatus/simulationStatusTypes'
import { parseRobotList } from './robotListParser'
import { parseToolList } from './toolListParser'
import { parseAssembliesList } from './assembliesListParser'
import { applyIngestedData, IngestedData } from './applyIngestedData'
import { createUnknownFileTypeWarning, createParserErrorWarning, createDuplicateFileWarning } from './warningUtils'
import { generateFileHash, trackUploadedFile, getUploadInfo } from './fileTracker'
import { withTransaction } from './transactionManager'
import { validateReferentialIntegrity, logIntegrityErrors, findOrphanedAssets } from './referentialIntegrityValidator'
import { diagnoseOrphanedAssets, logLinkingReport } from './linkingDiagnostics'
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
import {
  DiffResult,
  DiffCreate,
  DiffUpdate,
  DiffDelete,
  DiffRenameOrMove,
  DiffAmbiguous,
  ImportSourceType
} from '../domain/uidTypes'

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
  diffResult?: DiffResult
  importRunId?: string
  linkStats?: {
    linkedCells: number
    totalCells: number
    orphanedAssets: number
  }
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
// MODEL CONTEXT DETECTION
// ============================================================================

/**
 * Infer ModelKey from filename or metadata (best-effort).
 *
 * Strategy:
 * 1. Scan filename for known Model patterns (e.g., "STLA-S", "GLC_X254")
 * 2. Normalize to consistent format (uppercase, underscore-separated)
 * 3. Return undefined if no Model detected
 *
 * Examples:
 * - "STLA-S_ToolList_2026-01.xlsx" → "STLA-S"
 * - "GLC X254 Tool List.xlsx" → "GLC_X254"
 * - "ToolList.xlsx" → undefined
 *
 * Note: This is heuristic-based and may miss some Models.
 * Future: Allow user selection if filename ambiguous.
 */
function inferModelKeyFromFilename(filename: string): string | undefined {
  // Known Model patterns (extend as needed)
  const modelPatterns = [
    /STLA[-_]S/i,
    /GLC[-_]?X?254/i,
    /RANGER[-_]?P?703/i,
    /STLA[-_]LARGE/i,
    /STLA[-_]MEDIUM/i,
    /STLA[-_]SMALL/i
  ]

  for (const pattern of modelPatterns) {
    const match = filename.match(pattern)
    if (match) {
      // Normalize matched model (uppercase, replace spaces/hyphens with underscores)
      return match[0].toUpperCase().replace(/[-\s]+/g, '_')
    }
  }

  return undefined
}

// ============================================================================
// DIFFRESULT ADAPTER (versionComparison -> DiffResult)
// ============================================================================

function buildDiffResultFromVersionComparison(
  importRunId: string,
  sourceFile: string,
  sourceType: ImportSourceType,
  versionComparison: VersionComparisonResult | undefined,
  plantKey: string = 'PLANT_UNKNOWN'
): DiffResult {
  const creates: DiffCreate[] = []
  const updates: DiffUpdate[] = []
  const deletes: DiffDelete[] = []
  const renamesOrMoves: DiffRenameOrMove[] = []
  const ambiguous: DiffAmbiguous[] = []

  if (versionComparison) {
    for (const change of versionComparison.cells) {
      const key = resolveCellKey(change.entity)
      if (change.type === 'ADDED') {
        creates.push({
          key,
          plantKey,
          entityType: 'station',
          attributes: change.entity,
          suggestedName: change.entity.name
        })
        continue
      }

      if (change.type === 'MODIFIED') {
        updates.push({
          uid: change.entity.id,
          key,
          plantKey,
          entityType: 'station',
          oldAttributes: change.oldEntity || {},
          newAttributes: change.entity,
          changedFields: (change.conflicts || []).map(c => c.field)
        })
        continue
      }

      if (change.type === 'REMOVED') {
        deletes.push({
          uid: change.entity.id,
          key,
          plantKey,
          entityType: 'station',
          lastSeen: change.entity.lastUpdated || new Date().toISOString()
        })
      }
    }

    const assetChanges = [...versionComparison.robots, ...versionComparison.tools]
    for (const change of assetChanges) {
      const entityType = change.entity.kind === 'ROBOT' ? 'robot' : 'tool'
      const key = change.entity.id

      if (change.type === 'ADDED') {
        creates.push({
          key,
          plantKey,
          entityType,
          attributes: change.entity,
          suggestedName: change.entity.name
        })
        continue
      }

      if (change.type === 'MODIFIED') {
        updates.push({
          uid: change.entity.id,
          key,
          plantKey,
          entityType,
          oldAttributes: change.oldEntity || {},
          newAttributes: change.entity,
          changedFields: (change.conflicts || []).map(c => c.field)
        })
        continue
      }

      if (change.type === 'REMOVED') {
        deletes.push({
          uid: change.entity.id,
          key,
          plantKey,
          entityType,
          lastSeen: (change.entity as any).lastUpdated || change.entity.metadata?.lastUpdated || new Date().toISOString()
        })
      }
    }
  }

  const totalRows = creates.length + updates.length + deletes.length + renamesOrMoves.length + ambiguous.length

  return {
    importRunId,
    sourceFile,
    sourceType,
    plantKey,
    computedAt: new Date().toISOString(),
    creates,
    updates,
    deletes,
    renamesOrMoves,
    ambiguous,
    summary: {
      totalRows,
      created: creates.length,
      updated: updates.length,
      deleted: deletes.length,
      renamed: renamesOrMoves.length,
      ambiguous: ambiguous.length,
      skipped: 0
    }
  }
}

function resolveCellKey(cell: import('../domain/core').Cell): string {
  return cell.stationId || cell.code || cell.id
}

// ============================================================================
// LAST-SEEN TRACKING (Phase 1 WP6)
// ============================================================================

/**
 * Update lastSeenImportRunId for all entities referenced in this import.
 *
 * This function:
 * - Extracts all unique station numbers, tool IDs, and robot IDs from the import
 * - Matches them against existing Registry records
 * - Updates the lastSeenImportRunId field for matched entities
 *
 * Entities NOT in the Excel file will keep their previous lastSeenImportRunId unchanged.
 */
function updateLastSeenForEntities(
  applyResult: import('./applyIngestedData').ApplyResult,
  importRunId: string
): void {
  const state = coreStore.getState()

  // Extract all unique station identifiers from cells
  const stationKeys = new Set<string>()
  for (const cell of applyResult.cells) {
    if (cell.stationId) {
      stationKeys.add(cell.stationId)
    }
    if (cell.code) {
      stationKeys.add(cell.code)
    }
  }

  // Extract all tool identifiers from tools
  const toolKeys = new Set<string>()
  for (const tool of applyResult.tools) {
    if (tool.id) {
      toolKeys.add(tool.id)
    }
    if (tool.name) {
      toolKeys.add(tool.name)
    }
  }

  // Extract all robot identifiers from robots
  const robotKeys = new Set<string>()
  for (const robot of applyResult.robots) {
    if (robot.id) {
      robotKeys.add(robot.id)
    }
    if (robot.name) {
      robotKeys.add(robot.name)
    }
  }

  // Update StationRecords
  const updatedStations = state.stationRecords.map(record => {
    // Check if this station was referenced in the import
    const wasReferenced = stationKeys.has(record.key) ||
                          (record.labels.fullLabel && stationKeys.has(record.labels.fullLabel)) ||
                          (record.labels.stationNo && stationKeys.has(record.labels.stationNo))

    if (wasReferenced) {
      return {
        ...record,
        lastSeenImportRunId: importRunId,
        updatedAt: new Date().toISOString()
      }
    }
    return record
  })

  // Update ToolRecords
  const updatedTools = state.toolRecords.map(record => {
    // Check if this tool was referenced in the import
    const wasReferenced = toolKeys.has(record.key) ||
                          (record.labels.toolCode && toolKeys.has(record.labels.toolCode)) ||
                          (record.labels.toolName && toolKeys.has(record.labels.toolName))

    if (wasReferenced) {
      return {
        ...record,
        lastSeenImportRunId: importRunId,
        updatedAt: new Date().toISOString()
      }
    }
    return record
  })

  // Update RobotRecords
  const updatedRobots = state.robotRecords.map(record => {
    // Check if this robot was referenced in the import
    const wasReferenced = robotKeys.has(record.key) ||
                          (record.labels.robotCaption && robotKeys.has(record.labels.robotCaption)) ||
                          (record.labels.robotName && robotKeys.has(record.labels.robotName))

    if (wasReferenced) {
      return {
        ...record,
        lastSeenImportRunId: importRunId,
        updatedAt: new Date().toISOString()
      }
    }
    return record
  })

  // Apply updates to store
  if (updatedStations.length > 0) {
    coreStore.upsertStationRecords(updatedStations)
  }
  if (updatedTools.length > 0) {
    coreStore.upsertToolRecords(updatedTools)
  }
  if (updatedRobots.length > 0) {
    coreStore.upsertRobotRecords(updatedRobots)
  }

  log.info(`[Last-Seen Tracking] Updated ImportRun ${importRunId}`)
}

// ============================================================================
// CROSSREF TRANSFORMATION HELPERS
// ============================================================================

/**
 * Convert ApplyResult to CrossRefInput format for dashboard consumption.
 *
 * IMPORTANT: This function merges BOTH the newly ingested data (applyResult) AND
 * existing data from coreStore to ensure complete linking across multiple file loads.
 * This allows equipment loaded before simulation status to be properly linked when
 * simulation status is loaded later (and vice versa).
 *
 * @param applyResult - The result from applyIngestedData
 * @param simulationRobots - Optional robots extracted from simulation status (station+robot combinations)
 * @param vacuumRows - Optional vacuum-parsed rows for panel milestone extraction
 */
function buildCrossRefInputFromApplyResult(
  applyResult: import('./applyIngestedData').ApplyResult,
  simulationRobots?: import('./simulationStatusParser').SimulationRobot[],
  vacuumRows?: VacuumParsedRow[]
): CrossRefInput {
  // Get existing data from the store to merge with new data
  const existingState = coreStore.getState()

  // Merge areas: combine existing + new, deduplicate by ID
  const allAreasMap = new Map<string, import('../domain/core').Area>()
  existingState.areas.forEach(area => allAreasMap.set(area.id, area))
  applyResult.areas.forEach(area => allAreasMap.set(area.id, area)) // New data overwrites
  const allAreas = Array.from(allAreasMap.values())

  // Merge cells: combine existing + new, deduplicate by ID
  const allCellsMap = new Map<string, import('../domain/core').Cell>()
  existingState.cells.forEach(cell => allCellsMap.set(cell.id, cell))
  applyResult.cells.forEach(cell => allCellsMap.set(cell.id, cell)) // New data overwrites
  const allCells = Array.from(allCellsMap.values())

  // Merge robots: combine existing + new, deduplicate by ID
  const existingRobots = existingState.assets.filter(a => a.kind === 'ROBOT') as unknown as import('../domain/core').Robot[]
  const allRobotsMap = new Map<string, import('../domain/core').Robot>()
  existingRobots.forEach(robot => allRobotsMap.set(robot.id, robot))
  applyResult.robots.forEach(robot => allRobotsMap.set(robot.id, robot)) // New data overwrites
  const allRobots = Array.from(allRobotsMap.values())

  // Merge tools: combine existing + new, deduplicate by ID
  const existingTools = existingState.assets.filter(a => a.kind !== 'ROBOT') as unknown as import('../domain/core').Tool[]
  const allToolsMap = new Map<string, import('../domain/core').Tool>()
  existingTools.forEach(tool => allToolsMap.set(tool.id, tool))
  applyResult.tools.forEach(tool => allToolsMap.set(tool.id, tool)) // New data overwrites
  const allTools = Array.from(allToolsMap.values())

  log.debug('[CrossRef] Merging data for CrossRef input:', {
    existingCells: existingState.cells.length,
    newCells: applyResult.cells.length,
    mergedCells: allCells.length,
    existingRobots: existingRobots.length,
    newRobots: applyResult.robots.length,
    mergedRobots: allRobots.length,
    existingTools: existingTools.length,
    newTools: applyResult.tools.length,
    mergedTools: allTools.length
  })

  // Build area ID to name mapping from merged areas
  const areaIdToName = new Map<string, string>()
  allAreas.forEach(area => {
    areaIdToName.set(area.id, area.name)
  })

  // Build panel milestones map from vacuum rows (if available)
  const panelMilestonesMap = vacuumRows && vacuumRows.length > 0
    ? convertVacuumRowsToPanelMilestones(vacuumRows)
    : new Map<string, import('./simulationStatus/simulationStatusTypes').PanelMilestones>()

  // Add normalized station keys to improve matching (handles hyphen vs underscore, leading zeros)
  if (panelMilestonesMap.size > 0) {
    for (const [key, value] of Array.from(panelMilestonesMap.entries())) {
      const normalized = normalizeStationId(key)
      if (normalized && normalized !== key && !panelMilestonesMap.has(normalized)) {
        panelMilestonesMap.set(normalized, value)
      }
    }
  }

  if (panelMilestonesMap.size > 0) {
    console.log('[SimStatus][SIMULATION] Step 8: Panel milestones normalized', {
      totalKeys: panelMilestonesMap.size,
      sampleKeys: [...panelMilestonesMap.keys()].slice(0, 5)
    })
  }

  if (panelMilestonesMap.size > 0) {
    log.debug('[CrossRef] Panel milestones map built:', {
      size: panelMilestonesMap.size,
      sampleKeys: [...panelMilestonesMap.keys()].slice(0, 5)
    })
  }

  // Convert Cells to SimulationStatusSnapshot (using merged cells)
  const simulationStatusRows: SimulationStatusSnapshot[] = allCells.map(cell => {
    // Try to find panel milestones for this cell using multiple key formats
    // The vacuum parser uses stationKey like "8Y-020", but cells might have different formats
    let panelMilestones = panelMilestonesMap.get(cell.code)

    // If not found, try with stationId (which might have a different format)
    if (!panelMilestones && cell.stationId) {
      panelMilestones = panelMilestonesMap.get(cell.stationId)
    }

    // Try normalized keys (handles hyphens/underscores/leading zeros)
    if (!panelMilestones) {
      const normalizedCode = normalizeStationId(cell.code)
      if (normalizedCode) {
        panelMilestones = panelMilestonesMap.get(normalizedCode)
      }
    }
    if (!panelMilestones && cell.stationId) {
      const normalizedStationId = normalizeStationId(cell.stationId)
      if (normalizedStationId) {
        panelMilestones = panelMilestonesMap.get(normalizedStationId)
      }
    }

    // If still not found, try to find a key that contains or matches the cell code
    if (!panelMilestones && panelMilestonesMap.size > 0) {
      // Try case-insensitive match
      const cellCodeUpper = cell.code.toUpperCase()
      for (const [key, value] of panelMilestonesMap) {
        if (key.toUpperCase() === cellCodeUpper) {
          panelMilestones = value
          break
        }
      }
    }

    // Build per-robot panel milestones if robots are known
    let robotPanelMilestones: Record<string, import('./simulationStatus/simulationStatusTypes').PanelMilestones> | undefined
    if (panelMilestonesMap.size > 0) {
      robotPanelMilestones = {}

      // First, attach for known robots
      if (cell.robots && cell.robots.length > 0) {
        for (const robot of cell.robots) {
          const robotCaption = robot.caption || robot.robotKey
          if (!robotCaption) continue
          const key = `${cell.code}::${robotCaption}`
          const panels = panelMilestonesMap.get(key)
          if (panels) {
            robotPanelMilestones[robotCaption] = panels
          }
        }
      }

      // Also attach any robot panels that match this station even if robot not in list
      const prefix = `${cell.code}::`.toUpperCase()
      for (const [key, panels] of panelMilestonesMap) {
        const upperKey = key.toUpperCase()
        if (upperKey.startsWith(prefix)) {
          const robotCaption = key.split('::', 2)[1]
          if (robotCaption) {
            robotPanelMilestones[robotCaption] = panels
          }
        }
      }

      if (Object.keys(robotPanelMilestones).length === 0) {
        robotPanelMilestones = undefined
      }
    }

    // Calculate overall completion from panel milestones
    let overallCompletion: number | undefined
    if (robotPanelMilestones) {
      // Average the per-robot overall completions
      const robotCompletions: number[] = []
      for (const panels of Object.values(robotPanelMilestones)) {
        const c = calculateOverallCompletion(panels)
        if (c !== null) robotCompletions.push(c)
      }
      overallCompletion = robotCompletions.length > 0
        ? Math.round(robotCompletions.reduce((s, v) => s + v, 0) / robotCompletions.length)
        : undefined
    } else if (panelMilestones) {
      const c = calculateOverallCompletion(panelMilestones)
      overallCompletion = c !== null ? c : undefined
    }

    return {
      stationKey: cell.code,
      areaKey: areaIdToName.get(cell.areaId) || cell.areaId,
      lineCode: cell.lineCode,
      application: cell.simulation?.application,
      hasIssues: cell.simulation?.hasIssues,
      firstStageCompletion: overallCompletion ?? cell.simulation?.percentComplete,
      finalDeliverablesCompletion: cell.simulation?.percentComplete,
      dcsConfigured: undefined,
      engineer: cell.assignedEngineer,
      panelMilestones,
      robotPanelMilestones,
      raw: cell
    }
  })

  // Log panel milestones attachment stats
  if (panelMilestonesMap.size > 0) {
    const withMilestones = simulationStatusRows.filter(r => r.panelMilestones !== undefined).length
    log.debug('[CrossRef] Panel milestones attached to cells:', {
      totalCells: simulationStatusRows.length,
      cellsWithMilestones: withMilestones,
      cellsWithoutMilestones: simulationStatusRows.length - withMilestones
    })

    console.log('[SimStatus][SIMULATION] Step 9: Panel milestones attached to cells', {
      totalCells: simulationStatusRows.length,
      cellsWithMilestones: withMilestones,
      cellsWithoutMilestones: simulationStatusRows.length - withMilestones
    })
  }

  // Convert Tools to ToolSnapshot (using merged tools)
  const toolingRows: ToolSnapshot[] = allTools.map(tool => ({
    stationKey: tool.stationNumber || '',
    areaKey: tool.areaName,
    toolId: tool.id,
    simLeader: undefined, // Not in Tool type
    simEmployee: undefined,
    teamLeader: undefined,
    simDueDate: undefined,
    toolType: tool.kind,
    raw: tool
  }))

  // Convert Robots from robot list files to RobotSnapshot (using merged robots)
  const robotSpecsRows: RobotSnapshot[] = allRobots.map(robot => ({
    stationKey: robot.stationNumber || '',
    robotKey: robot.id,
    caption: robot.name,
    eNumber: undefined, // Not in Robot type
    hasDressPackInfo: false, // Would need to check metadata
    oemModel: robot.oemModel,
    raw: robot
  }))

  // Also add robots extracted from simulation status
  // These represent station+robot combinations found in the simulation status file
  // One station can have multiple robots, so this is the authoritative source for robot counts
  if (simulationRobots && simulationRobots.length > 0) {
    // Track which station+robot combinations we've already added from robot specs
    const existingCombinations = new Set(
      robotSpecsRows.map(r => `${r.stationKey.toUpperCase()}::${(r.caption || '').toUpperCase()}`)
    )

    for (const simRobot of simulationRobots) {
      const stationKey = simRobot.stationKey
      const compositeKey = `${stationKey.toUpperCase()}::${simRobot.robotCaption.toUpperCase()}`

      // Skip if we already have this station+robot from robot specs
      if (existingCombinations.has(compositeKey)) {
        continue
      }

      robotSpecsRows.push({
        stationKey: stationKey,
        robotKey: `simstatus-${stationKey}-${simRobot.robotCaption}`.replace(/\s+/g, '_'),
        caption: simRobot.robotCaption,
        eNumber: undefined,
        hasDressPackInfo: false, // Not available from simulation status
        oemModel: undefined,
        raw: { source: 'simulationStatus', ...simRobot }
      })

      existingCombinations.add(compositeKey)
    }

    log.debug(`[CrossRef] Added ${simulationRobots.length} robots from simulation status`)
  }

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
 * Wrapped in transaction for automatic rollback on error.
 */
export async function ingestFiles(
  input: IngestFilesInput
): Promise<IngestFilesResult> {
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

  // Execute ingestion within transaction context
  const txResult = await withTransaction(async () => {
    return await ingestFilesInternal(input)
  })

  // If transaction failed (rolled back), return error as warning
  if (!txResult.success) {
    const errorWarning: IngestionWarning = {
      id: 'transaction-rollback',
      kind: 'PARSER_ERROR',
      fileName: '',
      message: `Ingestion failed and was rolled back: ${txResult.error?.message || 'Unknown error'}`,
      createdAt: new Date().toISOString()
    }

    return {
      projectsCount: 0,
      areasCount: 0,
      cellsCount: 0,
      robotsCount: 0,
      toolsCount: 0,
      warnings: [errorWarning]
    }
  }

  return txResult.data!
}

/**
 * Internal ingestion logic (wrapped by transaction)
 */
async function ingestFilesInternal(
  input: IngestFilesInput
): Promise<IngestFilesResult> {
  const allFiles = [...input.simulationFiles, ...input.equipmentFiles]

  const ingestedData: IngestedData = {
    simulation: undefined,
    robots: undefined,
    tools: undefined
  }

  const allWarnings: IngestionWarning[] = []
  const fileHashToFile = new Map<string, File>() // Track files by hash for later tracking

  // Process each file
  for (const file of allFiles) {
    try {
      // Check for duplicate file upload
      const uploadInfo = await getUploadInfo(file)
      if (uploadInfo) {
        allWarnings.push(createDuplicateFileWarning({
          fileName: file.name,
          previousUploadDate: uploadInfo.uploadedAt
        }))
        log.debug(`[Ingestion] Skipping duplicate file: ${file.name} (previously uploaded ${uploadInfo.uploadedAt})`)
        continue // Skip this file
      }

      // Read workbook first
      const workbook = await readWorkbook(file)

      // Generate file hash for tracking
      const fileHash = await generateFileHash(file)

      // Detect type and best sheet using Sheet Sniffer
      const { kind, sheetName } = detectFileTypeAndSheet(workbook, file.name)

      if (kind === 'Unknown') {
        allWarnings.push(createUnknownFileTypeWarning({
          fileName: file.name
        }))
        continue
      }

      // Store file for later tracking
      fileHashToFile.set(fileHash, file)

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
        
        // Always parse all simulation-related sheets when the SIMULATION sheet exists;
        // this avoids missing the primary SIMULATION data if detection selected a secondary sheet.
        const shouldParseAll = workbook.SheetNames.some(n => n.toUpperCase().includes('SIMULATION'))
        const result = shouldParseAll
          ? await parseSimulationStatus(workbook, file.name) // auto-detect all relevant sheets
          : await parseSimulationStatus(workbook, file.name, targetSheet)

        if (!ingestedData.simulation) {
          ingestedData.simulation = result
        } else {
          ingestedData.simulation.projects.push(...result.projects)
          ingestedData.simulation.areas.push(...result.areas)
          ingestedData.simulation.cells.push(...result.cells)
          ingestedData.simulation.warnings.push(...result.warnings)
          // Merge vacuum rows and robots from simulation status
          if (result.vacuumRows) {
            ingestedData.simulation.vacuumRows = [
              ...(ingestedData.simulation.vacuumRows || []),
              ...result.vacuumRows
            ]
          }
          if (result.robotsFromSimStatus) {
            ingestedData.simulation.robotsFromSimStatus = [
              ...(ingestedData.simulation.robotsFromSimStatus || []),
              ...result.robotsFromSimStatus
            ]
          }
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
      log.error(`[Ingestion] Error processing file ${file.name}:`, error)
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

  // Validate referential integrity before committing
  const integrityResult = validateReferentialIntegrity({
    projects: applyResult.projects,
    areas: applyResult.areas,
    cells: applyResult.cells,
    robots: applyResult.robots,
    tools: applyResult.tools
  })

  // Log integrity errors for debugging
  logIntegrityErrors(integrityResult)

  // If there are critical referential integrity violations, throw error to trigger rollback
  if (!integrityResult.isValid) {
    const criticalErrors = integrityResult.errors.filter(e =>
      e.field === 'projectId' || e.field === 'areaId'
    )

    if (criticalErrors.length > 0) {
      throw new Error(
        `Referential integrity violations detected: ${criticalErrors.length} critical errors. ` +
        `${integrityResult.summary.danglingProjectRefs} dangling project refs, ` +
        `${integrityResult.summary.danglingAreaRefs} dangling area refs. ` +
        `First error: ${criticalErrors[0].message}`
      )
    }
  }

  // Log orphaned assets as warnings (non-critical)
  const orphans = findOrphanedAssets({
    robots: applyResult.robots,
    tools: applyResult.tools
  })

  if (orphans.robots.length > 0 || orphans.tools.length > 0) {
    log.warn(`[Integrity] Found ${orphans.robots.length} orphaned robots and ${orphans.tools.length} orphaned tools`)

    // Run diagnostics on orphaned assets
    const allOrphans = [...orphans.robots, ...orphans.tools]
    const diagnostics = diagnoseOrphanedAssets(allOrphans, applyResult.cells)

    // Log detailed diagnostic report
    logLinkingReport(diagnostics)

    allWarnings.push({
      id: 'orphaned-assets',
      kind: 'LINKING_MISSING_TARGET',
      fileName: '',
      message: `Found ${orphans.robots.length + orphans.tools.length} orphaned assets (not linked to any cell). Check console for detailed diagnostics.`,
      createdAt: new Date().toISOString()
    })
  }

  // Track uploaded files with their created entity IDs
  // NOTE: Skip tracking when running in preview-only mode so the confirmation
  // pass can process the same files without being treated as duplicates.
  if (!input.previewOnly) {
    const allEntityIds = [
      ...applyResult.projects.map(p => p.id),
      ...applyResult.areas.map(a => a.id),
      ...applyResult.cells.map(c => c.id),
      ...applyResult.robots.map(r => r.id),
      ...applyResult.tools.map(t => t.id)
    ]

    for (const file of fileHashToFile.values()) {
      await trackUploadedFile(file, allEntityIds)
    }
  }

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
        metadata: {
          ...(r.metadata || {}),
          // Surface robot application/function for downstream tables
          function: (r as any).application,
          application: (r as any).application,
          applicationCode: (r as any).applicationCode,
          robotType: (r as any).robotType || r.metadata?.robotType || r.metadata?.['Robot Type'],
          installStatus:
            (r as any).installStatus ||
            r.metadata?.installStatus ||
            r.metadata?.['Install status'] ||
            r.metadata?.['Install Status'],
          applicationConcern:
            (r as any).applicationConcern ||
            r.metadata?.applicationConcern ||
            r.metadata?.['Robot application concern'],
          comment:
            (r as any).comment ||
            r.metadata?.comment ||
            r.metadata?.esowComment ||
            r.metadata?.['ESOW Comment']
        },
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

  const sourceFileName = input.simulationFiles[0]?.name || input.equipmentFiles[0]?.name || 'unknown'
  const importSourceType: ImportSourceType = input.simulationFiles.length > 0 ? 'simulationStatus' :
    input.equipmentFiles.length > 0 ? 'toolList' : 'toolList'
  const importRunId = crypto.randomUUID()
  const modelKey = inferModelKeyFromFilename(sourceFileName)
  const diffResult: DiffResult = buildDiffResultFromVersionComparison(
    importRunId,
    sourceFileName,
    importSourceType,
    versionComparison
  )

  // If previewOnly mode, return comparison without applying data
  if (input.previewOnly) {
    return {
      projectsCount: applyResult.projects.length,
      areasCount: applyResult.areas.length,
      cellsCount: applyResult.cells.length,
      robotsCount: applyResult.robots.length,
      toolsCount: applyResult.tools.length,
      warnings: allWarnings,
      versionComparison,
      diffResult,
      importRunId,
      linkStats: applyResult.linkStats
    }
  }

  // Create ImportRun record for last-seen tracking
  const importRun: import('../domain/uidTypes').ImportRun = {
    id: importRunId,
    sourceFileName,
    sourceType: importSourceType,
    plantKey: 'PLANT_UNKNOWN', // TODO: Derive from filename/metadata when plant detection is implemented
    plantKeySource: 'unknown',
    modelKey, // Vehicle program inferred from filename (optional)
    importedAt: new Date().toISOString(),
    counts: {
      created: diffResult.summary.created,
      updated: diffResult.summary.updated,
      deleted: diffResult.summary.deleted,
      renamed: diffResult.summary.renamed,
      ambiguous: diffResult.summary.ambiguous
    }
  }
  coreStore.addImportRun(importRun)
  coreStore.addDiffResult(diffResult)

  // Log Model context if detected
  if (modelKey) {
    log.info(`[Model Context] Detected model: ${modelKey} from filename: ${sourceFileName}`)
  }

  // Update lastSeenImportRunId for all entities referenced in this import
  updateLastSeenForEntities(applyResult, importRunId)

  // Update core store (backward compat: store warnings as strings)
  const warningStrings = allWarnings.map(w => w.message)

  // Log what we're about to store for debugging
  log.info(`[Ingestion] Storing to coreStore: ${applyResult.projects.length} projects, ${applyResult.areas.length} areas, ${applyResult.cells.length} cells, ${applyResult.robots.length} robots, ${applyResult.tools.length} tools`)

  coreStore.setData({
    projects: applyResult.projects,
    areas: applyResult.areas,
    cells: applyResult.cells,
    robots: applyResult.robots,
    tools: applyResult.tools,
    warnings: warningStrings,
    overviewSchedule: applyResult.overviewSchedule
  }, input.dataSource)
  syncSimulationStore()

  // NEW: Build and populate CrossRef data for dashboard
  try {
    // Pass robots from simulation status for accurate robot counts per station
    const simulationRobots = ingestedData.simulation?.robotsFromSimStatus
    // Pass vacuum rows for panel milestone extraction
    const vacuumRows = ingestedData.simulation?.vacuumRows
    const crossRefInput = buildCrossRefInputFromApplyResult(applyResult, simulationRobots, vacuumRows)
    const crossRefResult = buildCrossRef(crossRefInput)
    setCrossRefData(crossRefResult)
    log.debug('[Ingestion] CrossRef data populated for dashboard:', {
      cells: crossRefResult.cells.length,
      flags: crossRefResult.globalFlags.length,
      stats: crossRefResult.stats,
      robotsFromSimStatus: simulationRobots?.length ?? 0
    })
  } catch (error) {
    log.error('[Ingestion] Failed to build CrossRef data:', error)
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
    versionComparison,
    diffResult,
    importRunId,
    linkStats: applyResult.linkStats
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
      // If the workbook contains any SIMULATION-named sheet, parse all relevant sheets;
      // otherwise fall back to the detected sheet only.
      const hasSimulationSheet = workbook.SheetNames.some(n => n.toUpperCase().includes('SIMULATION'))
      const result = hasSimulationSheet
        ? await parseSimulationStatus(workbook, fileName) // auto-detect & parse all simulation sheets
        : await parseSimulationStatus(workbook, fileName, simDetection.sheetName)
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
