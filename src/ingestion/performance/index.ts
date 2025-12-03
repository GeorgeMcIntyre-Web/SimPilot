/**
 * Performance Module
 * 
 * Exports all performance-related functionality for Excel ingestion:
 * - Workbook caching
 * - Parallel processing with concurrency control
 * - Streaming workbook reading
 * - Worker-based parsing
 * - Ingestion metrics
 * 
 * Part of the Performance Engine for SimPilot's Excel ingestion.
 */

// Import defaults for use in DEFAULT_PERFORMANCE_CONFIG
import { DEFAULT_CACHE_CONFIG as _DEFAULT_CACHE_CONFIG } from './workbookCache'
import { DEFAULT_CONCURRENCY_CONFIG as _DEFAULT_CONCURRENCY_CONFIG } from './concurrency'
import { DEFAULT_READER_FLAGS as _DEFAULT_READER_FLAGS } from './workbookReader'
import { DEFAULT_PARSER_CONFIG as _DEFAULT_PARSER_CONFIG } from './workbookParser'

// ============================================================================
// WORKBOOK CACHING
// ============================================================================

export {
  // Types
  type WorkbookCacheEntry,
  type WorkbookCache,
  type CacheStats,
  type WorkbookCacheConfig,
  
  // Configuration
  DEFAULT_CACHE_CONFIG,
  
  // Hash computation
  computeBufferHash,
  computeFileHash,
  
  // Implementation
  InMemoryWorkbookCache,
  
  // Global instance
  getGlobalWorkbookCache,
  resetGlobalWorkbookCache
} from './workbookCache'

// ============================================================================
// CONCURRENCY CONTROL
// ============================================================================

export {
  // Types
  type ConcurrencyConfig,
  type TaskResult,
  
  // Configuration
  DEFAULT_CONCURRENCY_CONFIG,
  
  // Core functions
  runWithConcurrencyLimit,
  runWithConcurrencyLimitSettled,
  processBatches,
  
  // Timing utilities
  withTiming,
  runWithTimingAndConcurrency
} from './concurrency'

// ============================================================================
// WORKBOOK READING
// ============================================================================

export {
  // Types
  type RawSheet,
  type WorkbookReader,
  type WorkbookMetadata,
  type WorkbookReaderConfig,
  type ReaderFeatureFlags,
  
  // Configuration
  DEFAULT_READER_CONFIG,
  DEFAULT_READER_FLAGS,
  
  // Implementations
  StandardWorkbookReader,
  StreamingWorkbookReader,
  
  // Factory
  createWorkbookReader,
  createWorkbookReaderFromFile,
  
  // Utilities
  collectAllSheets,
  toNormalizedWorkbook
} from './workbookReader'

// ============================================================================
// WORKBOOK PARSING
// ============================================================================

export {
  // Types
  type ParseResult,
  type WorkbookParser,
  type WorkbookParserConfig,
  type WorkerParseRequest,
  type WorkerParseResponse,
  type ParserEnvironment,
  
  // Configuration
  DEFAULT_PARSER_CONFIG,
  
  // Implementations
  MainThreadWorkbookParser,
  WorkerWorkbookParser,
  
  // Environment detection
  detectEnvironment,
  
  // Factory
  createWorkbookParser,
  createDefaultParser,
  
  // Global instance
  getGlobalParser,
  setGlobalParser,
  resetGlobalParser
} from './workbookParser'

// ============================================================================
// INGESTION METRICS
// ============================================================================

export {
  // Types
  type FileIngestionMetrics,
  type IngestionMetrics,
  type ParallelizationMetrics,
  type PerformanceStage,
  type StageTimer,
  
  // Collector
  MetricsCollector,
  FileMetricsBuilder,
  
  // Formatting
  formatBytes,
  formatMs,
  formatIngestionMetrics,
  getMetricsSummary,
  
  // Global instance
  getGlobalMetricsCollector,
  resetGlobalMetricsCollector,
  createMetricsCollector
} from './ingestionMetrics'

// ============================================================================
// CONVENIENCE TYPES
// ============================================================================

/**
 * Combined configuration for all performance features.
 */
export type PerformanceConfig = {
  /** Workbook caching configuration */
  cache: import('./workbookCache').WorkbookCacheConfig
  /** Concurrency configuration */
  concurrency: import('./concurrency').ConcurrencyConfig
  /** Reader feature flags */
  reader: import('./workbookReader').ReaderFeatureFlags
  /** Parser configuration */
  parser: import('./workbookParser').WorkbookParserConfig
}

/**
 * Default configuration for all performance features.
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  cache: { ..._DEFAULT_CACHE_CONFIG },
  concurrency: { ..._DEFAULT_CONCURRENCY_CONFIG },
  reader: { ..._DEFAULT_READER_FLAGS },
  parser: { ..._DEFAULT_PARSER_CONFIG }
}

// ============================================================================
// PARALLEL INGESTION
// ============================================================================

export {
  // Types
  type ParallelIngestionConfig,
  type IngestionProgress,
  type FileIngestionResult,
  type ParallelIngestionResult,
  
  // Configuration
  DEFAULT_PARALLEL_INGESTION_CONFIG,
  
  // Core function
  ingestFilesInParallel,
  
  // Utilities
  loadWorkbookCached,
  parseFilesSuccessful,
  parseFilesWithCallback,
  preloadFilesToCache
} from './parallelIngestion'
