/**
 * Sheet Sniffer Core - Normalized Workbook Scanning
 * Functions for scanning NormalizedWorkbook structures
 */

import type { NormalizedWorkbook } from '../workbookLoader'
import type { SheetCategory, SheetDetection } from '../sheetSnifferTypes'
import { shouldSkipSheet } from '../sheetSnifferPatterns'
import { normalizeText, calculateCategoryScore } from '../sheetSnifferScoring'

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
