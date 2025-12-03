/**
 * Parallel Ingestion Coordinator
 * 
 * Orchestrates the performance-optimized ingestion pipeline:
 * - Caches parsed workbooks to avoid reparsing
 * - Processes multiple files in parallel with concurrency limits
 * - Collects detailed performance metrics
 * - Supports both main-thread and worker-based parsing
 * 
 * Part of the Performance Engine for SimPilot's Excel ingestion.
 */

import type { NormalizedWorkbook } from '../workbookLoader'
import {
  // Caching
  type WorkbookCacheConfig,
  DEFAULT_CACHE_CONFIG,
  computeFileHash,
  getGlobalWorkbookCache,
  
  // Concurrency
  type ConcurrencyConfig,
  DEFAULT_CONCURRENCY_CONFIG,
  runWithConcurrencyLimitSettled,
  
  // Parsing
  type WorkbookParser,
  type WorkbookParserConfig,
  DEFAULT_PARSER_CONFIG,
  createWorkbookParser,
  type ParseResult,
  
  // Metrics
  type IngestionMetrics,
  type FileIngestionMetrics,
  MetricsCollector,
  FileMetricsBuilder
} from './index'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for parallel ingestion.
 */
export type ParallelIngestionConfig = {
  /** Caching configuration */
  cache: WorkbookCacheConfig
  /** Concurrency configuration */
  concurrency: ConcurrencyConfig
  /** Parser configuration */
  parser: WorkbookParserConfig
  /** Callback for progress updates */
  onProgress?: (progress: IngestionProgress) => void
}

/**
 * Progress update during ingestion.
 */
export type IngestionProgress = {
  totalFiles: number
  completedFiles: number
  currentFile: string | null
  percentComplete: number
}

/**
 * Result of parallel ingestion for a single file.
 */
export type FileIngestionResult = {
  fileName: string
  workbook: NormalizedWorkbook | null
  error: Error | null
  metrics: FileIngestionMetrics
}

/**
 * Result of parallel ingestion for all files.
 */
export type ParallelIngestionResult = {
  files: FileIngestionResult[]
  metrics: IngestionMetrics
  successCount: number
  errorCount: number
}

/**
 * Default configuration.
 */
export const DEFAULT_PARALLEL_INGESTION_CONFIG: ParallelIngestionConfig = {
  cache: DEFAULT_CACHE_CONFIG,
  concurrency: DEFAULT_CONCURRENCY_CONFIG,
  parser: DEFAULT_PARSER_CONFIG
}

// ============================================================================
// PARALLEL INGESTION
// ============================================================================

/**
 * Ingest multiple files in parallel with performance optimizations.
 * 
 * @param files - Array of files to ingest
 * @param config - Configuration options
 * @returns Ingestion results with metrics
 */
export async function ingestFilesInParallel(
  files: File[],
  config: Partial<ParallelIngestionConfig> = {}
): Promise<ParallelIngestionResult> {
  const fullConfig = { ...DEFAULT_PARALLEL_INGESTION_CONFIG, ...config }
  const metricsCollector = new MetricsCollector()

  // Guard: no files
  if (files.length === 0) {
    return {
      files: [],
      metrics: metricsCollector.getMetrics(),
      successCount: 0,
      errorCount: 0
    }
  }

  // Set parallelization config
  const concurrencyLimit = fullConfig.concurrency.limit
  const actualConcurrency = Math.min(concurrencyLimit, files.length)
  metricsCollector.setParallelization(concurrencyLimit, actualConcurrency)

  // Create parser
  const parser = createWorkbookParser(fullConfig.parser)

  // Build tasks for each file
  let completedCount = 0
  const tasks = files.map((file) => async (): Promise<FileIngestionResult> => {
    // Report progress
    if (fullConfig.onProgress) {
      fullConfig.onProgress({
        totalFiles: files.length,
        completedFiles: completedCount,
        currentFile: file.name,
        percentComplete: (completedCount / files.length) * 100
      })
    }

    // Parse file
    const result = await parseFileWithMetrics(file, parser, fullConfig)
    
    // Update progress
    completedCount++
    if (fullConfig.onProgress) {
      fullConfig.onProgress({
        totalFiles: files.length,
        completedFiles: completedCount,
        currentFile: null,
        percentComplete: (completedCount / files.length) * 100
      })
    }

    // Record metrics
    metricsCollector.recordFileMetrics(result.metrics)

    return result
  })

  // Run tasks with concurrency limit
  const settledResults = await runWithConcurrencyLimitSettled(
    fullConfig.concurrency.limit,
    tasks
  )

  // Collect results
  const fileResults: FileIngestionResult[] = []
  let successCount = 0
  let errorCount = 0

  for (const settled of settledResults) {
    if (settled.status === 'fulfilled') {
      fileResults.push(settled.value)
      if (settled.value.error === null) {
        successCount++
      } else {
        errorCount++
      }
    } else {
      // Task itself failed (shouldn't happen with our error handling)
      const fileName = files[settled.index]?.name ?? 'unknown'
      errorCount++
      fileResults.push({
        fileName,
        workbook: null,
        error: settled.reason,
        metrics: {
          fileName,
          fileSizeBytes: 0,
          parseTimeMs: 0,
          profileTimeMs: 0,
          matchTimeMs: 0,
          totalTimeMs: 0,
          cached: false,
          sheetCount: 0,
          rowCount: 0
        }
      })
    }
  }

  return {
    files: fileResults,
    metrics: metricsCollector.getMetrics(),
    successCount,
    errorCount
  }
}

/**
 * Parse a single file and collect metrics.
 */
async function parseFileWithMetrics(
  file: File,
  parser: WorkbookParser,
  _config: ParallelIngestionConfig
): Promise<FileIngestionResult> {
  const metricsBuilder = new FileMetricsBuilder(file.name)
  let workbook: NormalizedWorkbook | null = null
  let error: Error | null = null

  try {
    // Parse the file
    metricsBuilder.startStage('parse')
    const parseResult = await parser.parse(file)
    metricsBuilder.endStage('parse')

    workbook = parseResult.workbook
    metricsBuilder.setCached(parseResult.cached)

    // Calculate row count
    let rowCount = 0
    for (const sheet of workbook.sheets) {
      rowCount += sheet.rows.length
    }

    metricsBuilder.setFileInfo(
      parseResult.fileSizeBytes,
      workbook.sheets.length,
      rowCount
    )

    // Note: profile and match stages would be added when processing sheets
    // For now, set them to 0 as they happen in the coordinator layer
    metricsBuilder.setStageDuration('profile', 0)
    metricsBuilder.setStageDuration('match', 0)

  } catch (e) {
    error = e instanceof Error ? e : new Error(String(e))
    metricsBuilder.setFileInfo(file.size, 0, 0)
  }

  return {
    fileName: file.name,
    workbook,
    error,
    metrics: metricsBuilder.build()
  }
}

// ============================================================================
// CACHED WORKBOOK LOADING
// ============================================================================

/**
 * Load a workbook with caching support.
 * 
 * This is a simpler interface for single-file loading with caching.
 * 
 * @param file - File to load
 * @param config - Cache configuration
 * @returns Parse result with caching information
 */
export async function loadWorkbookCached(
  file: File,
  config: Partial<WorkbookCacheConfig> = {}
): Promise<ParseResult> {
  const fullConfig = { ...DEFAULT_CACHE_CONFIG, ...config }
  
  // Compute hash
  const hash = await computeFileHash(file)

  // Check cache
  if (fullConfig.enabled && !fullConfig.forceReparse) {
    const cache = getGlobalWorkbookCache()
    const cached = cache.getByHash(hash)

    if (cached !== undefined) {
      return {
        workbook: cached.rawWorkbook,
        cached: true,
        parseTimeMs: 0,
        fileSizeBytes: cached.fileSizeBytes,
        hash
      }
    }
  }

  // Parse
  const parser = createWorkbookParser({ cache: fullConfig })
  return parser.parse(file)
}

// ============================================================================
// BATCH PARSING UTILITIES
// ============================================================================

/**
 * Parse multiple files and return only successful results.
 * Errors are logged but don't stop processing.
 */
export async function parseFilesSuccessful(
  files: File[],
  config: Partial<ParallelIngestionConfig> = {}
): Promise<NormalizedWorkbook[]> {
  const result = await ingestFilesInParallel(files, config)

  const workbooks: NormalizedWorkbook[] = []
  
  for (const file of result.files) {
    if (file.workbook === null) {
      continue
    }
    workbooks.push(file.workbook)
  }

  return workbooks
}

/**
 * Parse files with callback for each completed file.
 * Useful for streaming results to UI.
 */
export async function parseFilesWithCallback(
  files: File[],
  onFileComplete: (result: FileIngestionResult, index: number) => void,
  config: Partial<ParallelIngestionConfig> = {}
): Promise<ParallelIngestionResult> {
  const fullConfig = { ...DEFAULT_PARALLEL_INGESTION_CONFIG, ...config }
  const metricsCollector = new MetricsCollector()
  const parser = createWorkbookParser(fullConfig.parser)

  // Guard: no files
  if (files.length === 0) {
    return {
      files: [],
      metrics: metricsCollector.getMetrics(),
      successCount: 0,
      errorCount: 0
    }
  }

  metricsCollector.setParallelization(
    fullConfig.concurrency.limit,
    Math.min(fullConfig.concurrency.limit, files.length)
  )

  // Build tasks that call the callback
  const fileResults: FileIngestionResult[] = new Array(files.length)
  let successCount = 0
  let errorCount = 0

  const tasks = files.map((file, index) => async () => {
    const result = await parseFileWithMetrics(file, parser, fullConfig)
    
    fileResults[index] = result
    metricsCollector.recordFileMetrics(result.metrics)
    
    if (result.error === null) {
      successCount++
    } else {
      errorCount++
    }

    // Invoke callback
    onFileComplete(result, index)

    return result
  })

  // Run with concurrency
  await runWithConcurrencyLimitSettled(fullConfig.concurrency.limit, tasks)

  return {
    files: fileResults,
    metrics: metricsCollector.getMetrics(),
    successCount,
    errorCount
  }
}

// ============================================================================
// PRELOADING
// ============================================================================

/**
 * Preload files into cache without returning results.
 * Useful for background loading before user interaction.
 */
export async function preloadFilesToCache(
  files: File[],
  config: Partial<ParallelIngestionConfig> = {}
): Promise<{ loaded: number; errors: number; metrics: IngestionMetrics }> {
  const result = await ingestFilesInParallel(files, {
    ...config,
    cache: { ...DEFAULT_CACHE_CONFIG, ...config.cache, enabled: true }
  })

  return {
    loaded: result.successCount,
    errors: result.errorCount,
    metrics: result.metrics
  }
}

