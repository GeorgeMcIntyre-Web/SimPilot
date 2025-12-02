/**
 * Tests for Ingestion Metrics
 * 
 * Validates:
 * - Metrics collection
 * - File metrics building
 * - Formatting utilities
 * - Statistics calculation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  MetricsCollector,
  FileMetricsBuilder,
  formatBytes,
  formatMs,
  formatIngestionMetrics,
  getMetricsSummary,
  getGlobalMetricsCollector,
  resetGlobalMetricsCollector,
  type FileIngestionMetrics
} from '../ingestionMetrics'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createFileMetrics(overrides: Partial<FileIngestionMetrics> = {}): FileIngestionMetrics {
  return {
    fileName: 'test.xlsx',
    fileSizeBytes: 1024,
    parseTimeMs: 100,
    profileTimeMs: 50,
    matchTimeMs: 25,
    totalTimeMs: 175,
    cached: false,
    sheetCount: 1,
    rowCount: 100,
    ...overrides
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('FileMetricsBuilder', () => {
  it('should build file metrics with stages', () => {
    const builder = new FileMetricsBuilder('test.xlsx')

    builder.setFileInfo(2048, 2, 500)
    builder.startStage('parse')
    // Simulate some work
    builder.endStage('parse')
    builder.setStageDuration('profile', 50)
    builder.setStageDuration('match', 25)

    const metrics = builder.build()

    expect(metrics.fileName).toBe('test.xlsx')
    expect(metrics.fileSizeBytes).toBe(2048)
    expect(metrics.sheetCount).toBe(2)
    expect(metrics.rowCount).toBe(500)
    expect(metrics.parseTimeMs).toBeGreaterThanOrEqual(0)
    expect(metrics.profileTimeMs).toBe(50)
    expect(metrics.matchTimeMs).toBe(25)
    expect(metrics.totalTimeMs).toBeGreaterThan(0)
  })

  it('should track cached status', () => {
    const builder = new FileMetricsBuilder('cached.xlsx')
    builder.setCached(true)

    const metrics = builder.build()

    expect(metrics.cached).toBe(true)
  })

  it('should handle missing stages', () => {
    const builder = new FileMetricsBuilder('minimal.xlsx')
    const metrics = builder.build()

    expect(metrics.parseTimeMs).toBe(0)
    expect(metrics.profileTimeMs).toBe(0)
    expect(metrics.matchTimeMs).toBe(0)
  })

  it('should chain methods', () => {
    const metrics = new FileMetricsBuilder('chain.xlsx')
      .setFileInfo(1024, 1, 50)
      .setCached(false)
      .setStageDuration('parse', 100)
      .build()

    expect(metrics.fileName).toBe('chain.xlsx')
    expect(metrics.fileSizeBytes).toBe(1024)
    expect(metrics.parseTimeMs).toBe(100)
  })
})

describe('MetricsCollector', () => {
  let collector: MetricsCollector

  beforeEach(() => {
    collector = new MetricsCollector()
  })

  it('should aggregate file metrics', () => {
    collector.recordFileMetrics(createFileMetrics({ fileName: 'file1.xlsx', fileSizeBytes: 1000 }))
    collector.recordFileMetrics(createFileMetrics({ fileName: 'file2.xlsx', fileSizeBytes: 2000 }))

    const metrics = collector.getMetrics()

    expect(metrics.fileCount).toBe(2)
    expect(metrics.totalBytes).toBe(3000)
    expect(metrics.files).toHaveLength(2)
  })

  it('should aggregate stage times', () => {
    collector.recordFileMetrics(createFileMetrics({
      parseTimeMs: 100,
      profileTimeMs: 50,
      matchTimeMs: 25
    }))
    collector.recordFileMetrics(createFileMetrics({
      parseTimeMs: 150,
      profileTimeMs: 75,
      matchTimeMs: 30
    }))

    const metrics = collector.getMetrics()

    expect(metrics.parseTimeMs).toBe(250)
    expect(metrics.profileTimeMs).toBe(125)
    expect(metrics.matchTimeMs).toBe(55)
  })

  it('should track cache hits and misses', () => {
    collector.recordFileMetrics(createFileMetrics({ cached: true }))
    collector.recordFileMetrics(createFileMetrics({ cached: false }))
    collector.recordFileMetrics(createFileMetrics({ cached: true }))

    const metrics = collector.getMetrics()

    expect(metrics.cacheHits).toBe(2)
    expect(metrics.cacheMisses).toBe(1)
  })

  it('should track parallelization', () => {
    collector.setParallelization(4, 3)

    const metrics = collector.getMetrics()

    expect(metrics.parallelization.concurrencyLimit).toBe(4)
    expect(metrics.parallelization.actualConcurrency).toBe(3)
  })

  it('should calculate speedup', () => {
    collector.setParallelization(4, 4)
    collector.recordFileMetrics(createFileMetrics({ totalTimeMs: 100 }))
    collector.recordFileMetrics(createFileMetrics({ totalTimeMs: 100 }))
    collector.recordFileMetrics(createFileMetrics({ totalTimeMs: 100 }))
    collector.recordFileMetrics(createFileMetrics({ totalTimeMs: 100 }))

    const metrics = collector.getMetrics()

    // Total CPU time is 400ms
    expect(metrics.parallelization.totalCpuTimeMs).toBe(400)
    // Speedup should be calculated based on wall clock vs CPU time
    expect(metrics.parallelization.speedup).toBeGreaterThan(0)
  })

  it('should reset state', () => {
    collector.recordFileMetrics(createFileMetrics())
    collector.setParallelization(4, 2)

    collector.reset()

    const metrics = collector.getMetrics()

    expect(metrics.fileCount).toBe(0)
    expect(metrics.totalBytes).toBe(0)
    expect(metrics.cacheHits).toBe(0)
    expect(metrics.cacheMisses).toBe(0)
  })
})

describe('formatBytes', () => {
  it('should format bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1.00 KB')
    expect(formatBytes(1536)).toBe('1.50 KB')
    expect(formatBytes(1048576)).toBe('1.00 MB')
    expect(formatBytes(1073741824)).toBe('1.00 GB')
  })
})

describe('formatMs', () => {
  it('should format microseconds', () => {
    expect(formatMs(0.5)).toBe('500μs')
    expect(formatMs(0.001)).toBe('1μs')
  })

  it('should format milliseconds', () => {
    expect(formatMs(1)).toBe('1.0ms')
    expect(formatMs(100)).toBe('100.0ms')
    expect(formatMs(999)).toBe('999.0ms')
  })

  it('should format seconds', () => {
    expect(formatMs(1000)).toBe('1.00s')
    expect(formatMs(1500)).toBe('1.50s')
    expect(formatMs(60000)).toBe('60.00s')
  })
})

describe('formatIngestionMetrics', () => {
  it('should format metrics as string', () => {
    const collector = new MetricsCollector()
    collector.recordFileMetrics(createFileMetrics({ fileName: 'test.xlsx' }))
    collector.setParallelization(3, 1)

    const metrics = collector.getMetrics()
    const formatted = formatIngestionMetrics(metrics)

    expect(formatted).toContain('Ingestion Performance Metrics')
    expect(formatted).toContain('Files: 1')
    expect(formatted).toContain('Parse:')
    expect(formatted).toContain('Concurrency:')
    expect(formatted).toContain('test.xlsx')
  })

  it('should show cache hit rate', () => {
    const collector = new MetricsCollector()
    collector.recordFileMetrics(createFileMetrics({ cached: true }))
    collector.recordFileMetrics(createFileMetrics({ cached: false }))

    const formatted = formatIngestionMetrics(collector.getMetrics())

    expect(formatted).toContain('Cache Hits: 1 / 2 (50.0%)')
  })
})

describe('getMetricsSummary', () => {
  it('should return numeric summary', () => {
    const collector = new MetricsCollector()
    collector.recordFileMetrics(createFileMetrics({
      fileSizeBytes: 1024,
      parseTimeMs: 100,
      profileTimeMs: 50,
      matchTimeMs: 25,
      totalTimeMs: 175,
      cached: true
    }))

    const summary = getMetricsSummary(collector.getMetrics())

    expect(summary.fileCount).toBe(1)
    expect(summary.totalBytes).toBe(1024)
    expect(summary.parseTimeMs).toBe(100)
    expect(summary.profileTimeMs).toBe(50)
    expect(summary.matchTimeMs).toBe(25)
    expect(summary.cacheHits).toBe(1)
    expect(summary.cacheMisses).toBe(0)
  })
})

describe('global collector', () => {
  beforeEach(() => {
    resetGlobalMetricsCollector()
  })

  it('should return same instance', () => {
    const c1 = getGlobalMetricsCollector()
    const c2 = getGlobalMetricsCollector()

    expect(c1).toBe(c2)
  })

  it('should reset global collector', () => {
    const c1 = getGlobalMetricsCollector()
    c1.recordFileMetrics(createFileMetrics())

    resetGlobalMetricsCollector()

    const c2 = getGlobalMetricsCollector()
    expect(c2.getMetrics().fileCount).toBe(0)
  })
})
