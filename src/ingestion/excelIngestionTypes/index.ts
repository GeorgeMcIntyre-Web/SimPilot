// Excel Ingestion Types - Barrel Export
// Re-exports all types and functions from submodules

// Source location types
export type { SimulationSourceKind, SiteLocation } from './sourceLocation'

// Asset classification
export type { DetailedAssetKind } from './assetClassification'
export { mapDetailedKindToAssetKind, inferDetailedKind } from './assetClassification'

// Sourcing classification
export { inferSourcing } from './sourcing'

// Reuse allocation
export type { ReuseAllocationStatus } from './reuseAllocation'
export { inferReuseAllocation, isReuseTargetMatch } from './reuseAllocation'

// Workbook registry
export type { SourceWorkbookId, WorkbookConfig } from './workbookRegistry'
export { WORKBOOK_REGISTRY, getWorkbookConfig } from './workbookRegistry'

// Extended asset types
export type { ExcelIngestedAsset } from './extendedAsset'
export { toUnifiedAsset } from './extendedAsset'

// Raw row types
export type { RawRow, ParsedAssetRow } from './rawRow'
export { buildRawRowId, buildAssetKey } from './rawRow'
