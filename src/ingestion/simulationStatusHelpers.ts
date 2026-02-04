/**
 * Simulation Status Helpers
 * Helper functions for simulation status parsing
 */

import * as XLSX from 'xlsx'
import { getWeek } from 'date-fns'
import {
    SchedulePhase,
    ScheduleStatus,
    OverviewScheduleMetrics,
    IngestionWarning
} from '../domain/core'
import { CellValue } from './excelUtils'
import { deriveCustomerFromFileName } from './customerMapping'
import {
    SimulationMetric,
    VacuumParsedRow,
    ParsedSimulationRow,
    SimulationRobot,
    SIMULATION_SHEET_PRIORITY
} from './simulationStatusParserTypes'

// ============================================================================
// OVERVIEW SCHEDULE PARSING
// ============================================================================

/**
 * Extracts high-level schedule metrics from the OVERVIEW sheet.
 * The sheet stores labels (e.g., "Current Week") with their values in the next cell.
 */
export function parseOverviewSchedule(workbook: XLSX.WorkBook): OverviewScheduleMetrics | undefined {
    const sheet = workbook.Sheets['OVERVIEW']
    if (!sheet) return undefined

    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: true, defval: '' })

    const lookup = (label: string): number | undefined => {
        for (const row of rows) {
            const idx = row.findIndex(cell => typeof cell === 'string' && cell.trim() === label)
            if (idx >= 0) {
                const val = row[idx + 1]
                const num = typeof val === 'number' ? val : Number(val)
                return Number.isFinite(num) ? num : undefined
            }
        }
        return undefined
    }

    const metrics: OverviewScheduleMetrics = {
        currentWeek: lookup('Current Week'),
        currentJobDuration: lookup('Current Job Duration'),
        jobStartWeek: lookup('Job Start'),
        jobEndWeek: lookup('Job End'),
        completeJobDuration: lookup('Complete Job Duration'),
        firstStageSimComplete: lookup('1st Stage Sim Complete'),
        firstStageSimDuration: lookup('1st Stage Sim Duration'),
        firstStageSimPerWeek: lookup('% 1st Stage Sim Complete per week'),
        firstStageSimRequired: lookup('% 1st Stage Sim Complete Required'),
        vcStartWeek: lookup('VC Start'),
        jobDurationToVcStart: lookup('Job Duration till VC Start'),
        vcReadyPerWeek: lookup('% VC Ready per week'),
        vcReadyRequired: lookup('VC Ready Required'),
        finalDeliverablesEndWeek: lookup('Final Deliverables Complete  End'),
        finalDeliverablesDuration: lookup('Final Deliverables Job Duration'),
        finalDeliverablesPerWeek: lookup('% Final Deliverables Complete per week'),
        finalDeliverablesRequired: lookup('Final Deliverables Complete Required')
    }

    // Recalculate dynamic fields that depend on current date to avoid stale cached Excel values
    const computedCurrentWeek = getWeek(new Date(), { weekStartsOn: 0 })
    metrics.currentWeek = computedCurrentWeek

    // Preserve raw duration before recomputing so we can clamp sensibly
    const rawCurrentJobDuration = metrics.currentJobDuration

    if (metrics.jobStartWeek !== undefined && metrics.currentWeek !== undefined) {
        metrics.currentJobDuration = metrics.currentWeek - metrics.jobStartWeek
    }

    // Choose a non-negative duration: prefer recomputed, otherwise raw, clamped at 0
    const effectiveDuration = Math.max(
        metrics.currentJobDuration ?? Number.NEGATIVE_INFINITY,
        rawCurrentJobDuration ?? Number.NEGATIVE_INFINITY,
        0
    )
    metrics.currentJobDuration = effectiveDuration

    // Recompute required percentages based on the effective duration (allows 0 → 0%)
    const d = effectiveDuration
    if (d >= 0) {
        if (metrics.firstStageSimDuration && metrics.firstStageSimDuration > 0) {
            metrics.firstStageSimRequired = d / metrics.firstStageSimDuration
        }
        if (metrics.jobDurationToVcStart && metrics.jobDurationToVcStart > 0) {
            metrics.vcReadyRequired = d / metrics.jobDurationToVcStart
        }
        if (metrics.finalDeliverablesDuration && metrics.finalDeliverablesDuration > 0) {
            metrics.finalDeliverablesRequired = d / metrics.finalDeliverablesDuration
        }
    }

    // If nothing was found, return undefined to avoid misleading defaults
    const hasValue = Object.values(metrics).some(v => v !== undefined)
    return hasValue ? metrics : undefined
}

// ============================================================================
// SCHEDULE DERIVATION
// ============================================================================

/**
 * Derive schedule phase from percent complete.
 * Simple heuristic to spread cards across the phase swimlanes.
 */
export function derivePhase(percentComplete: number | null): SchedulePhase {
    if (percentComplete === null || Number.isNaN(percentComplete)) return 'unspecified'
    if (percentComplete >= 95) return 'handover'
    if (percentComplete >= 75) return 'rampup'
    if (percentComplete >= 50) return 'onsite'
    if (percentComplete >= 20) return 'offline'
    return 'presim'
}

/**
 * Derive onTrack/atRisk/late based on how far actual progress is
 * ahead/behind the linear expectation for the current calendar week.
 *
 * Tuning:
 * - More than 15 points behind expected ⇒ late
 * - 5–15 points behind ⇒ atRisk
 * - Otherwise ⇒ onTrack
 */
export function deriveScheduleStatusFromWeeks(
    percentComplete: number | null,
    metrics: OverviewScheduleMetrics | undefined
): ScheduleStatus {
    if (percentComplete === null || metrics === undefined) return 'unknown'

    const { currentWeek, jobStartWeek, completeJobDuration } = metrics
    if (
        currentWeek === undefined ||
        jobStartWeek === undefined ||
        completeJobDuration === undefined ||
        completeJobDuration <= 0
    ) {
        return 'unknown'
    }

    const elapsedWeeks = Math.max(0, currentWeek - jobStartWeek)
    const expected = Math.min(100, (elapsedWeeks / completeJobDuration) * 100)
    const delta = percentComplete - expected

    if (delta <= -15) return 'late'
    if (delta <= -5) return 'atRisk'
    return 'onTrack'
}

// ============================================================================
// METRIC PARSING
// ============================================================================

/**
 * Parse a cell value into a percentage.
 * - Number 0-100 → percent = value
 * - String like "95%" → strip % and parse
 * - Otherwise → null
 */
export function parsePercent(value: CellValue): number | null {
    if (value === null || value === undefined) {
        return null
    }

    // Already a number
    if (typeof value === 'number') {
        // Assume values > 1 are percentages already
        if (value >= 0 && value <= 100) {
            return value
        }

        // If value is decimal like 0.95, convert to 95
        if (value >= 0 && value <= 1) {
            return Math.round(value * 100)
        }

        return null
    }

    // String parsing
    if (typeof value === 'string') {
        const trimmed = value.trim()

        if (trimmed === '') {
            return null
        }

        // Handle percentage strings like "95%" or "95 %"
        const percentMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*%?$/)

        if (percentMatch) {
            const num = parseFloat(percentMatch[1])

            if (!isNaN(num) && num >= 0 && num <= 100) {
                return Math.round(num)
            }
        }

        // Handle decimal strings like "0.95"
        const decimalMatch = trimmed.match(/^0\.(\d+)$/)

        if (decimalMatch) {
            const num = parseFloat(trimmed)

            if (!isNaN(num) && num >= 0 && num <= 1) {
                return Math.round(num * 100)
            }
        }
    }

    return null
}

/**
 * Create a SimulationMetric from a header and cell value.
 */
export function createMetric(label: string, rawValue: CellValue): SimulationMetric {
    const percent = parsePercent(rawValue)

    // Normalize rawValue to string | number | null (handle boolean case)
    let normalizedRawValue: string | number | null
    if (typeof rawValue === 'boolean') {
        normalizedRawValue = rawValue ? 'true' : 'false'
    } else {
        normalizedRawValue = rawValue
    }

    return {
        label,
        percent,
        rawValue: normalizedRawValue
    }
}

// ============================================================================
// SHEET DETECTION
// ============================================================================

/**
 * Find all simulation-related sheets in the workbook.
 * Returns sheets in priority order: SIMULATION, MRS_OLP, DOCUMENTATION, SAFETY_LAYOUT
 */
export function findAllSimulationSheets(workbook: XLSX.WorkBook): string[] {
    const sheetNames = workbook.SheetNames
    const found: string[] = []

    // Find sheets in priority order
    for (const priorityName of SIMULATION_SHEET_PRIORITY) {
        // Exact match
        if (sheetNames.includes(priorityName)) {
            found.push(priorityName)
            continue
        }

        // Case-insensitive match
        const match = sheetNames.find(name => name.toUpperCase() === priorityName.toUpperCase())
        if (match && !found.includes(match)) {
            found.push(match)
            continue
        }

        // Partial match for MRS_OLP (could be "MRS_OLP", "MRS OLP", etc.)
        if (priorityName === 'MRS_OLP') {
            const mrsMatch = sheetNames.find(name => {
                const upper = name.toUpperCase()
                return (upper.includes('MRS') && upper.includes('OLP')) || upper.includes('MULTI RESOURCE')
            })
            if (mrsMatch && !found.includes(mrsMatch)) {
                found.push(mrsMatch)
                continue
            }
        }

        // Partial match for SAFETY_LAYOUT
        if (priorityName === 'SAFETY_LAYOUT') {
            const safetyMatch = sheetNames.find(name => {
                const upper = name.toUpperCase()
                return (upper.includes('SAFETY') && upper.includes('LAYOUT')) ||
                    (upper.includes('SAFETY') && upper.includes('&'))
            })
            if (safetyMatch && !found.includes(safetyMatch)) {
                found.push(safetyMatch)
                continue
            }
        }
    }

    // Fallback: look for any sheet with "SIMULATION" or "STATUS" in the name
    if (found.length === 0) {
        // Try "SIMULATION" first
        let partial = sheetNames.find(name => name.toUpperCase().includes('SIMULATION'))
        if (partial) {
            found.push(partial)
        }

        // Try "STATUS" for BMW-style sheets (e.g., "Status_Side_Frame_XXX")
        if (found.length === 0) {
            partial = sheetNames.find(name => {
                const upper = name.toUpperCase()
                return upper.includes('STATUS') && !upper.includes('OVERVIEW') && !upper.includes('DEF')
            })
            if (partial) {
                found.push(partial)
            }
        }
    }

    return found
}

// ============================================================================
// NAME DERIVATION
// ============================================================================

/**
 * Derive project name from filename
 * e.g., "STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx" -> "STLA-S"
 *
 * Note: The unit parts (FRONT UNIT, REAR UNIT, UNDERBODY) are NOT part of the project name.
 * They represent Areas within the project, which are already captured in the row data.
 */
export function deriveProjectName(fileName: string): string {
    const base = fileName.replace(/\.(xlsx|xlsm|xls)$/i, '')
    const parts = base.split('_')

    // Return just the customer/platform name (first part)
    // e.g., "STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx" -> "STLA-S"
    return parts[0].replace(/-/g, ' ').trim()
}

/**
 * Derive customer from filename
 * Uses customer mapping for consistent assignment
 */
export function deriveCustomer(fileName: string): string {
    return deriveCustomerFromFileName(fileName)
}

/**
 * Extract area name from title cell
 * e.g., "UNDERBODY - SIMULATION" -> "UNDERBODY"
 */
export function extractAreaNameFromTitle(titleCell: string): string | undefined {
    if (!titleCell) return undefined

    // Try splitting by " - "
    const parts = titleCell.split(' - ')
    if (parts.length > 0 && parts[0].trim().length > 0) {
        return parts[0].trim()
    }

    return undefined
}

// ============================================================================
// GROUPING AND ISSUE DETECTION
// ============================================================================

/**
 * Group parsed rows by cell (area + line + station)
 */
export function groupByCell(rows: ParsedSimulationRow[]): Map<string, ParsedSimulationRow[]> {
    const groups = new Map<string, ParsedSimulationRow[]>()
    for (const row of rows) {
        const cellKey = `${row.areaName}:${row.lineCode}:${row.stationCode}`
        const group = groups.get(cellKey)

        if (group) {
            group.push(row)
        } else {
            groups.set(cellKey, [row])
        }
    }
    return groups
}

/**
 * Detect if a cell has issues based on stage metrics
 */
export function detectIssues(rows: ParsedSimulationRow[]): boolean {
    if (rows.length === 0) {
        return false
    }

    // Collect all metric values
    const allValues: number[] = []

    for (const row of rows) {
        allValues.push(...Object.values(row.stageMetrics))
    }

    if (allValues.length === 0) {
        return false
    }

    // Calculate average and min
    const avg = allValues.reduce((sum, val) => sum + val, 0) / allValues.length
    const min = Math.min(...allValues)

    // Flag as issue if:
    // 1. Average is low (< 50%)
    // 2. Or there's high variance (min is < 50% of average and average > 30)
    if (avg < 50) {
        return true
    }

    if (min < avg * 0.5 && avg > 30) {
        return true
    }

    return false
}

/**
 * Extract unique robots from vacuum-parsed rows and detect duplicate station+robot combinations.
 *
 * Key insight: One station can have multiple robots, so duplicate station entries are expected.
 * Only if BOTH station AND robot are identical should we flag it as an error.
 *
 * @returns Object containing unique robots and any duplicate warnings
 */
export function extractRobotsFromVacuumRows(
    vacuumRows: VacuumParsedRow[],
    fileName: string,
    sheetName: string
): { robots: SimulationRobot[]; warnings: IngestionWarning[] } {
    const warnings: IngestionWarning[] = []
    const robots: SimulationRobot[] = []

    // Track seen station+robot combinations to detect true duplicates
    const seenCombinations = new Map<string, { rowIndex: number; robotCaption: string }>()

    for (const row of vacuumRows) {
        const robotCaption = row.robotCaption?.trim()

        // Skip rows without robot information
        if (!robotCaption) {
            continue
        }

        // Build composite key: station + robot (normalized)
        const stationKey = row.stationKey.toUpperCase().trim()
        const robotKey = robotCaption.toUpperCase().trim()
        const compositeKey = `${stationKey}::${robotKey}`

        const existingEntry = seenCombinations.get(compositeKey)

        if (existingEntry) {
            // TRUE DUPLICATE: Same station AND same robot - this is an error
            warnings.push({
                id: `dup-station-robot-${row.sourceRowIndex}`,
                kind: 'DUPLICATE_ENTRY',
                fileName,
                sheetName,
                rowIndex: row.sourceRowIndex + 1,
                message: `Duplicate entry: Station "${row.stationKey}" with Robot "${robotCaption}" already exists (first seen at row ${existingEntry.rowIndex + 1}). Each station+robot combination should be unique.`,
                createdAt: new Date().toISOString()
            })
            continue
        }

        // Record this combination
        seenCombinations.set(compositeKey, {
            rowIndex: row.sourceRowIndex,
            robotCaption
        })

        // Add to robots list
        robots.push({
            stationKey: row.stationKey,
            robotCaption,
            areaKey: row.areaCode, // Use areaCode as the key
            application: row.application,
            sourceRowIndex: row.sourceRowIndex
        })
    }

    return { robots, warnings }
}
