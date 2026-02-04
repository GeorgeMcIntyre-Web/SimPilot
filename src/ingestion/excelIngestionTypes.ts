// Excel Ingestion Types
// Re-exports from modular structure for backwards compatibility
//
// This file has been refactored into smaller modules:
// - excelIngestionTypes/sourceLocation.ts - Simulation source & site location types
// - excelIngestionTypes/assetClassification.ts - Detailed asset kind classification
// - excelIngestionTypes/sourcing.ts - Equipment sourcing inference
// - excelIngestionTypes/reuseAllocation.ts - Reuse allocation tracking
// - excelIngestionTypes/workbookRegistry.ts - Workbook configuration registry
// - excelIngestionTypes/extendedAsset.ts - Extended asset types
// - excelIngestionTypes/rawRow.ts - Raw row types and key builders

export * from './excelIngestionTypes/index'
