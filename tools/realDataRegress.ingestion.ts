import { log } from './nodeLog'
import { loadFile, ingestFilesOrdered, type HeadlessFile } from './headlessIngestion'
import { ingestFilesWithUid } from './uidAwareIngestion'
import type { FileKind } from '../src/ingestion/sheetSniffer'
import type { DatasetConfig, DatasetResult, FileIngestionResult, IngestionOptions } from './realDataRegress.types'
import { categorizeFiles, walkDirectory } from './realDataRegress.categorize'

function summarize(datasetName: string, startTime: number, fileResults: FileIngestionResult[]): DatasetResult {
  const endTime = Date.now()

  return {
    datasetName,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration: endTime - startTime,
    files: fileResults,
    summary: {
      totalFiles: fileResults.length,
      successfulFiles: fileResults.filter(f => f.success).length,
      failedFiles: fileResults.filter(f => !f.success).length,
      totalRows: fileResults.reduce((sum, f) => sum + f.rowsParsed, 0),
      simulationStatusRows: fileResults.reduce((sum, f) => sum + (f.categoryMetrics?.simulationStatusRowsParsed || 0), 0),
      toolListRows: fileResults.reduce((sum, f) => sum + (f.categoryMetrics?.toolListRowsParsed || 0), 0),
      robotListRows: fileResults.reduce((sum, f) => sum + (f.categoryMetrics?.robotListRowsParsed || 0), 0),
      assembliesRows: fileResults.reduce((sum, f) => sum + (f.categoryMetrics?.assembliesRowsParsed || 0), 0),
      totalCreates: fileResults.reduce((sum, f) => sum + f.creates, 0),
      totalUpdates: fileResults.reduce((sum, f) => sum + f.updates, 0),
      totalDeletes: fileResults.reduce((sum, f) => sum + f.deletes, 0),
      totalRenames: fileResults.reduce((sum, f) => sum + f.renames, 0),
      totalAmbiguous: fileResults.reduce((sum, f) => sum + f.ambiguous, 0),
      totalKeyErrors: fileResults.reduce((sum, f) => sum + f.keyDerivationErrors, 0),
      totalUnresolvedLinks: fileResults.reduce((sum, f) => sum + f.unresolvedLinks, 0)
    }
  }
}

function toLegacyResult(result: any): FileIngestionResult {
  const rowsParsed = result.applyResult
    ? result.applyResult.projects.length +
      result.applyResult.areas.length +
      result.applyResult.cells.length +
      result.applyResult.tools.length +
      result.applyResult.robots.length
    : 0

  const keysGenerated = result.applyResult
    ? result.applyResult.cells.length + result.applyResult.tools.length + result.applyResult.robots.length
    : 0

  const keyErrors = result.warnings.filter((w: string) =>
    w.includes('MISSING_COLUMNS') ||
    w.includes('key') ||
    w.includes('derive') ||
    w.includes('invalid')
  ).length

  const unresolvedLinks = result.warnings.filter((w: string) =>
    w.includes('link') ||
    w.includes('reference') ||
    w.includes('not found')
  ).length

  return {
    fileName: result.fileName,
    filePath: result.filePath,
    sourceType: result.detectedType,
    detectedSheet: result.detectedSheet,
    detectionScore: result.detectionScore,
    sheetDiagnostics: result.sheetDiagnostics,
    success: result.success,
    error: result.error,
    rowsParsed,
    keysGenerated,
    keyDerivationErrors: keyErrors,
    creates: 0,
    updates: 0,
    deletes: 0,
    renames: 0,
    ambiguous: 0,
    unresolvedLinks,
    warnings: result.warnings
  }
}

function toUidResult(result: any): FileIngestionResult {
  const totalRowsParsed =
    result.simulationStatusRowsParsed +
    result.toolListRowsParsed +
    result.robotListRowsParsed +
    result.assembliesRowsParsed

  const keysGenerated = result.stationRecords.length + result.toolRecords.length + result.robotRecords.length

  return {
    fileName: result.fileName,
    filePath: result.filePath,
    sourceType: 'Unknown' as FileKind,
    detectedSheet: null,
    detectionScore: 0,
    success: result.success,
    error: result.error,
    rowsParsed: totalRowsParsed,
    keysGenerated,
    keyDerivationErrors: 0,
    creates: result.diff?.creates.length || 0,
    updates: result.diff?.updates.length || 0,
    deletes: result.diff?.deletes.length || 0,
    renames: result.diff?.renamesOrMoves.length || 0,
    ambiguous: result.diff?.ambiguous.length || 0,
    unresolvedLinks: 0,
    warnings: result.warnings,
    diff: result.diff,
    categoryMetrics: {
      simulationStatusRowsParsed: result.simulationStatusRowsParsed,
      toolListRowsParsed: result.toolListRowsParsed,
      robotListRowsParsed: result.robotListRowsParsed,
      assembliesRowsParsed: result.assembliesRowsParsed,
      totalRowsParsed,
      mutationsApplied: result.mutationsApplied || 0
    }
  }
}

async function ingestWithUid(files: HeadlessFile[], options: IngestionOptions): Promise<FileIngestionResult[]> {
  const uidResult = await ingestFilesWithUid(files, {
    plantKey: 'PLANT_TEST',
    mutateNames: options.mutateNames || false,
    mutateAmbiguity: options.mutateAmbiguity || false,
    seed: options.seed || 1,
    ambiguityTarget: options.ambiguityTarget || 5
  })

  if (options.mutateNames) {
    const totalMutations = uidResult.summary.totalMutations || 0
    log.info(`[Dataset] Applied ${totalMutations} identifier mutations`)
  }

  return uidResult.results.map(toUidResult)
}

async function ingestLegacy(files: HeadlessFile[]): Promise<FileIngestionResult[]> {
  const ingestionResult = await ingestFilesOrdered(files)
  return ingestionResult.results.map(toLegacyResult)
}

export async function runDataset(dataset: DatasetConfig, options: IngestionOptions): Promise<DatasetResult> {
  log.info(`[Dataset] Processing: ${dataset.name}`)
  log.info(`[Dataset] Root: ${dataset.rootPath}`)

  const startTime = Date.now()

  log.info(`[Dataset] Discovering Excel files...`)
  const files = walkDirectory(dataset.rootPath)
  log.info(`[Dataset] Found ${files.length} Excel files`)

  log.info(`[Dataset] Categorizing files...`)
  const categorized = categorizeFiles(files)

  const simFiles = categorized.filter(f => f.sourceType === 'SimulationStatus')
  const robotFiles = categorized.filter(f => f.sourceType === 'RobotList')
  const toolFiles = categorized.filter(f => f.sourceType === 'ToolList')
  const assemblyFiles = categorized.filter(f => f.sourceType === 'AssembliesList')
  const unknownFiles = categorized.filter(f => f.sourceType === 'Unknown')

  log.info(`[Dataset] Categorization results:`)
  log.info(`  - Simulation Status: ${simFiles.length}`)
  log.info(`  - Robot List: ${robotFiles.length}`)
  log.info(`  - Tool List: ${toolFiles.length}`)
  log.info(`  - Assemblies List: ${assemblyFiles.length}`)
  log.info(`  - Unknown: ${unknownFiles.length}`)

  log.info(`[Dataset] Loading files into memory...`)
  const headlessFiles: HeadlessFile[] = []
  for (const cat of categorized) {
    try {
      const headlessFile = loadFile(cat.filePath)
      headlessFiles.push(headlessFile)
    } catch (err) {
      log.warn(`[Dataset] Failed to load ${cat.fileName}: ${err}`)
    }
  }

  log.info(`[Dataset] Running ingestion on ${headlessFiles.length} files...`)

  const fileResults = options.useUid
    ? await ingestWithUid(headlessFiles, options)
    : await ingestLegacy(headlessFiles)

  log.info(`[Dataset] Ingestion complete:`)
  log.info(`  - Total rows parsed: ${fileResults.reduce((sum, f) => sum + f.rowsParsed, 0)}`)
  log.info(`  - Total keys generated: ${fileResults.reduce((sum, f) => sum + f.keysGenerated, 0)}`)
  log.info(`  - Total key errors: ${fileResults.reduce((sum, f) => sum + f.keyDerivationErrors, 0)}`)
  log.info(`  - Total unresolved links: ${fileResults.reduce((sum, f) => sum + f.unresolvedLinks, 0)}`)

  return summarize(dataset.name, startTime, fileResults)
}
