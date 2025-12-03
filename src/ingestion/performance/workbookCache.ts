/**
 * Workbook Cache
 * 
 * Provides caching for parsed workbooks to avoid reparsing the same file
 * multiple times during ingestion. Uses content hashing for cache key.
 * 
 * Part of the Performance Engine for Excel ingestion.
 */

import type { NormalizedWorkbook } from '../workbookLoader'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Entry stored in the workbook cache.
 */
export type WorkbookCacheEntry = {
  workbookId: string
  hash: string
  parsedAt: number
  rawWorkbook: NormalizedWorkbook
  fileSizeBytes: number
}

/**
 * Cache interface for storing parsed workbooks.
 */
export interface WorkbookCache {
  /**
   * Get a cached workbook by its content hash.
   */
  getByHash(hash: string): WorkbookCacheEntry | undefined

  /**
   * Store a parsed workbook in the cache.
   */
  set(entry: WorkbookCacheEntry): void

  /**
   * Remove entries older than the specified age.
   */
  clearOldEntries(maxAgeMs: number): void

  /**
   * Clear all entries from the cache.
   */
  clear(): void

  /**
   * Get the current number of cached entries.
   */
  size(): number

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats
}

/**
 * Cache statistics for monitoring.
 */
export type CacheStats = {
  entryCount: number
  totalSizeBytes: number
  hitCount: number
  missCount: number
  hitRatio: number
}

/**
 * Configuration for workbook caching behavior.
 */
export type WorkbookCacheConfig = {
  /** Whether caching is enabled */
  enabled: boolean
  /** Maximum age of cache entries in milliseconds (default: 5 minutes) */
  maxAgeMs: number
  /** Maximum number of entries to keep in cache (default: 10) */
  maxEntries: number
  /** Force reparse even if cached (useful for debugging) */
  forceReparse: boolean
}

/**
 * Default cache configuration.
 */
export const DEFAULT_CACHE_CONFIG: WorkbookCacheConfig = {
  enabled: true,
  maxAgeMs: 5 * 60 * 1000, // 5 minutes
  maxEntries: 10,
  forceReparse: false
}

// ============================================================================
// HASH COMPUTATION
// ============================================================================

/**
 * Compute a stable hash from an ArrayBuffer.
 * 
 * Uses a fast, non-cryptographic hash algorithm suitable for cache keys.
 * Based on FNV-1a hash.
 */
export function computeBufferHash(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer)
  
  // FNV-1a 32-bit hash
  let hash = 2166136261
  
  for (let i = 0; i < view.length; i++) {
    hash ^= view[i]
    hash = Math.imul(hash, 16777619)
  }
  
  // Convert to hex string with size prefix for uniqueness
  const hashHex = (hash >>> 0).toString(16).padStart(8, '0')
  return `${buffer.byteLength}-${hashHex}`
}

/**
 * Compute a hash from a File object.
 * Returns a promise since File.arrayBuffer() is async.
 */
export async function computeFileHash(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  return computeBufferHash(buffer)
}

// ============================================================================
// IN-MEMORY CACHE IMPLEMENTATION
// ============================================================================

/**
 * In-memory implementation of WorkbookCache.
 * 
 * Stores parsed workbooks in memory with LRU eviction when max entries exceeded.
 */
export class InMemoryWorkbookCache implements WorkbookCache {
  private cache: Map<string, WorkbookCacheEntry> = new Map()
  private hitCount = 0
  private missCount = 0
  private maxEntries: number

  constructor(maxEntries: number = DEFAULT_CACHE_CONFIG.maxEntries) {
    this.maxEntries = maxEntries
  }

  getByHash(hash: string): WorkbookCacheEntry | undefined {
    const entry = this.cache.get(hash)
    
    if (entry === undefined) {
      this.missCount++
      return undefined
    }

    this.hitCount++
    
    // Move to end for LRU behavior (delete and re-add)
    this.cache.delete(hash)
    this.cache.set(hash, entry)
    
    return entry
  }

  set(entry: WorkbookCacheEntry): void {
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(entry.hash)) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(entry.hash, entry)
  }

  clearOldEntries(maxAgeMs: number): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [hash, entry] of this.cache) {
      const age = now - entry.parsedAt
      if (age > maxAgeMs) {
        keysToDelete.push(hash)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
    }
  }

  clear(): void {
    this.cache.clear()
    this.hitCount = 0
    this.missCount = 0
  }

  size(): number {
    return this.cache.size
  }

  getStats(): CacheStats {
    let totalSizeBytes = 0
    
    for (const entry of this.cache.values()) {
      totalSizeBytes += entry.fileSizeBytes
    }

    const totalRequests = this.hitCount + this.missCount
    const hitRatio = totalRequests > 0 ? this.hitCount / totalRequests : 0

    return {
      entryCount: this.cache.size,
      totalSizeBytes,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRatio
    }
  }

  /**
   * Reset statistics counters (useful for testing).
   */
  resetStats(): void {
    this.hitCount = 0
    this.missCount = 0
  }
}

// ============================================================================
// SINGLETON CACHE INSTANCE
// ============================================================================

let globalCacheInstance: InMemoryWorkbookCache | null = null

/**
 * Get the global workbook cache instance.
 * Creates a new instance if one doesn't exist.
 */
export function getGlobalWorkbookCache(): InMemoryWorkbookCache {
  if (globalCacheInstance === null) {
    globalCacheInstance = new InMemoryWorkbookCache()
  }
  return globalCacheInstance
}

/**
 * Reset the global cache (useful for testing).
 */
export function resetGlobalWorkbookCache(): void {
  if (globalCacheInstance !== null) {
    globalCacheInstance.clear()
  }
  globalCacheInstance = null
}

