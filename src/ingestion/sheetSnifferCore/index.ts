/**
 * Sheet Sniffer Core - Barrel Export
 * Re-exports all functions from submodules
 */

// Single sheet sniffing
export { sniffSheet } from './sniffSheet'

// Workbook scanning
export {
    scanWorkbook,
    pickBestDetectionForCategory,
    findSheetForCategory,
    detectWorkbookCategory
} from './scanWorkbook'

// NormalizedWorkbook scanning
export { scanNormalizedWorkbook } from './normalizedWorkbook'

// Helper functions
export { categoryToFileKind } from './helpers'

// Config-aware scanning
export { scanWorkbookWithConfig, explainScanResult } from './configAware'

// V2 Engine integration
export { sniffSheetV2, analyzeSheetFields } from './v2Engine'
