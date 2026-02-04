/**
 * Sheet Sniffer Types
 * Type definitions for sheet detection and classification
 */

// ============================================================================
// TYPES
// ============================================================================

export type SheetCategory =
    | 'SIMULATION_STATUS'
    | 'IN_HOUSE_TOOLING'
    | 'ASSEMBLIES_LIST'
    | 'ROBOT_SPECS'
    | 'REUSE_WELD_GUNS'
    | 'REUSE_RISERS'
    | 'REUSE_TIP_DRESSERS'
    | 'REUSE_ROBOTS'
    | 'GUN_FORCE'
    | 'METADATA'
    | 'UNKNOWN'

/**
 * Detection result for a single sheet.
 * Includes scoring details for debugging and confidence assessment.
 */
export interface SheetDetection {
    fileName: string
    sheetName: string
    category: SheetCategory
    score: number
    strongMatches: string[]
    weakMatches: string[]
    /** @deprecated Use strongMatches and weakMatches instead */
    matchedKeywords: string[]
    /** Number of rows in the sheet (for diagnostic purposes) */
    maxRow?: number
    /** Sheet name score bonus (for preferring well-named sheets) */
    nameScore?: number
}

export interface SheetScanResult {
    bestOverall: SheetDetection | null
    byCategory: Record<SheetCategory, SheetDetection | null>
    allDetections: SheetDetection[]
}

/**
 * Map SheetCategory to the internal FileKind used by ingestionCoordinator.
 * This bridges the sniffer with the existing parser routing.
 */
export type FileKind = 'SimulationStatus' | 'RobotList' | 'ToolList' | 'AssembliesList' | 'Metadata' | 'Unknown'

/**
 * Extended scan result with config-aware metadata
 */
export interface ConfigAwareScanResult extends SheetScanResult {
    appliedOverrides: { category: SheetCategory; sheetName: string }[]
    lowScoreWarning: boolean
    belowThreshold: boolean
    configUsed: boolean
}

/**
 * Enhanced sheet detection result using the new engine.
 */
export interface EnhancedSheetDetection extends SheetDetection {
    /** Sheet profile from the new engine */
    sheetProfile?: import('../excel').SheetProfile
    /** Field match results for detailed analysis */
    fieldMatches?: import('../excel').FieldMatchResult[]
    /** Category detected by field signatures */
    fieldBasedCategory?: SheetCategory
}
