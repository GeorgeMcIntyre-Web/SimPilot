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
import { createUnknownFileTypeWarning, createParserErrorWarning, createDuplicateFileWarning } from './warningUtils'
import { generateFileHash, trackUploadedFile, getUploadInfo } from './fileTracker'
import { withTransaction } from './transactionManager'
import { validateReferentialIntegrity, logIntegrityErrors, findOrphanedAssets } from './referentialIntegrityValidator'
import { diagnoseOrphanedAssets, logLinkingReport } from './linkingDiagnostics'
import { compareVersions, VersionComparisonResult } from './versionComparison'
import { buildCrossRef } from '../domain/crossRef/CrossRefEngine'
import { setCrossRefData } from '../hooks/useCrossRefData'
import { syncSimulationStore } from '../features/simulation'
import { log } from '../lib/log'
import { ImportSourceType, DiffResult } from '../domain/uidTypes'

// Import from extracted modules
import { IngestFilesInput, IngestFilesResult } from './ingestionTypes'
import { detectFileTypeAndSheet } from './fileClassifier'
import { inferModelKeyFromFilename } from './modelContextDetector'
import { buildDiffResultFromVersionComparison } from './diffResultAdapter'
import { updateLastSeenForEntities } from './lastSeenTracker'
import { buildCrossRefInputFromApplyResult } from './crossRefTransformer'
// Re-export types for backwards compatibility
export type { IngestFilesInput, IngestFilesResult } from './ingestionTypes'
export type { IngestionWarning } from '../domain/core'

// ============================================================================
// MAIN INGESTION API
// ============================================================================

/**
 * High-level ingestion entry point.
 * Wrapped in transaction for automatic rollback on error.
 */
export async function ingestFiles(
  input: IngestFilesInput
): Promise<IngestFilesResult> {
  // Check if we have existing data in the store (allows equipment-only imports after initial load)
  const currentState = coreStore.getState()
  const hasExistingData = currentState.projects.length > 0 && currentState.cells.length > 0

  // Validate input - require at least one simulation file for initial load,
  // but allow equipment-only imports if simulation data already exists
  if (input.simulationFiles.length === 0 && !hasExistingData) {
    const warning: IngestionWarning = {
      id: 'no-simulation-files',
      kind: 'PARSER_ERROR',
      fileName: '',
      message: 'At least one Simulation Status file is required for the first load. Please upload a file containing project and cell data.',
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

  // Validate that we have at least one file to process
  if (input.simulationFiles.length === 0 && input.equipmentFiles.length === 0) {
    const warning: IngestionWarning = {
      id: 'no-files',
      kind: 'PARSER_ERROR',
      fileName: '',
      message: 'No files provided. Please select at least one file to import.',
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
  const importRunId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Math.random().toString(16).slice(2)}-${Date.now()}`
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

// Re-export processWorkbook for backwards compatibility
export { processWorkbook } from './workbookProcessor'
