/**
 * Workbook Parser Abstraction
 *
 * Provides a unified interface for parsing Excel files with support for:
 * - Main thread parsing (default, synchronous)
 * - Web Worker parsing (for large files, non-blocking)
 *
 * Part of the Performance Engine for Excel ingestion.
 */

import type { NormalizedWorkbook } from '../workbookLoader'
import { loadWorkbookFromBuffer } from '../workbookLoader'
import type { WorkbookCacheConfig } from './workbookCache'
import {
  computeBufferHash,
  getGlobalWorkbookCache,
  DEFAULT_CACHE_CONFIG,
  type WorkbookCacheEntry,
} from './workbookCache'
import { log } from '../../lib/log'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of parsing a workbook.
 */
export type ParseResult = {
  workbook: NormalizedWorkbook
  cached: boolean
  parseTimeMs: number
  fileSizeBytes: number
  hash: string
}

/**
 * Workbook parser interface.
 * Abstracts the parsing implementation (main thread vs worker).
 */
export interface WorkbookParser {
  /**
   * Parse a file and return a normalized workbook.
   */
  parse(file: File | ArrayBuffer, fileName?: string): Promise<ParseResult>

  /**
   * Check if this parser supports the current environment.
   */
  isSupported(): boolean

  /**
   * Get the parser type name for diagnostics.
   */
  getParserType(): string
}

/**
 * Parser configuration.
 */
export type WorkbookParserConfig = {
  /** Cache configuration */
  cache: WorkbookCacheConfig
  /** Use worker for files larger than this (bytes) */
  workerThresholdBytes: number
  /** Whether to prefer worker when available */
  preferWorker: boolean
}

/**
 * Default parser configuration.
 */
export const DEFAULT_PARSER_CONFIG: WorkbookParserConfig = {
  cache: DEFAULT_CACHE_CONFIG,
  workerThresholdBytes: 2 * 1024 * 1024, // 2 MB
  preferWorker: true,
}

// ============================================================================
// MAIN THREAD PARSER
// ============================================================================

/**
 * Main thread workbook parser.
 * Parses Excel files synchronously on the main thread.
 * Suitable for small files or when workers are not available.
 */
export class MainThreadWorkbookParser implements WorkbookParser {
  private config: WorkbookParserConfig

  constructor(config: Partial<WorkbookParserConfig> = {}) {
    this.config = { ...DEFAULT_PARSER_CONFIG, ...config }
  }

  async parse(file: File | ArrayBuffer, fileName?: string): Promise<ParseResult> {
    const startTime = performance.now()

    // Get buffer and file info
    const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
    const name = fileName ?? (file instanceof File ? file.name : 'workbook.xlsx')
    const fileSizeBytes = buffer.byteLength

    // Compute hash for caching
    const hash = computeBufferHash(buffer)

    // Check cache if enabled
    if (this.config.cache.enabled && !this.config.cache.forceReparse) {
      const cache = getGlobalWorkbookCache()
      const cached = cache.getByHash(hash)

      if (cached !== undefined) {
        const parseTimeMs = performance.now() - startTime
        return {
          workbook: cached.rawWorkbook,
          cached: true,
          parseTimeMs,
          fileSizeBytes,
          hash,
        }
      }
    }

    // Parse the workbook
    const workbook = loadWorkbookFromBuffer(buffer, name)

    // Store in cache
    if (this.config.cache.enabled) {
      const cache = getGlobalWorkbookCache()
      const entry: WorkbookCacheEntry = {
        workbookId: name,
        hash,
        parsedAt: Date.now(),
        rawWorkbook: workbook,
        fileSizeBytes,
      }
      cache.set(entry)
    }

    const parseTimeMs = performance.now() - startTime

    return {
      workbook,
      cached: false,
      parseTimeMs,
      fileSizeBytes,
      hash,
    }
  }

  isSupported(): boolean {
    return true // Always supported
  }

  getParserType(): string {
    return 'MainThread'
  }
}

// ============================================================================
// WORKER PARSER
// ============================================================================

/**
 * Message sent to the worker.
 */
export type WorkerParseRequest = {
  type: 'parse'
  id: string
  buffer: ArrayBuffer
  fileName: string
}

/**
 * Message received from the worker.
 */
export type WorkerParseResponse =
  | {
      type: 'parsed'
      id: string
      workbook: NormalizedWorkbook
      parseTimeMs: number
    }
  | {
      type: 'error'
      id: string
      error: string
    }

/**
 * Web Worker-based workbook parser.
 * Offloads parsing to a background thread to avoid blocking the UI.
 *
 * NOTE: Requires excelParser.worker.ts to be bundled separately.
 */
export class WorkerWorkbookParser implements WorkbookParser {
  private config: WorkbookParserConfig
  private worker: Worker | null = null
  private pendingRequests: Map<
    string,
    {
      resolve: (result: ParseResult) => void
      reject: (error: Error) => void
      startTime: number
      fileSizeBytes: number
      hash: string
    }
  > = new Map()
  private requestId = 0

  constructor(config: Partial<WorkbookParserConfig> = {}) {
    this.config = { ...DEFAULT_PARSER_CONFIG, ...config }
  }

  async parse(file: File | ArrayBuffer, fileName?: string): Promise<ParseResult> {
    const startTime = performance.now()

    // Get buffer and file info
    const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
    const name = fileName ?? (file instanceof File ? file.name : 'workbook.xlsx')
    const fileSizeBytes = buffer.byteLength

    // Compute hash for caching
    const hash = computeBufferHash(buffer)

    // Check cache first (cache is on main thread)
    if (this.config.cache.enabled && !this.config.cache.forceReparse) {
      const cache = getGlobalWorkbookCache()
      const cached = cache.getByHash(hash)

      if (cached !== undefined) {
        const parseTimeMs = performance.now() - startTime
        return {
          workbook: cached.rawWorkbook,
          cached: true,
          parseTimeMs,
          fileSizeBytes,
          hash,
        }
      }
    }

    // Guard: worker not supported
    if (!this.isSupported()) {
      // Fall back to main thread parsing
      const fallback = new MainThreadWorkbookParser(this.config)
      return fallback.parse(buffer, name)
    }

    // Initialize worker if needed
    this.ensureWorker()

    // Send to worker
    const id = `parse-${this.requestId++}`

    return new Promise<ParseResult>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve,
        reject,
        startTime,
        fileSizeBytes,
        hash,
      })

      // Transfer buffer to worker (no copy)
      const message: WorkerParseRequest = {
        type: 'parse',
        id,
        buffer,
        fileName: name,
      }

      this.worker!.postMessage(message, [buffer])
    })
  }

  isSupported(): boolean {
    // Check if we're in a browser environment with Worker support
    return typeof Worker !== 'undefined' && typeof window !== 'undefined'
  }

  getParserType(): string {
    return 'WebWorker'
  }

  /**
   * Terminate the worker.
   */
  terminate(): void {
    if (this.worker !== null) {
      this.worker.terminate()
      this.worker = null
    }

    // Reject any pending requests
    for (const [, request] of this.pendingRequests) {
      request.reject(new Error('Worker terminated'))
    }
    this.pendingRequests.clear()
  }

  private ensureWorker(): void {
    if (this.worker !== null) {
      return
    }

    // Create worker from inline script
    // In production, this would import a bundled worker script
    const workerCode = createWorkerCode()
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)

    this.worker = new Worker(workerUrl)

    this.worker.onmessage = (event: MessageEvent<WorkerParseResponse>) => {
      this.handleWorkerMessage(event.data)
    }

    this.worker.onerror = (error) => {
      log.error('[WorkerParser] Worker error:', error)
      // Reject all pending requests
      for (const [, request] of this.pendingRequests) {
        request.reject(new Error(`Worker error: ${error.message}`))
      }
      this.pendingRequests.clear()
    }

    // Clean up blob URL
    URL.revokeObjectURL(workerUrl)
  }

  private handleWorkerMessage(response: WorkerParseResponse): void {
    const request = this.pendingRequests.get(response.id)

    if (request === undefined) {
      log.warn('[WorkerParser] Received response for unknown request:', response.id)
      return
    }

    this.pendingRequests.delete(response.id)

    if (response.type === 'error') {
      request.reject(new Error(response.error))
      return
    }

    const parseTimeMs = performance.now() - request.startTime

    // Cache the result
    if (this.config.cache.enabled) {
      const cache = getGlobalWorkbookCache()
      const entry: WorkbookCacheEntry = {
        workbookId: response.workbook.fileName,
        hash: request.hash,
        parsedAt: Date.now(),
        rawWorkbook: response.workbook,
        fileSizeBytes: request.fileSizeBytes,
      }
      cache.set(entry)
    }

    request.resolve({
      workbook: response.workbook,
      cached: false,
      parseTimeMs,
      fileSizeBytes: request.fileSizeBytes,
      hash: request.hash,
    })
  }
}

// ============================================================================
// WORKER CODE GENERATION
// ============================================================================

/**
 * Generate inline worker code.
 *
 * NOTE: In a production build, this would be a separate bundled file.
 * This inline approach works for development and small deployments.
 */
function createWorkerCode(): string {
  // This is a minimal worker that imports xlsx and parses workbooks
  // In production, you'd bundle this properly with the xlsx library
  return `
    // Excel Parser Worker
    // Parses workbooks in a background thread
    
    importScripts('https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js');
    
    self.onmessage = async function(event) {
      const { type, id, buffer, fileName } = event.data;
      
      if (type !== 'parse') {
        return;
      }
      
      const startTime = performance.now();
      
      try {
        const workbook = XLSX.read(buffer, {
          type: 'array',
          cellDates: false,
          cellNF: false,
          cellText: false
        });
        
        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Workbook is empty or invalid');
        }
        
        // Normalize sheets
        const sheets = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          
          const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: null,
            raw: false
          });
          
          // Normalize values
          const normalizedRows = rows.map(row => 
            row.map(cell => {
              if (cell === null || cell === undefined) return null;
              if (typeof cell === 'number') return isNaN(cell) ? null : cell;
              if (typeof cell === 'boolean') return cell ? 1 : 0;
              if (typeof cell === 'string') {
                const trimmed = cell.trim();
                if (trimmed === '') return null;
                if (/^-?\\d+(\\.\\d+)?$/.test(trimmed)) {
                  const num = parseFloat(trimmed);
                  if (!isNaN(num)) return num;
                }
                return trimmed;
              }
              return String(cell).trim() || null;
            })
          );
          
          // Remove trailing empty rows
          while (normalizedRows.length > 0 && 
                 normalizedRows[normalizedRows.length - 1].every(c => c === null)) {
            normalizedRows.pop();
          }
          
          sheets.push({ sheetName, rows: normalizedRows });
        }
        
        const parseTimeMs = performance.now() - startTime;
        
        self.postMessage({
          type: 'parsed',
          id,
          workbook: { fileName, sheets },
          parseTimeMs
        });
        
      } catch (error) {
        self.postMessage({
          type: 'error',
          id,
          error: error.message || String(error)
        });
      }
    };
  `
}

// ============================================================================
// PARSER FACTORY
// ============================================================================

/**
 * Feature detection for parser selection.
 */
export type ParserEnvironment = {
  /** Whether Web Workers are available */
  workersAvailable: boolean
  /** Whether we're in a browser */
  isBrowser: boolean
  /** Whether we're in a secure context (required for workers) */
  isSecureContext: boolean
}

/**
 * Detect the current environment.
 */
export function detectEnvironment(): ParserEnvironment {
  return {
    workersAvailable: typeof Worker !== 'undefined',
    isBrowser: typeof window !== 'undefined',
    isSecureContext: typeof isSecureContext !== 'undefined' ? isSecureContext : false,
  }
}

/**
 * Create an appropriate parser based on environment and file size.
 *
 * @param config - Parser configuration
 * @param fileSizeBytes - Optional file size hint for parser selection
 * @returns Appropriate parser implementation
 */
export function createWorkbookParser(
  config: Partial<WorkbookParserConfig> = {},
  fileSizeBytes?: number,
): WorkbookParser {
  const fullConfig = { ...DEFAULT_PARSER_CONFIG, ...config }
  const env = detectEnvironment()

  // Guard: workers not available
  if (!env.workersAvailable || !env.isBrowser) {
    return new MainThreadWorkbookParser(fullConfig)
  }

  // Guard: not preferred
  if (!fullConfig.preferWorker) {
    return new MainThreadWorkbookParser(fullConfig)
  }

  // Guard: file too small for worker overhead
  if (fileSizeBytes !== undefined && fileSizeBytes < fullConfig.workerThresholdBytes) {
    return new MainThreadWorkbookParser(fullConfig)
  }

  // Use worker parser
  return new WorkerWorkbookParser(fullConfig)
}

/**
 * Create the default parser (main thread with caching).
 */
export function createDefaultParser(): WorkbookParser {
  return new MainThreadWorkbookParser()
}

// ============================================================================
// SINGLETON PARSER
// ============================================================================

let globalParser: WorkbookParser | null = null

/**
 * Get the global parser instance.
 */
export function getGlobalParser(): WorkbookParser {
  if (globalParser === null) {
    globalParser = createDefaultParser()
  }
  return globalParser
}

/**
 * Set the global parser (useful for testing or custom configuration).
 */
export function setGlobalParser(parser: WorkbookParser): void {
  globalParser = parser
}

/**
 * Reset the global parser.
 */
export function resetGlobalParser(): void {
  if (globalParser instanceof WorkerWorkbookParser) {
    globalParser.terminate()
  }
  globalParser = null
}
