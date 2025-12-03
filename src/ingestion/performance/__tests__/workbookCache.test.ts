/**
 * Tests for WorkbookCache
 * 
 * Validates:
 * - Cache storage and retrieval
 * - Hash computation
 * - LRU eviction
 * - Old entry cleanup
 * - Cache statistics
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  InMemoryWorkbookCache,
  computeBufferHash,
  getGlobalWorkbookCache,
  resetGlobalWorkbookCache,
  type WorkbookCacheEntry
} from '../workbookCache'
import type { NormalizedWorkbook } from '../../workbookLoader'

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMockWorkbook(fileName: string, sheetCount: number = 1): NormalizedWorkbook {
  const sheets = []
  for (let i = 0; i < sheetCount; i++) {
    sheets.push({
      sheetName: `Sheet${i + 1}`,
      rows: [
        ['Header1', 'Header2'],
        ['Data1', 'Data2']
      ]
    })
  }
  return { fileName, sheets }
}

function createCacheEntry(id: string, hash: string, parsedAt?: number): WorkbookCacheEntry {
  return {
    workbookId: id,
    hash,
    parsedAt: parsedAt ?? Date.now(),
    rawWorkbook: createMockWorkbook(id),
    fileSizeBytes: 1024
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('computeBufferHash', () => {
  it('should compute a stable hash for the same buffer', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5])
    const buffer = data.buffer as ArrayBuffer

    const hash1 = computeBufferHash(buffer)
    const hash2 = computeBufferHash(buffer)

    expect(hash1).toBe(hash2)
  })

  it('should compute different hashes for different buffers', () => {
    const data1 = new Uint8Array([1, 2, 3, 4, 5])
    const data2 = new Uint8Array([5, 4, 3, 2, 1])

    const hash1 = computeBufferHash(data1.buffer as ArrayBuffer)
    const hash2 = computeBufferHash(data2.buffer as ArrayBuffer)

    expect(hash1).not.toBe(hash2)
  })

  it('should include size in hash for collision resistance', () => {
    const data1 = new Uint8Array([1, 2, 3])
    const data2 = new Uint8Array([1, 2, 3, 0, 0])

    const hash1 = computeBufferHash(data1.buffer as ArrayBuffer)
    const hash2 = computeBufferHash(data2.buffer as ArrayBuffer)

    // Hashes should differ due to size prefix
    expect(hash1).not.toBe(hash2)
    expect(hash1.startsWith('3-')).toBe(true)
    expect(hash2.startsWith('5-')).toBe(true)
  })

  it('should handle empty buffer', () => {
    const empty = new ArrayBuffer(0)
    const hash = computeBufferHash(empty)

    expect(hash).toMatch(/^0-/)
  })
})

describe('InMemoryWorkbookCache', () => {
  let cache: InMemoryWorkbookCache

  beforeEach(() => {
    cache = new InMemoryWorkbookCache(5)
  })

  describe('basic operations', () => {
    it('should store and retrieve entries by hash', () => {
      const entry = createCacheEntry('test.xlsx', 'hash-123')
      cache.set(entry)

      const retrieved = cache.getByHash('hash-123')

      expect(retrieved).toBeDefined()
      expect(retrieved?.workbookId).toBe('test.xlsx')
      expect(retrieved?.hash).toBe('hash-123')
    })

    it('should return undefined for unknown hash', () => {
      const retrieved = cache.getByHash('unknown-hash')
      expect(retrieved).toBeUndefined()
    })

    it('should report correct size', () => {
      expect(cache.size()).toBe(0)

      cache.set(createCacheEntry('a.xlsx', 'hash-a'))
      expect(cache.size()).toBe(1)

      cache.set(createCacheEntry('b.xlsx', 'hash-b'))
      expect(cache.size()).toBe(2)
    })

    it('should clear all entries', () => {
      cache.set(createCacheEntry('a.xlsx', 'hash-a'))
      cache.set(createCacheEntry('b.xlsx', 'hash-b'))

      cache.clear()

      expect(cache.size()).toBe(0)
      expect(cache.getByHash('hash-a')).toBeUndefined()
      expect(cache.getByHash('hash-b')).toBeUndefined()
    })
  })

  describe('LRU eviction', () => {
    it('should evict oldest entry when at capacity', () => {
      // Fill cache to capacity (5 entries)
      for (let i = 0; i < 5; i++) {
        cache.set(createCacheEntry(`file${i}.xlsx`, `hash-${i}`))
      }
      expect(cache.size()).toBe(5)

      // Add one more entry
      cache.set(createCacheEntry('file5.xlsx', 'hash-5'))

      // Should still be at capacity
      expect(cache.size()).toBe(5)

      // Oldest entry should be evicted
      expect(cache.getByHash('hash-0')).toBeUndefined()

      // Newest entry should exist
      expect(cache.getByHash('hash-5')).toBeDefined()
    })

    it('should update LRU order on access', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(createCacheEntry(`file${i}.xlsx`, `hash-${i}`))
      }

      // Access the oldest entry (hash-0), making it newest
      cache.getByHash('hash-0')

      // Add a new entry to trigger eviction
      cache.set(createCacheEntry('file5.xlsx', 'hash-5'))

      // hash-0 should still exist (was accessed recently)
      expect(cache.getByHash('hash-0')).toBeDefined()

      // hash-1 should be evicted (became oldest after hash-0 access)
      expect(cache.getByHash('hash-1')).toBeUndefined()
    })

    it('should not evict when updating existing entry', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(createCacheEntry(`file${i}.xlsx`, `hash-${i}`))
      }

      // Update existing entry
      const updated = createCacheEntry('file0-updated.xlsx', 'hash-0')
      cache.set(updated)

      // Should still have 5 entries
      expect(cache.size()).toBe(5)

      // All original hashes should exist
      for (let i = 0; i < 5; i++) {
        expect(cache.getByHash(`hash-${i}`)).toBeDefined()
      }

      // Updated entry should have new workbookId
      expect(cache.getByHash('hash-0')?.workbookId).toBe('file0-updated.xlsx')
    })
  })

  describe('old entry cleanup', () => {
    it('should clear entries older than maxAge', () => {
      const now = Date.now()

      // Add old entries
      cache.set(createCacheEntry('old1.xlsx', 'hash-old1', now - 10000))
      cache.set(createCacheEntry('old2.xlsx', 'hash-old2', now - 8000))

      // Add recent entries
      cache.set(createCacheEntry('new1.xlsx', 'hash-new1', now - 2000))
      cache.set(createCacheEntry('new2.xlsx', 'hash-new2', now))

      expect(cache.size()).toBe(4)

      // Clear entries older than 5 seconds
      cache.clearOldEntries(5000)

      expect(cache.size()).toBe(2)
      expect(cache.getByHash('hash-old1')).toBeUndefined()
      expect(cache.getByHash('hash-old2')).toBeUndefined()
      expect(cache.getByHash('hash-new1')).toBeDefined()
      expect(cache.getByHash('hash-new2')).toBeDefined()
    })

    it('should handle empty cache', () => {
      // Should not throw
      cache.clearOldEntries(1000)
      expect(cache.size()).toBe(0)
    })
  })

  describe('statistics', () => {
    it('should track hit and miss counts', () => {
      cache.set(createCacheEntry('test.xlsx', 'hash-test'))

      // Miss
      cache.getByHash('unknown')

      // Hit
      cache.getByHash('hash-test')

      // Another miss
      cache.getByHash('also-unknown')

      // Another hit
      cache.getByHash('hash-test')

      const stats = cache.getStats()

      expect(stats.hitCount).toBe(2)
      expect(stats.missCount).toBe(2)
      expect(stats.hitRatio).toBe(0.5)
    })

    it('should calculate total size', () => {
      cache.set({
        ...createCacheEntry('a.xlsx', 'hash-a'),
        fileSizeBytes: 1000
      })
      cache.set({
        ...createCacheEntry('b.xlsx', 'hash-b'),
        fileSizeBytes: 2000
      })

      const stats = cache.getStats()

      expect(stats.entryCount).toBe(2)
      expect(stats.totalSizeBytes).toBe(3000)
    })

    it('should handle empty cache stats', () => {
      const stats = cache.getStats()

      expect(stats.entryCount).toBe(0)
      expect(stats.totalSizeBytes).toBe(0)
      expect(stats.hitCount).toBe(0)
      expect(stats.missCount).toBe(0)
      expect(stats.hitRatio).toBe(0)
    })

    it('should reset stats on clear', () => {
      cache.set(createCacheEntry('test.xlsx', 'hash-test'))
      cache.getByHash('hash-test')
      cache.getByHash('unknown')

      cache.clear()

      const stats = cache.getStats()
      expect(stats.hitCount).toBe(0)
      expect(stats.missCount).toBe(0)
    })
  })
})

describe('global cache', () => {
  beforeEach(() => {
    resetGlobalWorkbookCache()
  })

  it('should return same instance on multiple calls', () => {
    const cache1 = getGlobalWorkbookCache()
    const cache2 = getGlobalWorkbookCache()

    expect(cache1).toBe(cache2)
  })

  it('should reset global cache', () => {
    const cache1 = getGlobalWorkbookCache()
    cache1.set(createCacheEntry('test.xlsx', 'hash-test'))

    resetGlobalWorkbookCache()

    const cache2 = getGlobalWorkbookCache()

    // Should be a new instance
    expect(cache2.size()).toBe(0)
  })
})
