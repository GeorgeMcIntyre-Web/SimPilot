// Ingestion Coordinator V2 - File Processor
// Process individual files with telemetry

import { readWorkbook } from '../excelUtils'
import type { IngestedData } from '../applyIngestedData'
import {
  IngestionStage,
  FileIngestionResult,
  FileIngestionWarning,
  FileScanSummary,
  SheetSampleData,
  scanFileForTelemetry,
  extractSampleData,
  createTelemetryWarning,
  deriveIngestionStatus
} from '../ingestionTelemetry'
import { log } from '../../lib/log'
import { legacyToTelemetryWarning } from './warningConverters'
import { routeToParser, mergeParserResult } from './parserRouter'

/**
 * Process a single file with full telemetry
 */
export async function processFileWithTelemetry(
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
