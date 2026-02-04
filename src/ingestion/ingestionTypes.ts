/**
 * Ingestion Types
 * Public API types for the ingestion system
 */

import { IngestionWarning } from '../domain/core'
import { VersionComparisonResult } from './versionComparison'
import { DiffResult } from '../domain/uidTypes'

// Re-export IngestionWarning for convenience
export type { IngestionWarning } from '../domain/core'

/**
 * Input for the ingestion API.
 */
export interface IngestFilesInput {
    simulationFiles: File[]
    equipmentFiles: File[]
    fileSources?: Record<string, 'local' | 'remote'>
    dataSource?: 'Local' | 'MS365'
    previewOnly?: boolean  // If true, only return version comparison without applying data
}

/**
 * Result of ingestion operation.
 */
export interface IngestFilesResult {
    projectsCount: number
    areasCount: number
    cellsCount: number
    robotsCount: number
    toolsCount: number
    warnings: IngestionWarning[]
    versionComparison?: VersionComparisonResult
    diffResult?: DiffResult
    importRunId?: string
    linkStats?: {
        linkedCells: number
        totalCells: number
        orphanedAssets: number
    }
}
