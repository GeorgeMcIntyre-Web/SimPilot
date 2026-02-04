// Ingestion Coordinator V2
// Re-exports from modular structure for backwards compatibility
//
// This file has been refactored into smaller modules:
// - ingestionCoordinatorV2/types.ts - Public API types
// - ingestionCoordinatorV2/warningConverters.ts - Warning conversion helpers
// - ingestionCoordinatorV2/diffBuilder.ts - DiffResult builder
// - ingestionCoordinatorV2/fileProcessor.ts - File processing
// - ingestionCoordinatorV2/parserRouter.ts - Parser routing
// - ingestionCoordinatorV2/helpers.ts - Utility functions
// - ingestionCoordinatorV2/ingestFiles.ts - Main ingestion API

export * from './ingestionCoordinatorV2/index'
