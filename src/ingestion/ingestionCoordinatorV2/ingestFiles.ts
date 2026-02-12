// Ingestion Coordinator V2 - Main Ingestion API
// Enhanced ingestion entry point with full telemetry support

import { coreStore } from '../../domain/coreStore'
import { applyIngestedData, type IngestedData } from '../applyIngestedData'
import type { ImportRun } from '../../domain/uidTypes'
import { FileIngestionResult, IngestionRunResult, generateRunId } from '../ingestionTelemetry'
import { buildSemanticArtifactBundle } from '../semanticLayer'
import type { IngestFilesInputV2, IngestFilesResultV2 } from './types'
import { telemetryToLegacyWarning, legacyToTelemetryWarning } from './warningConverters'
import {
  buildDiffResultFromVersionComparison,
  deriveSourceType,
  buildVersionComparison,
} from './diffBuilder'
import { processFileWithTelemetry } from './fileProcessor'
import { determineDataSource, findFileForWarning } from './helpers'

/**
 * Enhanced ingestion entry point with full telemetry support.
 *
 * Supports three stages:
 * - SCAN_ONLY: Just scan files and return telemetry (no parsing)
 * - SCAN_AND_PARSE: Scan and parse, but don't apply to store
 * - APPLY_TO_STORE: Full ingestion with store update
 */
export async function ingestFilesV2(input: IngestFilesInputV2): Promise<IngestFilesResultV2> {
  const startTime = Date.now()
  const runId = generateRunId()
  const stage = input.stage ?? 'APPLY_TO_STORE'
  const fileResults: FileIngestionResult[] = []

  // Track data for later application
  const ingestedData: IngestedData = {
    ingestionRunId: runId,
    simulation: undefined,
    robots: undefined,
    tools: undefined,
  }

  // Process each file
  for (const file of input.files) {
    const fileStartTime = Date.now()
    const source = input.fileSources?.[file.name] ?? 'Local'

    const result = await processFileWithTelemetry(file, source, stage, ingestedData)

    result.processingTimeMs = Date.now() - fileStartTime
    fileResults.push(result)
  }

  // Aggregate counts
  let aggregateCounts = {
    projects: 0,
    areas: 0,
    cells: 0,
    robots: 0,
    tools: 0,
  }

  let diffResult = undefined
  let semanticArtifact = buildSemanticArtifactBundle(runId, ingestedData.semanticLayers)

  // Only apply to store if we're in that stage
  if (stage === 'APPLY_TO_STORE') {
    const applyResult = applyIngestedData(ingestedData)
    semanticArtifact = applyResult.semanticArtifact
    const versionComparison = buildVersionComparison(applyResult)

    // Update core store
    const source = determineDataSource(input.fileSources)
    const allWarnings = fileResults.flatMap((r) => r.warnings)
    const warningStrings = allWarnings.map((w) => w.message)

    coreStore.setData(
      {
        projects: applyResult.projects,
        areas: applyResult.areas,
        cells: applyResult.cells,
        robots: applyResult.robots,
        tools: applyResult.tools,
        warnings: warningStrings,
      },
      source,
    )

    // Create DiffResult from version comparison (minimal but real data)
    const sourceFileName = input.files[0]?.name || 'unknown'
    const sourceType = deriveSourceType(fileResults)
    diffResult = buildDiffResultFromVersionComparison(
      runId,
      sourceFileName,
      sourceType,
      versionComparison,
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
        ambiguous: diffResult.summary.ambiguous,
      },
    }
    coreStore.addImportRun(importRun)

    // Get counts from store
    const state = coreStore.getState()
    aggregateCounts = {
      projects: state.projects.length,
      areas: state.areas.length,
      cells: state.cells.length,
      robots: state.assets.filter((a) => a.kind === 'ROBOT').length,
      tools: state.assets.filter((a) => a.kind !== 'ROBOT').length,
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
    aggregateWarnings: fileResults.flatMap((r) => r.warnings),
    successCount,
    failureCount,
    partialCount,
  }

  // Convert telemetry warnings to legacy warnings for backward compat
  const legacyWarnings = runResult.aggregateWarnings.map(telemetryToLegacyWarning)

  return {
    ingestionRunId: runId,
    runResult,
    projectsCount: aggregateCounts.projects,
    areasCount: aggregateCounts.areas,
    cellsCount: aggregateCounts.cells,
    robotsCount: aggregateCounts.robots,
    toolsCount: aggregateCounts.tools,
    warnings: legacyWarnings,
    semanticArtifact,
    diffResult,
  }
}

/**
 * Scan files without parsing or applying to store.
 * Useful for preview/validation before commit.
 */
export async function scanFilesOnly(
  files: File[],
  fileSources?: Record<string, 'Local' | 'MS365'>,
): Promise<IngestionRunResult> {
  const result = await ingestFilesV2({
    files,
    fileSources,
    stage: 'SCAN_ONLY',
  })

  return result.runResult
}

/**
 * Scan and parse files without applying to store.
 * Useful for validation with entity counts before commit.
 */
export async function scanAndParseFiles(
  files: File[],
  fileSources?: Record<string, 'Local' | 'MS365'>,
): Promise<IngestionRunResult> {
  const result = await ingestFilesV2({
    files,
    fileSources,
    stage: 'SCAN_AND_PARSE',
  })

  return result.runResult
}
