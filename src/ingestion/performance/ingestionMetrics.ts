/**
 * Ingestion Metrics
 * 
 * Provides minimal visibility into ingestion performance with:
 * - File-level timing metrics
 * - Stage-based performance tracking
 * - Aggregated run statistics
 * 
 * Part of the Performance Engine for Excel ingestion.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Metrics for a single file's ingestion.
 */
export type FileIngestionMetrics = {
  fileName: string
  fileSizeBytes: number
  parseTimeMs: number
  profileTimeMs: number
  matchTimeMs: number
  totalTimeMs: number
  cached: boolean
  sheetCount: number
  rowCount: number
}

/**
 * Aggregated metrics for an ingestion run.
 */
export type IngestionMetrics = {
  fileCount: number
  totalBytes: number
  parseTimeMs: number
  profileTimeMs: number
  matchTimeMs: number
  totalTimeMs: number
  cacheHits: number
  cacheMisses: number
  parallelization: ParallelizationMetrics
  files: FileIngestionMetrics[]
}

/**
 * Metrics for parallel processing.
 */
export type ParallelizationMetrics = {
  concurrencyLimit: number
  actualConcurrency: number
  wallClockTimeMs: number
  totalCpuTimeMs: number
  speedup: number
}

/**
 * Performance stage markers.
 */
export type PerformanceStage = 
  | 'parse'       // Reading and parsing Excel file
  | 'profile'     // Analyzing sheet structure / header detection
  | 'match'       // Matching columns to fields
  | 'transform'   // Converting rows to domain objects

/**
 * Timer for tracking stage durations.
 */
export type StageTimer = {
  stage: PerformanceStage
  startTime: number
  endTime: number | null
  durationMs: number | null
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

/**
 * Collector for ingestion metrics.
 * Tracks timing across multiple files and stages.
 */
export class MetricsCollector {
  private startTime: number
  private fileMetrics: FileIngestionMetrics[] = []
  private stageTimes: Map<PerformanceStage, number> = new Map()
  private cacheHits = 0
  private cacheMisses = 0
  private totalBytes = 0
  private concurrencyLimit = 1
  private actualConcurrency = 1

  constructor() {
    this.startTime = performance.now()
  }

  /**
   * Record metrics for a single file.
   */
  recordFileMetrics(metrics: FileIngestionMetrics): void {
    this.fileMetrics.push(metrics)
    this.totalBytes += metrics.fileSizeBytes

    if (metrics.cached) {
      this.cacheHits++
    } else {
      this.cacheMisses++
    }

    // Aggregate stage times
    this.addStageTime('parse', metrics.parseTimeMs)
    this.addStageTime('profile', metrics.profileTimeMs)
    this.addStageTime('match', metrics.matchTimeMs)
  }

  /**
   * Set parallelization configuration.
   */
  setParallelization(concurrencyLimit: number, actualConcurrency: number): void {
    this.concurrencyLimit = concurrencyLimit
    this.actualConcurrency = actualConcurrency
  }

  /**
   * Get aggregated metrics.
   */
  getMetrics(): IngestionMetrics {
    const now = performance.now()
    const wallClockTimeMs = now - this.startTime
    const totalCpuTimeMs = this.fileMetrics.reduce((sum, m) => sum + m.totalTimeMs, 0)
    const speedup = wallClockTimeMs > 0 ? totalCpuTimeMs / wallClockTimeMs : 1

    return {
      fileCount: this.fileMetrics.length,
      totalBytes: this.totalBytes,
      parseTimeMs: this.stageTimes.get('parse') ?? 0,
      profileTimeMs: this.stageTimes.get('profile') ?? 0,
      matchTimeMs: this.stageTimes.get('match') ?? 0,
      totalTimeMs: wallClockTimeMs,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      parallelization: {
        concurrencyLimit: this.concurrencyLimit,
        actualConcurrency: this.actualConcurrency,
        wallClockTimeMs,
        totalCpuTimeMs,
        speedup
      },
      files: [...this.fileMetrics]
    }
  }

  /**
   * Reset the collector.
   */
  reset(): void {
    this.startTime = performance.now()
    this.fileMetrics = []
    this.stageTimes.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
    this.totalBytes = 0
    this.concurrencyLimit = 1
    this.actualConcurrency = 1
  }

  private addStageTime(stage: PerformanceStage, timeMs: number): void {
    const current = this.stageTimes.get(stage) ?? 0
    this.stageTimes.set(stage, current + timeMs)
  }
}

// ============================================================================
// FILE METRICS BUILDER
// ============================================================================

/**
 * Builder for constructing file metrics incrementally.
 */
export class FileMetricsBuilder {
  private fileName: string
  private fileSizeBytes = 0
  private sheetCount = 0
  private rowCount = 0
  private cached = false
  private stages: Map<PerformanceStage, StageTimer> = new Map()
  private overallStartTime: number

  constructor(fileName: string) {
    this.fileName = fileName
    this.overallStartTime = performance.now()
  }

  /**
   * Set file information.
   */
  setFileInfo(sizeBytes: number, sheetCount: number, rowCount: number): this {
    this.fileSizeBytes = sizeBytes
    this.sheetCount = sheetCount
    this.rowCount = rowCount
    return this
  }

  /**
   * Mark file as cached (skipped parsing).
   */
  setCached(cached: boolean): this {
    this.cached = cached
    return this
  }

  /**
   * Start timing a stage.
   */
  startStage(stage: PerformanceStage): this {
    this.stages.set(stage, {
      stage,
      startTime: performance.now(),
      endTime: null,
      durationMs: null
    })
    return this
  }

  /**
   * End timing a stage.
   */
  endStage(stage: PerformanceStage): this {
    const timer = this.stages.get(stage)
    
    if (timer === undefined) {
      return this
    }

    timer.endTime = performance.now()
    timer.durationMs = timer.endTime - timer.startTime
    return this
  }

  /**
   * Set a stage duration directly (when not using start/end).
   */
  setStageDuration(stage: PerformanceStage, durationMs: number): this {
    this.stages.set(stage, {
      stage,
      startTime: 0,
      endTime: durationMs,
      durationMs
    })
    return this
  }

  /**
   * Build the final metrics object.
   */
  build(): FileIngestionMetrics {
    const now = performance.now()
    const totalTimeMs = now - this.overallStartTime

    return {
      fileName: this.fileName,
      fileSizeBytes: this.fileSizeBytes,
      parseTimeMs: this.getStageDuration('parse'),
      profileTimeMs: this.getStageDuration('profile'),
      matchTimeMs: this.getStageDuration('match'),
      totalTimeMs,
      cached: this.cached,
      sheetCount: this.sheetCount,
      rowCount: this.rowCount
    }
  }

  private getStageDuration(stage: PerformanceStage): number {
    const timer = this.stages.get(stage)
    return timer?.durationMs ?? 0
  }
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Format bytes as human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  const base = 1024
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(base)),
    units.length - 1
  )

  const value = bytes / Math.pow(base, exponent)
  const unit = units[exponent]

  return `${value.toFixed(exponent > 0 ? 2 : 0)} ${unit}`
}

/**
 * Format milliseconds as human-readable string.
 */
export function formatMs(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}μs`
  }

  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`
  }

  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Format ingestion metrics for display.
 */
export function formatIngestionMetrics(metrics: IngestionMetrics): string {
  const lines: string[] = []

  lines.push('=== Ingestion Performance Metrics ===')
  lines.push('')

  // Summary
  lines.push(`Files: ${metrics.fileCount}`)
  lines.push(`Total Size: ${formatBytes(metrics.totalBytes)}`)
  lines.push(`Total Time: ${formatMs(metrics.totalTimeMs)}`)
  lines.push('')

  // Caching
  const cacheTotal = metrics.cacheHits + metrics.cacheMisses
  const hitRate = cacheTotal > 0 
    ? ((metrics.cacheHits / cacheTotal) * 100).toFixed(1) 
    : '0.0'
  lines.push(`Cache Hits: ${metrics.cacheHits} / ${cacheTotal} (${hitRate}%)`)
  lines.push('')

  // Stage breakdown
  lines.push('Stage Breakdown:')
  lines.push(`  Parse:   ${formatMs(metrics.parseTimeMs)}`)
  lines.push(`  Profile: ${formatMs(metrics.profileTimeMs)}`)
  lines.push(`  Match:   ${formatMs(metrics.matchTimeMs)}`)
  lines.push('')

  // Parallelization
  const p = metrics.parallelization
  lines.push('Parallelization:')
  lines.push(`  Concurrency: ${p.actualConcurrency} / ${p.concurrencyLimit}`)
  lines.push(`  Speedup: ${p.speedup.toFixed(2)}x`)
  lines.push('')

  // Per-file breakdown (top 5 slowest)
  if (metrics.files.length > 0) {
    const sorted = [...metrics.files].sort((a, b) => b.totalTimeMs - a.totalTimeMs)
    const top5 = sorted.slice(0, 5)

    lines.push('Slowest Files:')
    for (const file of top5) {
      const cachedTag = file.cached ? ' [cached]' : ''
      lines.push(`  ${file.fileName}: ${formatMs(file.totalTimeMs)}${cachedTag}`)
    }
  }

  return lines.join('\n')
}

/**
 * Get metrics summary as an object for telemetry.
 */
export function getMetricsSummary(metrics: IngestionMetrics): Record<string, number> {
  return {
    fileCount: metrics.fileCount,
    totalBytes: metrics.totalBytes,
    totalTimeMs: metrics.totalTimeMs,
    parseTimeMs: metrics.parseTimeMs,
    profileTimeMs: metrics.profileTimeMs,
    matchTimeMs: metrics.matchTimeMs,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
    speedup: metrics.parallelization.speedup
  }
}

// ============================================================================
// SINGLETON COLLECTOR
// ============================================================================

let globalCollector: MetricsCollector | null = null

/**
 * Get the global metrics collector.
 */
export function getGlobalMetricsCollector(): MetricsCollector {
  if (globalCollector === null) {
    globalCollector = new MetricsCollector()
  }
  return globalCollector
}

/**
 * Reset the global metrics collector.
 */
export function resetGlobalMetricsCollector(): void {
  if (globalCollector !== null) {
    globalCollector.reset()
  }
  globalCollector = null
}

/**
 * Create a new metrics collector (for isolated runs).
 */
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector()
}
