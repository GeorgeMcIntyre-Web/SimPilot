// Ingestion Coordinator V2 - Barrel Export
// Re-exports all public API from submodules

// Types
export type { IngestFilesInputV2, IngestFilesResultV2 } from './types'

// Main ingestion functions
export { ingestFilesV2, scanFilesOnly, scanAndParseFiles } from './ingestFiles'

// Warning converters (for advanced use cases)
export { telemetryToLegacyWarning, legacyToTelemetryWarning } from './warningConverters'

// Diff builder (for advanced use cases)
export { buildDiffResultFromVersionComparison, deriveSourceType, buildVersionComparison } from './diffBuilder'

// Parser router (for advanced use cases)
export type { ParserResult } from './parserRouter'
export { routeToParser, mergeParserResult } from './parserRouter'

// Helpers
export { determineDataSource, findFileForWarning } from './helpers'

// File processor
export { processFileWithTelemetry } from './fileProcessor'
