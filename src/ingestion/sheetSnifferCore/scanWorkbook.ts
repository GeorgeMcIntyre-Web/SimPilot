/**
 * Sheet Sniffer Core - Workbook Scanning
 * Functions for scanning entire workbooks
 */

import * as XLSX from 'xlsx'
import type { SheetCategory, SheetDetection, SheetScanResult } from '../sheetSnifferTypes'
import { sniffSheet } from './sniffSheet'

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
