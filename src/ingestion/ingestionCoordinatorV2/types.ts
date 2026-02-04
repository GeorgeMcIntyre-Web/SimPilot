// Ingestion Coordinator V2 - Types
// Public API type definitions

import type { IngestionWarning } from '../../domain/core'
import type { IngestionStage, IngestionRunResult } from '../ingestionTelemetry'
import type { DiffResult } from '../../domain/uidTypes'

/**
 * Input for the enhanced ingestion API.
 */
export interface IngestFilesInputV2 {
  files: File[]
  fileSources?: Record<string, 'Local' | 'MS365'>
  stage?: IngestionStage
}

/**
 * Result of enhanced ingestion operation.
 */
export interface IngestFilesResultV2 {
  runResult: IngestionRunResult
  projectsCount: number
  areasCount: number
  cellsCount: number
  robotsCount: number
  toolsCount: number
  warnings: IngestionWarning[]
  diffResult?: DiffResult
}
