// Ingestion Coordinator V2 - Helpers
// Utility functions for ingestion operations

import type { IngestionWarning } from '../../domain/core'
import type { FileIngestionResult } from '../ingestionTelemetry'

/**
 * Determine the overall data source from file sources
 */
export function determineDataSource(
  fileSources?: Record<string, 'Local' | 'MS365'>
): 'Local' | 'MS365' | undefined {
  if (fileSources === undefined) {
    return 'Local'
  }

  const sources = Object.values(fileSources)
  if (sources.length === 0) {
    return 'Local'
  }

  // If any file is from MS365, consider the whole batch as MS365
  if (sources.some(s => s === 'MS365')) {
    return 'MS365'
  }

  return 'Local'
}

/**
 * Find the file result that a warning belongs to
 */
export function findFileForWarning(
  fileResults: FileIngestionResult[],
  warning: IngestionWarning
): FileIngestionResult | undefined {
  // First try exact filename match
  const exactMatch = fileResults.find(r => r.fileName === warning.fileName)
  if (exactMatch) {
    return exactMatch
  }

  // Return first result as fallback
  return fileResults[0]
}
