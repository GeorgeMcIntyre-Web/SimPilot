/**
 * Sheet Sniffer Core - Config-Aware Scanning
 * Workbook scanning with configuration support
 */

import * as XLSX from 'xlsx'
import { log } from '../../lib/log'
import type { SheetCategory, SheetDetection, ConfigAwareScanResult } from '../sheetSnifferTypes'
import { sniffSheet } from './sniffSheet'
import {
    SnifferConfig,
    getActiveConfig,
    getFileOverride,
    shouldSkipSheet as configShouldSkip,
    meetsScoreThreshold,
    isLowScore
} from '../snifferConfig'

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
