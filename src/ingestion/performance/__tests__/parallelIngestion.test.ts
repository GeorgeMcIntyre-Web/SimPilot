/**
 * Tests for Parallel Ingestion
 * 
 * Validates:
 * - Multiple file parsing
 * - Caching behavior
 * - Concurrency control
 * - Progress reporting
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as XLSX from 'xlsx'
import {
  ingestFilesInParallel,
  loadWorkbookCached,
  parseFilesSuccessful,
  parseFilesWithCallback,
  preloadFilesToCache
} from '../parallelIngestion'
import { resetGlobalWorkbookCache, getGlobalWorkbookCache } from '../workbookCache'
import { resetGlobalParser } from '../workbookParser'

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a workbook with test data.
 */
function createTestWorkbook(sheetData: any[][], sheetName = 'Data'): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

/**
 * Create a File from a workbook.
 */
async function createTestFile(
  workbook: XLSX.WorkBook,
  fileName: string
): Promise<File> {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  return new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

/**
 * Counter to make each file unique
 */
let fileCounter = 0

/**
 * Create a simple test file with data.
 * Uses a counter to ensure each file has unique content for proper cache testing.
 */
async function createSimpleFile(name: string, data?: any[][]): Promise<File> {
  fileCounter++
  const uniqueData = data ?? [['A', 'B', 'Counter'], [1, 2, fileCounter]]
  const wb = createTestWorkbook(uniqueData)
  return createTestFile(wb, name)
}

// ============================================================================
// TESTS
// ============================================================================

describe('ingestFilesInParallel', () => {
  beforeEach(() => {
    resetGlobalWorkbookCache()
    resetGlobalParser()
  })

  describe('basic functionality', () => {
    it('should parse multiple files in parallel', async () => {
      const files = await Promise.all([
        createSimpleFile('file1.xlsx', [['H1', 'H2'], ['A', 'B']]),
        createSimpleFile('file2.xlsx', [['H1', 'H2'], ['C', 'D']]),
        createSimpleFile('file3.xlsx', [['H1', 'H2'], ['E', 'F']])
      ])

      const result = await ingestFilesInParallel(files, {
        concurrency: { limit: 3, continueOnError: true }
      })

      expect(result.files).toHaveLength(3)
      expect(result.successCount).toBe(3)
      expect(result.errorCount).toBe(0)
    })

    it('should handle empty file array', async () => {
      const result = await ingestFilesInParallel([])

      expect(result.files).toHaveLength(0)
      expect(result.successCount).toBe(0)
      expect(result.errorCount).toBe(0)
      expect(result.metrics.fileCount).toBe(0)
    })

    it('should return workbooks for each file', async () => {
      const file = await createSimpleFile('test.xlsx', [
        ['Header1', 'Header2'],
        ['Value1', 'Value2']
      ])

      const result = await ingestFilesInParallel([file])

      expect(result.files[0].workbook).not.toBeNull()
      expect(result.files[0].workbook?.sheets).toHaveLength(1)
      expect(result.files[0].workbook?.sheets[0].sheetName).toBe('Data')
    })
  })

  describe('caching', () => {
    it('should cache parsed workbooks', async () => {
      // Create unique file data
      const uniqueData = [['Header1', 'Header2'], ['CacheTest', Date.now()]]
      const file = await createSimpleFile('cached.xlsx', uniqueData)

      // First parse
      const result1 = await ingestFilesInParallel([file], {
        cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: false },
        parser: { cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: false }, workerThresholdBytes: 10000000, preferWorker: false }
      })

      expect(result1.files[0].metrics.cached).toBe(false)

      // Cache should have entry
      expect(getGlobalWorkbookCache().size()).toBeGreaterThan(0)

      // Create same file again (same content - same hash)
      const file2 = await createSimpleFile('cached2.xlsx', uniqueData)

      // Second parse should use cache
      const result2 = await ingestFilesInParallel([file2], {
        cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: false },
        parser: { cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: false }, workerThresholdBytes: 10000000, preferWorker: false }
      })

      expect(result2.files[0].metrics.cached).toBe(true)
    })

    it('should not cache when disabled', async () => {
      // Reset cache to known state
      resetGlobalWorkbookCache()

      const file = await createSimpleFile('nocache.xlsx')

      // First parse with caching disabled in the parser config
      await ingestFilesInParallel([file], {
        cache: { enabled: false, maxAgeMs: 60000, maxEntries: 10, forceReparse: false },
        parser: { cache: { enabled: false, maxAgeMs: 60000, maxEntries: 10, forceReparse: false }, workerThresholdBytes: 10000000, preferWorker: false }
      })

      // Cache should be empty (since caching was disabled)
      expect(getGlobalWorkbookCache().size()).toBe(0)
    })

    it('should force reparse when configured', async () => {
      // Create unique file data that will be used twice
      const uniqueData = [['Header1', 'Header2'], ['ForceTest', Date.now()]]
      const file = await createSimpleFile('force.xlsx', uniqueData)

      // First parse (caches)
      await ingestFilesInParallel([file], {
        cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: false },
        parser: { cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: false }, workerThresholdBytes: 10000000, preferWorker: false }
      })

      const cacheSize = getGlobalWorkbookCache().size()
      expect(cacheSize).toBeGreaterThan(0)

      // Second parse with forceReparse - use same content so hash matches
      const file2 = await createSimpleFile('force2.xlsx', uniqueData)
      const result = await ingestFilesInParallel([file2], {
        cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: true },
        parser: { cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: true }, workerThresholdBytes: 10000000, preferWorker: false }
      })

      // With forceReparse, should not use cache
      expect(result.files[0].metrics.cached).toBe(false)
    })
  })

  describe('concurrency', () => {
    it('should respect concurrency limit', async () => {
      const files = await Promise.all(
        Array(6).fill(null).map((_, i) => createSimpleFile(`file${i}.xlsx`))
      )

      const result = await ingestFilesInParallel(files, {
        concurrency: { limit: 2, continueOnError: true }
      })

      // All files should be processed
      expect(result.successCount).toBe(6)

      // Metrics should show concurrency config
      expect(result.metrics.parallelization.concurrencyLimit).toBe(2)
    })
  })

  describe('progress reporting', () => {
    it('should report progress during ingestion', async () => {
      const files = await Promise.all([
        createSimpleFile('file1.xlsx'),
        createSimpleFile('file2.xlsx'),
        createSimpleFile('file3.xlsx')
      ])

      const progressUpdates: any[] = []

      await ingestFilesInParallel(files, {
        concurrency: { limit: 1, continueOnError: true },
        onProgress: (progress) => {
          progressUpdates.push({ ...progress })
        }
      })

      // Should have progress updates
      expect(progressUpdates.length).toBeGreaterThan(0)

      // Last update should show 100%
      const lastUpdate = progressUpdates[progressUpdates.length - 1]
      expect(lastUpdate.percentComplete).toBe(100)
    })
  })

  describe('metrics', () => {
    it('should collect timing metrics', async () => {
      const files = await Promise.all([
        createSimpleFile('file1.xlsx'),
        createSimpleFile('file2.xlsx')
      ])

      const result = await ingestFilesInParallel(files)

      expect(result.metrics.fileCount).toBe(2)
      expect(result.metrics.totalTimeMs).toBeGreaterThan(0)
      expect(result.metrics.files).toHaveLength(2)

      for (const file of result.metrics.files) {
        expect(file.parseTimeMs).toBeGreaterThanOrEqual(0)
        expect(file.fileSizeBytes).toBeGreaterThan(0)
      }
    })

    it('should track cache hits in metrics', async () => {
      // Use fixed data so both files have same hash
      const fixedData = [['Header', 'Data'], ['CacheMetrics', 12345]]
      const file = await createSimpleFile('metrics.xlsx', fixedData)

      // First parse
      await ingestFilesInParallel([file], {
        parser: { cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: false }, workerThresholdBytes: 10000000, preferWorker: false }
      })

      // Second parse (cached) with same data = same hash
      const file2 = await createSimpleFile('metrics2.xlsx', fixedData)
      const result = await ingestFilesInParallel([file2], {
        parser: { cache: { enabled: true, maxAgeMs: 60000, maxEntries: 10, forceReparse: false }, workerThresholdBytes: 10000000, preferWorker: false }
      })

      expect(result.metrics.cacheHits).toBe(1)
      expect(result.metrics.cacheMisses).toBe(0)
    })
  })

  describe('error handling', () => {
    it('should handle corrupted files gracefully', async () => {
      // Create a corrupted file
      // Note: workbook loader returns empty workbook for corrupted files rather than throwing
      const corruptedData = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0xFF, 0xFF])
      const corruptedBlob = new Blob([corruptedData], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const corruptedFile = new File([corruptedBlob], 'corrupted.xlsx')

      const validFile = await createSimpleFile('valid.xlsx')

      const result = await ingestFilesInParallel([corruptedFile, validFile])

      // Both files are processed (corrupted returns empty workbook)
      expect(result.files).toHaveLength(2)
      
      // Corrupted file returns empty workbook with no sheets
      expect(result.files[0].workbook).not.toBeNull()
      expect(result.files[0].workbook?.sheets.length).toBe(0)
      
      // Valid file has sheets
      expect(result.files[1].workbook?.sheets.length).toBeGreaterThan(0)
    })

    it('should continue processing all files', async () => {
      const corruptedData = new Uint8Array([0x50, 0x4B, 0xFF, 0xFF])
      const corruptedBlob = new Blob([corruptedData])
      const corruptedFile = new File([corruptedBlob], 'bad.xlsx')

      const files = await Promise.all([
        createSimpleFile('file1.xlsx'),
        Promise.resolve(corruptedFile),
        createSimpleFile('file3.xlsx')
      ])

      const result = await ingestFilesInParallel(files, {
        concurrency: { limit: 3, continueOnError: true }
      })

      // Should process all files
      expect(result.files).toHaveLength(3)
      
      // All files are "successful" (corrupted returns empty workbook)
      // so we check that valid files have sheets
      expect(result.files[0].workbook?.sheets.length).toBeGreaterThan(0)
      expect(result.files[2].workbook?.sheets.length).toBeGreaterThan(0)
    })
  })
})

describe('loadWorkbookCached', () => {
  beforeEach(() => {
    resetGlobalWorkbookCache()
    resetGlobalParser()
  })

  it('should load and cache a workbook', async () => {
    // Use fixed data so both files have same hash
    const fixedData = [['Header', 'Data'], ['LoadCache', 67890]]
    const file = await createSimpleFile('single.xlsx', fixedData)

    const result1 = await loadWorkbookCached(file)
    expect(result1.cached).toBe(false)
    expect(result1.workbook.sheets).toHaveLength(1)

    // Same content = same hash = cache hit
    const file2 = await createSimpleFile('single2.xlsx', fixedData)
    const result2 = await loadWorkbookCached(file2)
    expect(result2.cached).toBe(true)
  })
})

describe('parseFilesSuccessful', () => {
  beforeEach(() => {
    resetGlobalWorkbookCache()
    resetGlobalParser()
  })

  it('should return workbooks for all parseable files', async () => {
    // Create multiple valid files
    const files = await Promise.all([
      createSimpleFile('good1.xlsx', [['H1'], [1]]),
      createSimpleFile('good2.xlsx', [['H2'], [2]]),
      createSimpleFile('good3.xlsx', [['H3'], [3]])
    ])

    const workbooks = await parseFilesSuccessful(files)

    // All files should return workbooks
    expect(workbooks).toHaveLength(3)
    
    // All should have sheets
    for (const wb of workbooks) {
      expect(wb.sheets.length).toBeGreaterThan(0)
    }
  })
})

describe('parseFilesWithCallback', () => {
  beforeEach(() => {
    resetGlobalWorkbookCache()
    resetGlobalParser()
  })

  it('should call callback for each file', async () => {
    const files = await Promise.all([
      createSimpleFile('a.xlsx'),
      createSimpleFile('b.xlsx'),
      createSimpleFile('c.xlsx')
    ])

    const callbacks: { fileName: string; index: number }[] = []

    await parseFilesWithCallback(
      files,
      (result, index) => {
        callbacks.push({ fileName: result.fileName, index })
      }
    )

    expect(callbacks).toHaveLength(3)
    expect(callbacks.map(c => c.fileName).sort()).toEqual(['a.xlsx', 'b.xlsx', 'c.xlsx'])
  })
})

describe('preloadFilesToCache', () => {
  beforeEach(() => {
    resetGlobalWorkbookCache()
    resetGlobalParser()
  })

  it('should preload files into cache', async () => {
    // Create files with unique content
    const files = await Promise.all([
      createSimpleFile('preload1.xlsx', [['H1', 'H2'], ['Preload', 1]]),
      createSimpleFile('preload2.xlsx', [['H1', 'H2'], ['Preload', 2]])
    ])

    const result = await preloadFilesToCache(files)

    expect(result.loaded).toBe(2)
    expect(result.errors).toBe(0)
    // Cache should have entries (at least 1 since files may have different hashes)
    expect(getGlobalWorkbookCache().size()).toBeGreaterThanOrEqual(1)
  })
})
