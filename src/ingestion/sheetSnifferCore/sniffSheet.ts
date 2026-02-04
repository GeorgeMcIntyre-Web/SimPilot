/**
 * Sheet Sniffer Core - Single Sheet Detection
 * Main detection logic for sniffing a single sheet's category
 */

import * as XLSX from 'xlsx'
import { sheetToMatrix, CellValue } from '../excelUtils'
import type { SheetCategory, SheetDetection } from '../sheetSnifferTypes'
import { shouldSkipSheet } from '../sheetSnifferPatterns'
import { normalizeText, calculateCategoryScore, calculateSheetNameScore } from '../sheetSnifferScoring'

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
