/**
 * Workbook Reader Abstraction
 * 
 * Provides a clean interface for reading workbooks that supports both:
 * - Standard synchronous parsing (current implementation)
 * - Streaming/progressive parsing (future large file support)
 * 
 * Part of the Performance Engine for Excel ingestion.
 */

import type { NormalizedWorkbook } from '../workbookLoader'
import { log } from '../../lib/log'
import { loadWorkbookFromBuffer } from '../workbookLoader'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw sheet data with minimal processing.
 * Used for streaming where we want to yield sheets progressively.
 */
export type RawSheet = {
  sheetName: string
  rows: (string | number | null)[][]
  rowCount: number
}

/**
 * Streaming workbook reader interface.
 * Allows progressive reading of sheets without loading everything into memory.
 */
export interface WorkbookReader {
  /**
   * Iterate over sheets in the workbook.
   * For standard readers, yields all sheets at once.
   * For streaming readers, yields sheets as they are parsed.
   */
  readSheets(): AsyncGenerator<RawSheet>

  /**
   * Get workbook metadata without reading all sheet data.
   */
  getMetadata(): Promise<WorkbookMetadata>
}

/**
 * Basic workbook metadata.
 */
export type WorkbookMetadata = {
  fileName: string
  sheetNames: string[]
  estimatedRowCount: number
  fileSizeBytes: number
}

/**
 * Configuration for workbook reading.
 */
export type WorkbookReaderConfig = {
  /** Enable streaming mode for large files (experimental) */
  streaming: boolean
  /** Threshold in bytes for automatic streaming mode */
  streamingThresholdBytes: number
  /** Maximum rows to read per sheet (0 = unlimited) */
  maxRowsPerSheet: number
}

/**
 * Default reader configuration.
 */
export const DEFAULT_READER_CONFIG: WorkbookReaderConfig = {
  streaming: false,
  streamingThresholdBytes: 10 * 1024 * 1024, // 10 MB
  maxRowsPerSheet: 0
}

// ============================================================================
// STANDARD WORKBOOK READER
// ============================================================================

/**
 * Standard workbook reader that loads the entire workbook into memory.
 * This is the default implementation used today.
 */
export class StandardWorkbookReader implements WorkbookReader {
  private buffer: ArrayBuffer
  private fileName: string
  private workbook: NormalizedWorkbook | null = null

  constructor(buffer: ArrayBuffer, fileName: string) {
    this.buffer = buffer
    this.fileName = fileName
  }

  async *readSheets(): AsyncGenerator<RawSheet> {
    // Load workbook if not already loaded
    if (this.workbook === null) {
      this.workbook = loadWorkbookFromBuffer(this.buffer, this.fileName)
    }

    // Yield each sheet
    for (const sheet of this.workbook.sheets) {
      yield {
        sheetName: sheet.sheetName,
        rows: sheet.rows,
        rowCount: sheet.rows.length
      }
    }
  }

  async getMetadata(): Promise<WorkbookMetadata> {
    // Load workbook to get sheet names
    if (this.workbook === null) {
      this.workbook = loadWorkbookFromBuffer(this.buffer, this.fileName)
    }

    let estimatedRowCount = 0
    for (const sheet of this.workbook.sheets) {
      estimatedRowCount += sheet.rows.length
    }

    return {
      fileName: this.fileName,
      sheetNames: this.workbook.sheets.map(s => s.sheetName),
      estimatedRowCount,
      fileSizeBytes: this.buffer.byteLength
    }
  }

  /**
   * Get the fully loaded workbook.
   * Use this when you need direct access to the workbook object.
   */
  getWorkbook(): NormalizedWorkbook {
    if (this.workbook === null) {
      this.workbook = loadWorkbookFromBuffer(this.buffer, this.fileName)
    }
    return this.workbook
  }
}

// ============================================================================
// STREAMING WORKBOOK READER (PROOF OF CONCEPT)
// ============================================================================

/**
 * Streaming workbook reader for large files.
 * 
 * NOTE: This is a proof-of-concept. Full streaming requires library support
 * (ExcelJS streaming reader in Node, or similar browser-compatible solution).
 * 
 * Current implementation simulates streaming by chunking the standard parse.
 * True streaming would read the ZIP file progressively.
 */
export class StreamingWorkbookReader implements WorkbookReader {
  private buffer: ArrayBuffer
  private fileName: string
  private config: WorkbookReaderConfig

  constructor(
    buffer: ArrayBuffer, 
    fileName: string,
    config: Partial<WorkbookReaderConfig> = {}
  ) {
    this.buffer = buffer
    this.fileName = fileName
    this.config = { ...DEFAULT_READER_CONFIG, ...config }
  }

  async *readSheets(): AsyncGenerator<RawSheet> {
    // For now, fall back to standard parsing but yield sheets progressively
    // True streaming would parse the XLSX ZIP file chunk by chunk
    const workbook = loadWorkbookFromBuffer(this.buffer, this.fileName)

    for (const sheet of workbook.sheets) {
      // Apply row limit if configured
      const rows = this.config.maxRowsPerSheet > 0
        ? sheet.rows.slice(0, this.config.maxRowsPerSheet)
        : sheet.rows

      // Yield with a microtask delay to allow event loop to process
      await new Promise<void>(resolve => setTimeout(resolve, 0))

      yield {
        sheetName: sheet.sheetName,
        rows,
        rowCount: sheet.rows.length // Report actual count even if truncated
      }
    }
  }

  async getMetadata(): Promise<WorkbookMetadata> {
    // Parse just enough to get sheet names
    const workbook = loadWorkbookFromBuffer(this.buffer, this.fileName)

    let estimatedRowCount = 0
    for (const sheet of workbook.sheets) {
      estimatedRowCount += sheet.rows.length
    }

    return {
      fileName: this.fileName,
      sheetNames: workbook.sheets.map(s => s.sheetName),
      estimatedRowCount,
      fileSizeBytes: this.buffer.byteLength
    }
  }
}

// ============================================================================
// READER FACTORY
// ============================================================================

/**
 * Feature flags for reader selection.
 */
export type ReaderFeatureFlags = {
  /** Enable streaming for large files */
  enableStreaming: boolean
  /** Size threshold for streaming (bytes) */
  streamingThreshold: number
}

/**
 * Default feature flags.
 */
export const DEFAULT_READER_FLAGS: ReaderFeatureFlags = {
  enableStreaming: false,
  streamingThreshold: 10 * 1024 * 1024 // 10 MB
}

/**
 * Create an appropriate workbook reader based on file size and config.
 * 
 * @param buffer - File content as ArrayBuffer
 * @param fileName - Name of the file
 * @param flags - Feature flags for reader selection
 * @returns Appropriate reader implementation
 */
export function createWorkbookReader(
  buffer: ArrayBuffer,
  fileName: string,
  flags: Partial<ReaderFeatureFlags> = {}
): WorkbookReader {
  const config = { ...DEFAULT_READER_FLAGS, ...flags }

  // Use streaming reader for large files if enabled
  if (config.enableStreaming && buffer.byteLength > config.streamingThreshold) {
    log.info(`[WorkbookReader] Using streaming reader for large file: ${fileName} (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`)
    return new StreamingWorkbookReader(buffer, fileName)
  }

  // Default to standard reader
  return new StandardWorkbookReader(buffer, fileName)
}

/**
 * Create a reader from a File/Blob.
 */
export async function createWorkbookReaderFromFile(
  file: File | Blob,
  fileName?: string,
  flags?: Partial<ReaderFeatureFlags>
): Promise<WorkbookReader> {
  const name = fileName ?? (file instanceof File ? file.name : 'workbook.xlsx')
  const buffer = await file.arrayBuffer()
  return createWorkbookReader(buffer, name, flags)
}

// ============================================================================
// UTILITY: COLLECT ALL SHEETS
// ============================================================================

/**
 * Collect all sheets from a reader into an array.
 * Convenience function for when you need all sheets at once.
 */
export async function collectAllSheets(reader: WorkbookReader): Promise<RawSheet[]> {
  const sheets: RawSheet[] = []
  
  for await (const sheet of reader.readSheets()) {
    sheets.push(sheet)
  }

  return sheets
}

/**
 * Convert collected sheets to a NormalizedWorkbook.
 */
export function toNormalizedWorkbook(
  fileName: string,
  sheets: RawSheet[]
): NormalizedWorkbook {
  return {
    fileName,
    sheets: sheets.map(sheet => ({
      sheetName: sheet.sheetName,
      rows: sheet.rows
    }))
  }
}
