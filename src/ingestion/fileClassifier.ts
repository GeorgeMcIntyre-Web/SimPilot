/**
 * File Classifier
 * Detects file types and best sheets using the Sheet Sniffer
 */

import * as XLSX from 'xlsx'
import {
    scanWorkbook,
    SheetDetection,
    SheetCategory,
    categoryToFileKind,
    FileKind,
    pickBestDetectionForCategory
} from './sheetSniffer'

/**
 * Detect file type and best sheet using the Sheet Sniffer.
 * Returns the FileKind and the best sheet name for that kind.
 */
export function detectFileTypeAndSheet(
    workbook: XLSX.WorkBook,
    fileName: string
): { kind: FileKind; sheetName: string | null; detection: SheetDetection | null } {
    // Scan all sheets in the workbook
    const scanResult = scanWorkbook(workbook, fileName)

    // If no sheets detected, fall back to filename-based detection
    if (scanResult.bestOverall === null) {
        const fallbackKind = detectFileTypeFromFilename(fileName)
        return { kind: fallbackKind, sheetName: workbook.SheetNames[0] || null, detection: null }
    }

    // Convert category to FileKind
    const kind = categoryToFileKind(scanResult.bestOverall.category)
    return {
        kind,
        sheetName: scanResult.bestOverall.sheetName,
        detection: scanResult.bestOverall
    }
}

/**
 * Fallback file type detection from filename (when header sniffing fails)
 */
export function detectFileTypeFromFilename(fileName: string): FileKind {
    const name = fileName.toLowerCase()

    if (name.includes('simulation') && name.includes('status')) {
        return 'SimulationStatus'
    }

    if (name.includes('assemblies') && name.includes('list')) {
        return 'AssembliesList'
    }

    if (name.includes('robot') && name.includes('list')) {
        return 'RobotList'
    }

    if (name.includes('wg') || name.includes('weld') || name.includes('gun')) {
        return 'ToolList'
    }

    if (name.includes('tool') || name.includes('equipment')) {
        return 'ToolList'
    }

    if (name.includes('riser') || name.includes('raiser')) {
        return 'ToolList'
    }

    return 'Unknown'
}

/**
 * Get all detected sheets for a workbook, grouped by category.
 *
 * This enables processing multiple sheet types from a single workbook.
 */
export function getAllDetectedSheets(
    workbook: XLSX.WorkBook,
    fileName: string
): Map<SheetCategory, SheetDetection> {
    const scanResult = scanWorkbook(workbook, fileName)
    const result = new Map<SheetCategory, SheetDetection>()

    // Pick the best detection for each category
    const categories: SheetCategory[] = [
        'SIMULATION_STATUS',
        'IN_HOUSE_TOOLING',
        'ASSEMBLIES_LIST',
        'ROBOT_SPECS',
        'REUSE_WELD_GUNS',
        'GUN_FORCE',
        'REUSE_RISERS',
        'METADATA'
    ]

    for (const category of categories) {
        const best = pickBestDetectionForCategory(scanResult.allDetections, category)

        if (best === null) {
            continue
        }

        result.set(category, best)
    }

    return result
}
