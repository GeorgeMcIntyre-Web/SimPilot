/**
 * Sheet Sniffer Core
 * Main detection logic for sheet classification
 */

import * as XLSX from 'xlsx'
import { sheetToMatrix, CellValue } from './excelUtils'
import { NormalizedWorkbook } from './workbookLoader'
import { log } from '../lib/log'
import {
    SheetCategory,
    SheetDetection,
    SheetScanResult,
    FileKind,
    ConfigAwareScanResult,
    EnhancedSheetDetection
} from './sheetSnifferTypes'
import { shouldSkipSheet } from './sheetSnifferPatterns'
import {
    normalizeText,
    calculateCategoryScore,
    calculateSheetNameScore
} from './sheetSnifferScoring'
import {
    SnifferConfig,
    getActiveConfig,
    getFileOverride,
    shouldSkipSheet as configShouldSkip,
    meetsScoreThreshold,
    isLowScore
} from './snifferConfig'
import {
    profileSheet as profileSheetV2,
    matchAllColumns,
    detectCategoryByFields,
    type RawSheet,
    type SheetProfile,
    type FieldMatchResult
} from '../excel'

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Sniff a single sheet to detect its category.
 *
 * Scans the first few rows (default: 10) looking for header keywords
 * that identify the sheet type.
 *
 * @param workbook - The Excel workbook (XLSX.WorkBook)
 * @param sheetName - Name of the sheet to sniff
 * @param fileName - Name of the source file
 * @param maxRowsToScan - Maximum rows to scan for headers (default: 10)
 * @returns SheetDetection with category, score, and matched keywords
 */
export function sniffSheet(
    workbook: XLSX.WorkBook,
    sheetName: string,
    fileName: string = 'unknown.xlsx',
    maxRowsToScan: number = 10
): SheetDetection {
    // Default result for unknown sheets
    const unknownResult: SheetDetection = {
        fileName,
        sheetName,
        category: 'UNKNOWN',
        score: 0,
        strongMatches: [],
        weakMatches: [],
        matchedKeywords: []
    }

    // Skip sheets that match skip patterns
    if (shouldSkipSheet(sheetName)) {
        return unknownResult
    }

    // Try to read the sheet
    let rows: CellValue[][]
    try {
        rows = sheetToMatrix(workbook, sheetName, maxRowsToScan)
    } catch {
        // Sheet is empty or invalid
        return unknownResult
    }

    if (rows.length === 0) {
        return unknownResult
    }

    // Flatten all rows to a single searchable text array
    const allRowText: string[] = []
    for (const row of rows) {
        if (row === null || row === undefined) {
            continue
        }

        for (const cell of row) {
            const normalized = normalizeText(cell as string)
            if (normalized.length > 0) {
                allRowText.push(normalized)
            }
        }
    }

    if (allRowText.length === 0) {
        return unknownResult
    }

    // Get sheet dimensions for row count guard
    const sheet = workbook.Sheets[sheetName]
    const range = sheet ? (sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null) : null
    const maxRow = range ? range.e.r + 1 : rows.length

    // Score each category
    let bestCategory: SheetCategory = 'UNKNOWN'
    let bestScore = 0
    let bestStrongMatches: string[] = []
    let bestWeakMatches: string[] = []

    const categories: Array<Exclude<SheetCategory, 'UNKNOWN'>> = [
        'SIMULATION_STATUS',
        'IN_HOUSE_TOOLING',
        'ASSEMBLIES_LIST',
        'ROBOT_SPECS',
        'REUSE_WELD_GUNS',
        'REUSE_RISERS',
        'REUSE_TIP_DRESSERS',
        'REUSE_ROBOTS',
        'GUN_FORCE',
        'METADATA'
    ]

    for (const category of categories) {
        const { score, strongMatches, weakMatches } = calculateCategoryScore(allRowText, category)

        // Minimum score of 5 required (1 strong OR 5 weak)
        if (score < 5) {
            continue
        }

        // ROW COUNT GUARD: Sheets with < 25 rows are likely templates/summaries
        // Only allow if they have strong matches AND good header confidence
        if (maxRow < 25 && strongMatches.length === 0) {
            continue
        }

        // Check if this category beats the current best
        if (score > bestScore) {
            bestCategory = category
            bestScore = score
            bestStrongMatches = strongMatches
            bestWeakMatches = weakMatches
            continue
        }

        // Tie-breaker: prefer more strong matches
        if (score === bestScore && strongMatches.length > bestStrongMatches.length) {
            bestCategory = category
            bestScore = score
            bestStrongMatches = strongMatches
            bestWeakMatches = weakMatches
        }
    }

    // Calculate sheet name score bonus
    const nameScore = calculateSheetNameScore(sheetName, bestCategory)

    return {
        fileName,
        sheetName,
        category: bestCategory,
        score: bestScore + nameScore,
        strongMatches: bestStrongMatches,
        weakMatches: bestWeakMatches,
        matchedKeywords: [...bestStrongMatches, ...bestWeakMatches],
        maxRow,
        nameScore
    }
}

/**
 * Scan an entire workbook to detect the best sheet for each category.
 *
 * Returns:
 * - bestOverall: The single best detection across all sheets
 * - byCategory: Best detection for each category (useful for multi-file ingestion)
 * - allDetections: All non-UNKNOWN detections (for debugging/inspection)
 *
 * @param workbook - The Excel workbook to scan (XLSX.WorkBook)
 * @param fileName - Name of the source file
 * @param maxRowsToScan - Maximum rows to scan per sheet (default: 10)
 * @returns SheetScanResult with best detections
 */
export function scanWorkbook(
    workbook: XLSX.WorkBook,
    fileName: string = 'unknown.xlsx',
    maxRowsToScan: number = 10
): SheetScanResult {
    const allDetections: SheetDetection[] = []

    // Initialize byCategory with nulls
    const byCategory: Record<SheetCategory, SheetDetection | null> = {
        SIMULATION_STATUS: null,
        IN_HOUSE_TOOLING: null,
        ASSEMBLIES_LIST: null,
        ROBOT_SPECS: null,
        REUSE_WELD_GUNS: null,
        REUSE_RISERS: null,
        REUSE_TIP_DRESSERS: null,
        REUSE_ROBOTS: null,
        GUN_FORCE: null,
        METADATA: null,
        UNKNOWN: null
    }

    let bestOverall: SheetDetection | null = null

    // Scan each sheet
    for (const sheetName of workbook.SheetNames) {
        const detection = sniffSheet(workbook, sheetName, fileName, maxRowsToScan)

        // Skip UNKNOWN detections for best tracking
        if (detection.category === 'UNKNOWN') {
            continue
        }


        allDetections.push(detection)

        // Update best for this category
        const currentBest = byCategory[detection.category]
        if (currentBest === null || detection.score > currentBest.score) {
            byCategory[detection.category] = detection
        }

        // Update best overall
        if (bestOverall === null || detection.score > bestOverall.score) {
            bestOverall = detection
        }
    }

    return {
        bestOverall,
        byCategory,
        allDetections
    }
}

/**
 * Scan a NormalizedWorkbook to get SheetDetection array.
 *
 * This version works with the new NormalizedWorkbook type from workbookLoader.
 *
 * @param workbook - The normalized workbook
 * @param maxRowsToScan - Maximum rows to scan per sheet (default: 10)
 * @returns Array of SheetDetection for all detected sheets
 */
export function scanNormalizedWorkbook(
    workbook: NormalizedWorkbook,
    maxRowsToScan: number = 10
): SheetDetection[] {
    const allDetections: SheetDetection[] = []

    for (const sheet of workbook.sheets) {
        // Skip sheets that match skip patterns
        if (shouldSkipSheet(sheet.sheetName)) {
            continue
        }

        // Flatten all rows to a single searchable text array
        const allRowText: string[] = []
        const scanLimit = Math.min(maxRowsToScan, sheet.rows.length)

        for (let i = 0; i < scanLimit; i++) {
            const row = sheet.rows[i]

            if (!row) {
                continue
            }

            for (const cell of row) {
                const normalized = normalizeText(cell as string)
                if (normalized.length > 0) {
                    allRowText.push(normalized)
                }
            }
        }

        if (allRowText.length === 0) {
            continue
        }

        // Score each category
        let bestCategory: SheetCategory = 'UNKNOWN'
        let bestScore = 0
        let bestStrongMatches: string[] = []
        let bestWeakMatches: string[] = []

        const categories: Array<Exclude<SheetCategory, 'UNKNOWN'>> = [
            'SIMULATION_STATUS',
            'IN_HOUSE_TOOLING',
            'ROBOT_SPECS',
            'REUSE_WELD_GUNS',
            'GUN_FORCE',
            'REUSE_RISERS',
            'METADATA'
        ]

        for (const category of categories) {
            const { score, strongMatches, weakMatches } = calculateCategoryScore(allRowText, category)

            // Minimum score of 5 required
            if (score < 5) {
                continue
            }

            // Check if this category beats the current best
            if (score > bestScore) {
                bestCategory = category
                bestScore = score
                bestStrongMatches = strongMatches
                bestWeakMatches = weakMatches
                continue
            }

            // Tie-breaker: prefer more strong matches
            if (score === bestScore && strongMatches.length > bestStrongMatches.length) {
                bestCategory = category
                bestScore = score
                bestStrongMatches = strongMatches
                bestWeakMatches = weakMatches
            }
        }

        // Only include non-UNKNOWN detections
        if (bestCategory !== 'UNKNOWN') {
            allDetections.push({
                fileName: workbook.fileName,
                sheetName: sheet.sheetName,
                category: bestCategory,
                score: bestScore,
                strongMatches: bestStrongMatches,
                weakMatches: bestWeakMatches,
                matchedKeywords: [...bestStrongMatches, ...bestWeakMatches]
            })
        }
    }

    return allDetections
}

/**
 * Pick the best detection for a specific category from a list of detections.
 *
 * @param detections - Array of SheetDetection
 * @param category - The category to find
 * @returns Best SheetDetection for that category, or null
 */
export function pickBestDetectionForCategory(
    detections: SheetDetection[],
    category: SheetCategory
): SheetDetection | null {
    let best: SheetDetection | null = null

    for (const detection of detections) {
        if (detection.category !== category) {
            continue
        }

        if (best === null) {
            best = detection
            continue
        }

        // Higher score wins
        if (detection.score > best.score) {
            best = detection
            continue
        }

        // Tie-breaker: more strong matches
        if (detection.score === best.score && detection.strongMatches.length > best.strongMatches.length) {
            best = detection
        }
    }

    return best
}

/**
 * Get the best sheet name for a specific category in a workbook.
 *
 * Convenience function that returns just the sheet name (or null).
 *
 * @param workbook - The Excel workbook
 * @param category - The category to find
 * @returns Sheet name if found, null otherwise
 */
export function findSheetForCategory(
    workbook: XLSX.WorkBook,
    category: Exclude<SheetCategory, 'UNKNOWN'>
): string | null {
    const result = scanWorkbook(workbook)
    const detection = result.byCategory[category]

    if (detection === null) {
        return null
    }

    return detection.sheetName
}

/**
 * Detect the primary category of a workbook based on its best sheet.
 *
 * Useful for routing workbooks to appropriate parsers.
 *
 * @param workbook - The Excel workbook
 * @returns The primary category or 'UNKNOWN'
 */
export function detectWorkbookCategory(workbook: XLSX.WorkBook): SheetCategory {
    const result = scanWorkbook(workbook)

    if (result.bestOverall === null) {
        return 'UNKNOWN'
    }

    return result.bestOverall.category
}

/**
 * Map SheetCategory to the internal FileKind used by ingestionCoordinator.
 */
export function categoryToFileKind(category: SheetCategory): FileKind {
    switch (category) {
        case 'SIMULATION_STATUS':
            return 'SimulationStatus'
        case 'IN_HOUSE_TOOLING':
            return 'ToolList'
        case 'ASSEMBLIES_LIST':
            return 'AssembliesList'
        case 'ROBOT_SPECS':
            return 'RobotList'
        case 'REUSE_WELD_GUNS':
            return 'ToolList'
        case 'REUSE_RISERS':
            return 'ToolList'
        case 'REUSE_TIP_DRESSERS':
            return 'ToolList'
        case 'REUSE_ROBOTS':
            return 'RobotList'
        case 'GUN_FORCE':
            return 'ToolList'
        case 'METADATA':
            return 'Metadata'
        case 'UNKNOWN':
            return 'Unknown'
    }
}

// ============================================================================
// CONFIG-AWARE SCANNING (V2)
// ============================================================================

/**
 * Scan a workbook with configuration support.
 *
 * This version:
 * - Applies per-file overrides
 * - Respects score thresholds
 * - Skips configured sheets
 * - Provides richer diagnostics
 */
export function scanWorkbookWithConfig(
    workbook: XLSX.WorkBook,
    fileName: string,
    config?: SnifferConfig,
    maxRowsToScan: number = 10
): ConfigAwareScanResult {
    const activeConfig = config ?? getActiveConfig()
    const appliedOverrides: { category: SheetCategory; sheetName: string }[] = []

    // First, do a normal scan
    const allDetections: SheetDetection[] = []
    const byCategory: Record<SheetCategory, SheetDetection | null> = {
        SIMULATION_STATUS: null,
        IN_HOUSE_TOOLING: null,
        ASSEMBLIES_LIST: null,
        ROBOT_SPECS: null,
        REUSE_WELD_GUNS: null,
        REUSE_RISERS: null,
        REUSE_TIP_DRESSERS: null,
        REUSE_ROBOTS: null,
        GUN_FORCE: null,
        METADATA: null,
        UNKNOWN: null
    }

    let bestOverall: SheetDetection | null = null

    for (const sheetName of workbook.SheetNames) {
        // Check if sheet should be skipped via config
        if (configShouldSkip(activeConfig, fileName, sheetName)) {
            continue
        }

        const detection = sniffSheet(workbook, sheetName, fileName, maxRowsToScan)

        if (detection.category === 'UNKNOWN') {
            continue
        }

        allDetections.push(detection)

        const currentBest = byCategory[detection.category]
        if (currentBest === null || detection.score > currentBest.score) {
            byCategory[detection.category] = detection
        }

        if (bestOverall === null || detection.score > bestOverall.score) {
            bestOverall = detection
        }
    }

    // Apply file-specific overrides
    const categories: Array<Exclude<SheetCategory, 'UNKNOWN'>> = [
        'SIMULATION_STATUS',
        'IN_HOUSE_TOOLING',
        'ROBOT_SPECS',
        'REUSE_WELD_GUNS',
        'REUSE_RISERS',
        'REUSE_TIP_DRESSERS',
        'REUSE_ROBOTS',
        'GUN_FORCE',
        'METADATA'
    ]

    for (const category of categories) {
        const override = getFileOverride(activeConfig, fileName, category)

        if (override === null) {
            continue
        }

        // Validate override sheet exists
        if (workbook.SheetNames.includes(override) === false) {
            log.warn(`[Sniffer] Override sheet "${override}" not found in ${fileName}`)
            continue
        }

        // Create/update detection for this category with override
        const overrideDetection: SheetDetection = {
            fileName,
            sheetName: override,
            category,
            score: 100, // Override always wins
            strongMatches: ['[OVERRIDE]'],
            weakMatches: [],
            matchedKeywords: ['[OVERRIDE]']
        }

        byCategory[category] = overrideDetection
        appliedOverrides.push({ category, sheetName: override })

        // Update best overall if this is the primary category
        if (bestOverall === null || overrideDetection.score > bestOverall.score) {
            bestOverall = overrideDetection
        }
    }

    // Check score thresholds
    const belowThreshold = bestOverall !== null &&
        meetsScoreThreshold(activeConfig, bestOverall.score) === false &&
        appliedOverrides.length === 0

    const lowScoreWarning = bestOverall !== null &&
        isLowScore(activeConfig, bestOverall.score) &&
        appliedOverrides.length === 0

    // If below threshold and no overrides, treat as UNKNOWN
    if (belowThreshold) {
        bestOverall = null
    }

    return {
        bestOverall,
        byCategory,
        allDetections,
        appliedOverrides,
        lowScoreWarning,
        belowThreshold,
        configUsed: appliedOverrides.length > 0
    }
}

/**
 * Get a human-readable explanation of the scan result
 */
export function explainScanResult(result: ConfigAwareScanResult, fileName: string): string {
    const lines: string[] = []

    lines.push(`File: ${fileName}`)
    lines.push(`Sheets analyzed: ${result.allDetections.length}`)

    if (result.bestOverall === null) {
        lines.push('Result: UNKNOWN (no category matched)')

        if (result.belowThreshold) {
            lines.push('Reason: Best score was below minimum threshold')
        }

        return lines.join('\n')
    }

    lines.push(`Best match: ${result.bestOverall.category}`)
    lines.push(`Sheet: ${result.bestOverall.sheetName}`)
    lines.push(`Score: ${result.bestOverall.score}`)
    lines.push(`Strong: ${result.bestOverall.strongMatches.join(', ')}`)
    lines.push(`Weak: ${result.bestOverall.weakMatches.join(', ')}`)

    if (result.appliedOverrides.length > 0) {
        lines.push('Overrides applied:')
        for (const override of result.appliedOverrides) {
            lines.push(`  - ${override.category} → ${override.sheetName}`)
        }
    }

    if (result.lowScoreWarning) {
        lines.push('⚠️ Low confidence match - consider adding an override')
    }

    return lines.join('\n')
}

// ============================================================================
// NEW ENGINE INTEGRATION (V2)
// ============================================================================

/**
 * Sniff a single sheet using the new schema-agnostic engine.
 * This provides enhanced detection based on field matching rather than keyword scanning.
 *
 * @param rows - Sheet data as a 2D array
 * @param sheetName - Name of the sheet
 * @param fileName - Name of the source file
 * @param workbookId - Optional workbook ID for tracking
 * @returns Enhanced detection result with field-based analysis
 */
export function sniffSheetV2(
    rows: unknown[][],
    sheetName: string,
    fileName: string = 'unknown.xlsx',
    workbookId: string = 'inline'
): EnhancedSheetDetection {
    // Check if sheet should be skipped
    if (shouldSkipSheet(sheetName)) {
        return {
            fileName,
            sheetName,
            category: 'UNKNOWN',
            score: 0,
            strongMatches: [],
            weakMatches: [],
            matchedKeywords: []
        }
    }

    // Profile the sheet using new engine
    const rawSheet: RawSheet = {
        sheetName,
        rows
    }

    const profile = profileSheetV2(rawSheet, workbookId, 0)
    const matchResults = matchAllColumns(profile)

    // Detect category using field signatures
    const fieldBasedCategory = detectCategoryByFields(matchResults)

    // Also run legacy detection for comparison
    const legacyResult = sniffSheetFromRows(rows, sheetName, fileName)

    // Combine results - prefer field-based if it found something
    const category = fieldBasedCategory !== 'UNKNOWN' ? fieldBasedCategory : legacyResult.category

    // Calculate enhanced score
    const matchedFieldCount = matchResults.filter(r => r.bestMatch !== undefined).length
    const avgMatchScore = matchedFieldCount > 0
        ? matchResults
            .filter(r => r.bestMatch !== undefined)
            .reduce((sum, r) => sum + (r.bestMatch?.score ?? 0), 0) / matchedFieldCount
        : 0

    const enhancedScore = Math.max(legacyResult.score, Math.round(avgMatchScore))

    return {
        fileName,
        sheetName,
        category,
        score: enhancedScore,
        strongMatches: legacyResult.strongMatches,
        weakMatches: legacyResult.weakMatches,
        matchedKeywords: legacyResult.matchedKeywords,
        sheetProfile: profile,
        fieldMatches: matchResults,
        fieldBasedCategory
    }
}

/**
 * Sniff sheet from raw rows (helper for V2 functions).
 * Uses the legacy detection on row data.
 */
function sniffSheetFromRows(
    rows: unknown[][],
    sheetName: string,
    fileName: string
): SheetDetection {
    // Flatten first few rows for keyword scanning
    const allRowText: string[] = []
    const maxRows = Math.min(10, rows.length)

    for (let i = 0; i < maxRows; i++) {
        const row = rows[i]

        if (row === null || row === undefined) {
            continue
        }

        for (const cell of row) {
            const normalized = normalizeText(cell as string)
            if (normalized.length > 0) {
                allRowText.push(normalized)
            }
        }
    }

    if (allRowText.length === 0) {
        return {
            fileName,
            sheetName,
            category: 'UNKNOWN',
            score: 0,
            strongMatches: [],
            weakMatches: [],
            matchedKeywords: []
        }
    }

    // Score each category
    let bestCategory: SheetCategory = 'UNKNOWN'
    let bestScore = 0
    let bestStrongMatches: string[] = []
    let bestWeakMatches: string[] = []

    const categories: Array<Exclude<SheetCategory, 'UNKNOWN'>> = [
        'SIMULATION_STATUS',
        'IN_HOUSE_TOOLING',
        'ROBOT_SPECS',
        'REUSE_WELD_GUNS',
        'REUSE_RISERS',
        'REUSE_TIP_DRESSERS',
        'REUSE_ROBOTS',
        'GUN_FORCE',
        'METADATA'
    ]

    for (const category of categories) {
        const { score, strongMatches, weakMatches } = calculateCategoryScore(allRowText, category)

        if (score < 5) {
            continue
        }

        if (score > bestScore) {
            bestCategory = category
            bestScore = score
            bestStrongMatches = strongMatches
            bestWeakMatches = weakMatches
        }
    }

    return {
        fileName,
        sheetName,
        category: bestCategory,
        score: bestScore,
        strongMatches: bestStrongMatches,
        weakMatches: bestWeakMatches,
        matchedKeywords: [...bestStrongMatches, ...bestWeakMatches]
    }
}

/**
 * Get detailed field analysis for a sheet.
 * Use this when you need to understand which fields were matched.
 *
 * @param rows - Sheet data as a 2D array
 * @param sheetName - Name of the sheet
 * @param workbookId - Optional workbook ID
 * @returns Object containing profile and match results
 */
export function analyzeSheetFields(
    rows: unknown[][],
    sheetName: string,
    workbookId: string = 'inline'
): {
    profile: SheetProfile
    matchResults: FieldMatchResult[]
    detectedCategory: SheetCategory
} {
    const rawSheet: RawSheet = {
        sheetName,
        rows
    }

    const profile = profileSheetV2(rawSheet, workbookId, 0)
    const matchResults = matchAllColumns(profile)
    const detectedCategory = detectCategoryByFields(matchResults)

    return { profile, matchResults, detectedCategory }
}
