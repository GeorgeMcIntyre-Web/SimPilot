/**
 * Sheet Sniffer Core - V2 Engine Integration
 * Schema-agnostic detection using the new field matching engine
 */

import type { SheetCategory, SheetDetection, EnhancedSheetDetection } from '../sheetSnifferTypes'
import { shouldSkipSheet } from '../sheetSnifferPatterns'
import { normalizeText, calculateCategoryScore } from '../sheetSnifferScoring'
import {
    profileSheet as profileSheetV2,
    matchAllColumns,
    detectCategoryByFields,
    type RawSheet,
    type SheetProfile,
    type FieldMatchResult
} from '../../excel'

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
