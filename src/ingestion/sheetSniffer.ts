/**
 * Sheet Sniffer
 * Detects sheet category based on header content, not filename or sheet order.
 * Handles messy real-world data (typos, empty columns, "Introduction" sheets, etc.)
 *
 * This module re-exports from the extracted submodules for backwards compatibility.
 */

// ============================================================================
// RE-EXPORTS FROM EXTRACTED MODULES
// ============================================================================

// Types
export type {
    SheetCategory,
    SheetDetection,
    SheetScanResult,
    FileKind,
    ConfigAwareScanResult,
    EnhancedSheetDetection
} from './sheetSnifferTypes'

// Patterns and signatures
export {
    CATEGORY_SIGNATURES,
    CATEGORY_KEYWORDS,
    SKIP_SHEET_PATTERNS,
    shouldSkipSheet
} from './sheetSnifferPatterns'

// Scoring functions
export {
    normalizeText,
    containsKeyword,
    calculateCategoryScore,
    calculateSheetNameScore
} from './sheetSnifferScoring'

// Core detection functions
export {
    sniffSheet,
    scanWorkbook,
    scanNormalizedWorkbook,
    pickBestDetectionForCategory,
    findSheetForCategory,
    detectWorkbookCategory,
    categoryToFileKind,
    scanWorkbookWithConfig,
    explainScanResult,
    sniffSheetV2,
    analyzeSheetFields
} from './sheetSnifferCore'
