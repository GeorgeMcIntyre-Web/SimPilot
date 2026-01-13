// Ingestion Coordinator V2
// Enhanced ingestion with full telemetry support
// Uses the Sheet Sniffer for accurate sheet detection

import { IngestionWarning, UnifiedAsset } from '../domain/core'
import { coreStore } from '../domain/coreStore'
import { readWorkbook } from './excelUtils'
import { parseSimulationStatus } from './simulationStatusParser'
import { parseRobotList } from './robotListParser'
import { parseToolList } from './toolListParser'
import { applyIngestedData, IngestedData, type ApplyResult } from './applyIngestedData'
import { SheetCategory } from './sheetSniffer'
import {
  IngestionStage,
  FileIngestionResult,
  FileIngestionWarning,
  IngestionRunResult,
  FileScanSummary,
  SheetSampleData,
  scanFileForTelemetry,
  extractSampleData,
  createTelemetryWarning,
  deriveIngestionStatus,
  generateRunId
} from './ingestionTelemetry'
import * as XLSX from 'xlsx'
import { DiffResult, ImportSourceType, DiffCreate, DiffUpdate, DiffDelete, DiffRenameOrMove, ImportRun } from '../domain/uidTypes'
import { compareVersions, type VersionComparisonResult } from './versionComparison'
import { log } from '../lib/log'

// ============================================================================
// PUBLIC API TYPES
// ============================================================================

/**
 * Input for the enhanced ingestion API.
 */
export interface IngestFilesInputV2 {
  files: File[]
  fileSources?: Record<string, 'Local' | 'MS365'>
  stage?: IngestionStage
}

/**
 * Result of enhanced ingestion operation.
 */
export interface IngestFilesResultV2 {
  runResult: IngestionRunResult
  projectsCount: number
  areasCount: number
  cellsCount: number
  robotsCount: number
  toolsCount: number
  warnings: IngestionWarning[]
  diffResult?: DiffResult
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert a telemetry warning to a legacy IngestionWarning
 */
function telemetryToLegacyWarning(warning: FileIngestionWarning): IngestionWarning {
  return {
    id: warning.id,
    kind: mapWarningCodeToKind(warning.code),
    fileName: warning.fileName,
    sheetName: warning.sheetName,
    rowIndex: warning.rowIndex,
    message: warning.message,
    details: warning.details,
    createdAt: new Date().toISOString()
  }
}

/**
 * Map warning code to legacy kind
 */
function mapWarningCodeToKind(code: string): IngestionWarning['kind'] {
  switch (code) {
    case 'UNKNOWN_FILE_TYPE':
      return 'UNKNOWN_FILE_TYPE'
    case 'NO_HEADER_FOUND':
    case 'MISSING_REQUIRED_COLUMN':
      return 'HEADER_MISMATCH'
    case 'ROW_SKIPPED':
      return 'ROW_SKIPPED'
    case 'LINKING_AMBIGUOUS':
      return 'LINKING_AMBIGUOUS'
    case 'LINKING_MISSING_TARGET':
      return 'LINKING_MISSING_TARGET'
    default:
      return 'PARSER_ERROR'
  }
}

/**
 * Convert legacy IngestionWarning to telemetry warning
 */
function legacyToTelemetryWarning(warning: IngestionWarning): FileIngestionWarning {
  return {
    id: warning.id,
    fileName: warning.fileName,
    sheetName: warning.sheetName,
    rowIndex: warning.rowIndex,
    code: mapLegacyKindToCode(warning.kind),
    message: warning.message,
    severity: warning.kind === 'PARSER_ERROR' ? 'error' : 'warning',
    details: warning.details
  }
}

/**
 * Map legacy kind to warning code
 */
function mapLegacyKindToCode(kind: IngestionWarning['kind']): FileIngestionWarning['code'] {
  switch (kind) {
    case 'UNKNOWN_FILE_TYPE':
      return 'UNKNOWN_FILE_TYPE'
    case 'HEADER_MISMATCH':
      return 'MISSING_REQUIRED_COLUMN'
    case 'ROW_SKIPPED':
      return 'ROW_SKIPPED'
    case 'LINKING_AMBIGUOUS':
      return 'LINKING_AMBIGUOUS'
    case 'LINKING_MISSING_TARGET':
      return 'LINKING_MISSING_TARGET'
    default:
      return 'PARSER_ERROR'
  }
}

// ============================================================================
// DIFFRESULT BUILDER (Telemetry Path, using version comparison)
// ============================================================================

function buildDiffResultFromVersionComparison(
  importRunId: string,
  sourceFile: string,
  sourceType: ImportSourceType,
  versionComparison: VersionComparisonResult | undefined
): DiffResult {
  const creates: DiffCreate[] = []
  const updates: DiffUpdate[] = []
  const deletes: DiffDelete[] = []
  const renamesOrMoves: DiffRenameOrMove[] = []
  const ambiguous: DiffAmbiguous[] = []
  const plantKey = 'PLANT_UNKNOWN'

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

function deriveSourceType(fileResults: FileIngestionResult[]): ImportSourceType {
  const first = fileResults[0]
  if (!first || !first.scanSummary) return 'toolList'
  const category = first.scanSummary.category
  if (category === 'SIMULATION_STATUS') return 'simulationStatus'
  if (category === 'ROBOT_SPECS') return 'robotList'
  return 'toolList'
}

function resolveCellKey(cell: import('../domain/core').Cell): string {
  return cell.stationId || cell.code || cell.id
}

function buildVersionComparison(
  _previousState: ReturnType<typeof coreStore.getState>,
  applyResult: ApplyResult
): VersionComparisonResult {
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

  return compareVersions(
    applyResult.projects,
    applyResult.areas,
    applyResult.cells,
    newAssets
  )
}

// ============================================================================
// MAIN ENHANCED INGESTION API
// ============================================================================

/**
 * Enhanced ingestion entry point with full telemetry support.
 * 
 * Supports three stages:
 * - SCAN_ONLY: Just scan files and return telemetry (no parsing)
 * - SCAN_AND_PARSE: Scan and parse, but don't apply to store
 * - APPLY_TO_STORE: Full ingestion with store update
 */
export async function ingestFilesV2(
  input: IngestFilesInputV2
): Promise<IngestFilesResultV2> {
  const startTime = Date.now()
  const runId = generateRunId()
  const stage = input.stage ?? 'APPLY_TO_STORE'
  const fileResults: FileIngestionResult[] = []
  const previousState = coreStore.getState()
  let versionComparison: VersionComparisonResult | undefined = undefined
  let diffResult: DiffResult | undefined = undefined

  // Track data for later application
  const ingestedData: IngestedData = {
    simulation: undefined,
    robots: undefined,
    tools: undefined
  }

  // Process each file
  for (const file of input.files) {
    const fileStartTime = Date.now()
    const source = input.fileSources?.[file.name] ?? 'Local'

    const result = await processFileWithTelemetry(
      file,
      source,
      stage,
      ingestedData
    )

    result.processingTimeMs = Date.now() - fileStartTime
    fileResults.push(result)
  }

  // Aggregate counts
  let aggregateCounts = {
    projects: 0,
    areas: 0,
    cells: 0,
    robots: 0,
    tools: 0
  }

  // Only apply to store if we're in that stage
  if (stage === 'APPLY_TO_STORE') {
    const applyResult = applyIngestedData(ingestedData)
    versionComparison = buildVersionComparison(previousState, applyResult)

    // Update core store
    const source = determineDataSource(input.fileSources)
    const allWarnings = fileResults.flatMap(r => r.warnings)
    const warningStrings = allWarnings.map(w => w.message)

    coreStore.setData({
      projects: applyResult.projects,
      areas: applyResult.areas,
      cells: applyResult.cells,
      robots: applyResult.robots,
      tools: applyResult.tools,
      warnings: warningStrings
    }, source)

    // Create DiffResult from version comparison (minimal but real data)
    const sourceFileName = input.files[0]?.name || 'unknown'
    const sourceType = deriveSourceType(fileResults)
    diffResult = buildDiffResultFromVersionComparison(
      runId,
      sourceFileName,
      sourceType,
      versionComparison
    )
    coreStore.addDiffResult(diffResult)

    // Create ImportRun record for tracking
    const importRun: ImportRun = {
      id: runId,
      sourceFileName,
      sourceType,
      plantKey: 'PLANT_UNKNOWN',
      plantKeySource: 'unknown',
      modelKey: undefined,
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

    // Get counts from store
    const state = coreStore.getState()
    aggregateCounts = {
      projects: state.projects.length,
      areas: state.areas.length,
      cells: state.cells.length,
      robots: state.assets.filter(a => a.kind === 'ROBOT').length,
      tools: state.assets.filter(a => a.kind !== 'ROBOT').length
    }

    // Add linking warnings
    for (const warning of applyResult.warnings) {
      const telemetryWarning = legacyToTelemetryWarning(warning)
      // Find appropriate file result to add warning to
      const targetFile = findFileForWarning(fileResults, warning)
      if (targetFile) {
        targetFile.warnings.push(telemetryWarning)
      }
    }
  }

  // Calculate status counts
  let successCount = 0
  let failureCount = 0
  let partialCount = 0

  for (const result of fileResults) {
    if (result.status === 'OK') {
      successCount += 1
      continue
    }
    if (result.status === 'FAILED') {
      failureCount += 1
      continue
    }
    if (result.status === 'PARTIAL' || result.status === 'UNKNOWN_FILE_TYPE') {
      partialCount += 1
    }
  }

  // Build run result
  const runResult: IngestionRunResult = {
    runId,
    stage,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    totalProcessingTimeMs: Date.now() - startTime,
    fileResults,
    aggregateCounts,
    aggregateWarnings: fileResults.flatMap(r => r.warnings),
    successCount,
    failureCount,
    partialCount
  }

  // Convert telemetry warnings to legacy warnings for backward compat
  const legacyWarnings = runResult.aggregateWarnings.map(telemetryToLegacyWarning)

  return {
    runResult,
    projectsCount: aggregateCounts.projects,
    areasCount: aggregateCounts.areas,
    cellsCount: aggregateCounts.cells,
    robotsCount: aggregateCounts.robots,
    toolsCount: aggregateCounts.tools,
    warnings: legacyWarnings,
    diffResult
  }
}

// ============================================================================
// FILE PROCESSING
// ============================================================================

/**
 * Process a single file with full telemetry
 */
async function processFileWithTelemetry(
  file: File,
  source: 'Local' | 'MS365',
  stage: IngestionStage,
  ingestedData: IngestedData
): Promise<FileIngestionResult> {
  const warnings: FileIngestionWarning[] = []
  let scanSummary: FileScanSummary | null = null
  let sampleData: SheetSampleData | null = null
  let errorMessage: string | undefined
  const entityCounts = { projects: 0, areas: 0, cells: 0, robots: 0, tools: 0 }

  try {
    // Read workbook
    const workbook = await readWorkbook(file)

    // Scan for telemetry
    scanSummary = scanFileForTelemetry(workbook, file.name, source)

    // Extract sample data from detected sheet
    sampleData = extractSampleData(workbook, scanSummary.sheetName)

    // Check for unknown file type
    if (scanSummary.category === 'UNKNOWN') {
      warnings.push(createTelemetryWarning({
        fileName: file.name,
        code: 'UNKNOWN_FILE_TYPE',
        message: `Could not determine file type. Available sheets: ${workbook.SheetNames.join(', ')}`,
        severity: 'warning'
      }))
    }

    // If only scanning, we're done
    if (stage === 'SCAN_ONLY') {
      return buildFileResult(file, stage, scanSummary, sampleData, entityCounts, warnings)
    }

    // Skip parsing for unknown files
    if (scanSummary.category === 'UNKNOWN') {
      return buildFileResult(file, stage, scanSummary, sampleData, entityCounts, warnings)
    }

    // Route to appropriate parser
    const parserResult = await routeToParser(
      workbook,
      file.name,
      scanSummary
    )

    // Merge parser results
    mergeParserResult(ingestedData, parserResult, scanSummary.category)

    // Add parser warnings
    for (const parserWarning of parserResult.warnings) {
      warnings.push(legacyToTelemetryWarning(parserWarning))
    }

    // Update entity counts
    entityCounts.projects = parserResult.projects?.length ?? 0
    entityCounts.areas = parserResult.areas?.length ?? 0
    entityCounts.cells = parserResult.cells?.length ?? 0
    entityCounts.robots = parserResult.robots?.length ?? 0
    entityCounts.tools = parserResult.tools?.length ?? 0

  } catch (error) {
    log.error(`[IngestionV2] Error processing file ${file.name}:`, error)
    errorMessage = error instanceof Error ? error.message : String(error)

    warnings.push(createTelemetryWarning({
      fileName: file.name,
      code: 'PARSER_ERROR',
      message: `Processing failed: ${errorMessage}`,
      severity: 'error'
    }))
  }

  return buildFileResult(file, stage, scanSummary, sampleData, entityCounts, warnings, errorMessage)
}

/**
 * Build a FileIngestionResult from components
 */
function buildFileResult(
  file: File,
  stage: IngestionStage,
  scanSummary: FileScanSummary | null,
  sampleData: SheetSampleData | null,
  entityCounts: FileIngestionResult['entityCounts'],
  warnings: FileIngestionWarning[],
  errorMessage?: string
): FileIngestionResult {
  return {
    fileName: file.name,
    fileSize: file.size,
    stage,
    status: deriveIngestionStatus(warnings, errorMessage),
    scanSummary,
    sampleData,
    entityCounts,
    warnings,
    errorMessage,
    processingTimeMs: 0 // Will be set by caller
  }
}

// ============================================================================
// PARSER ROUTING
// ============================================================================

interface ParserResult {
  projects?: { id: string }[]
  areas?: { id: string }[]
  cells?: { id: string }[]
  robots?: { id: string }[]
  tools?: { id: string }[]
  warnings: IngestionWarning[]
}

/**
 * Route to the appropriate parser based on category
 */
async function routeToParser(
  workbook: XLSX.WorkBook,
  fileName: string,
  scanSummary: FileScanSummary
): Promise<ParserResult> {
  const fileKind = scanSummary.fileKind
  const sheetName = scanSummary.sheetName

  if (fileKind === 'SimulationStatus') {
    const result = await parseSimulationStatus(workbook, fileName, sheetName)
    return {
      projects: result.projects,
      areas: result.areas,
      cells: result.cells,
      warnings: result.warnings
    }
  }

  if (fileKind === 'RobotList') {
    const result = await parseRobotList(workbook, fileName, sheetName)
    return {
      robots: result.robots,
      warnings: result.warnings
    }
  }

  if (fileKind === 'ToolList') {
    const result = await parseToolList(workbook, fileName, sheetName)
    return {
      tools: result.tools,
      warnings: result.warnings
    }
  }

  // Metadata and Unknown don't have parsers yet
  return { warnings: [] }
}

/**
 * Merge parser results into the ingested data accumulator
 */
function mergeParserResult(
  ingestedData: IngestedData,
  result: ParserResult,
  _category: SheetCategory
): void {
  // Simulation data
  if (result.projects && result.areas && result.cells) {
    if (ingestedData.simulation === undefined) {
      ingestedData.simulation = {
        projects: result.projects as NonNullable<IngestedData['simulation']>['projects'],
        areas: result.areas as NonNullable<IngestedData['simulation']>['areas'],
        cells: result.cells as NonNullable<IngestedData['simulation']>['cells'],
        warnings: result.warnings
      }
      return
    }

    ingestedData.simulation.projects.push(...(result.projects as NonNullable<IngestedData['simulation']>['projects']))
    ingestedData.simulation.areas.push(...(result.areas as NonNullable<IngestedData['simulation']>['areas']))
    ingestedData.simulation.cells.push(...(result.cells as NonNullable<IngestedData['simulation']>['cells']))
    ingestedData.simulation.warnings.push(...result.warnings)
    return
  }

  // Robot data
  if (result.robots) {
    if (ingestedData.robots === undefined) {
      ingestedData.robots = {
        robots: result.robots as NonNullable<IngestedData['robots']>['robots'],
        warnings: result.warnings
      }
      return
    }

    ingestedData.robots.robots.push(...(result.robots as NonNullable<IngestedData['robots']>['robots']))
    ingestedData.robots.warnings.push(...result.warnings)
    return
  }

  // Tool data
  if (result.tools) {
    if (ingestedData.tools === undefined) {
      ingestedData.tools = {
        tools: result.tools as NonNullable<IngestedData['tools']>['tools'],
        warnings: result.warnings
      }
      return
    }

    ingestedData.tools.tools.push(...(result.tools as NonNullable<IngestedData['tools']>['tools']))
    ingestedData.tools.warnings.push(...result.warnings)
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Determine the overall data source from file sources
 */
function determineDataSource(
  fileSources?: Record<string, 'Local' | 'MS365'>
): 'Local' | 'MS365' | undefined {
  if (fileSources === undefined) {
    return 'Local'
  }

  const sources = Object.values(fileSources)
  if (sources.length === 0) {
    return 'Local'
  }

  // If any file is from MS365, consider the whole batch as MS365
  if (sources.some(s => s === 'MS365')) {
    return 'MS365'
  }

  return 'Local'
}

/**
 * Find the file result that a warning belongs to
 */
function findFileForWarning(
  fileResults: FileIngestionResult[],
  warning: IngestionWarning
): FileIngestionResult | undefined {
  // First try exact filename match
  const exactMatch = fileResults.find(r => r.fileName === warning.fileName)
  if (exactMatch) {
    return exactMatch
  }

  // Return first result as fallback
  return fileResults[0]
}

// ============================================================================
// SCAN-ONLY CONVENIENCE FUNCTION
// ============================================================================

/**
 * Scan files without parsing or applying to store.
 * Useful for preview/validation before commit.
 */
export async function scanFilesOnly(
  files: File[],
  fileSources?: Record<string, 'Local' | 'MS365'>
): Promise<IngestionRunResult> {
  const result = await ingestFilesV2({
    files,
    fileSources,
    stage: 'SCAN_ONLY'
  })

  return result.runResult
}

/**
 * Scan and parse files without applying to store.
 * Useful for validation with entity counts before commit.
 */
export async function scanAndParseFiles(
  files: File[],
  fileSources?: Record<string, 'Local' | 'MS365'>
): Promise<IngestionRunResult> {
  const result = await ingestFilesV2({
    files,
    fileSources,
    stage: 'SCAN_AND_PARSE'
  })

  return result.runResult
}
