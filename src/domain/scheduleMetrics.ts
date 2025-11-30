// Schedule Metrics
// Pure functions for calculating schedule status and risk

import { coreStore } from './coreStore'
import { Cell, SchedulePhase, ScheduleStatus } from './core'

// ============================================================================
// TYPES
// ============================================================================

export interface CellScheduleRisk {
    cellId: string
    projectId?: string
    areaId?: string
    phase: SchedulePhase
    status: ScheduleStatus
    completion: number | null
    daysLate?: number
    hasDueDate: boolean
    plannedStart?: string
    plannedEnd?: string
}

export interface ProjectScheduleSummary {
    projectId: string
    onTrackCount: number
    atRiskCount: number
    lateCount: number
    unknownCount: number
    avgCompletion: number | null
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Compute schedule status from dates and completion percentage
 * Logic:
 * - No dates → unknown
 * - Due date in future:
 *   - If completion is low and close to due date → atRisk
 *   - Otherwise → onTrack
 * - Due date in past:
 *   - If completion < 100% → late
 *   - If completion >= 100% → onTrack (completed on time)
 */
export function computeScheduleStatus(
    dueDate: string | undefined,
    plannedEnd: string | undefined,
    completion: number | null
): ScheduleStatus {
    const targetDate = dueDate || plannedEnd

    if (!targetDate) {
        return 'unknown'
    }

    const now = new Date()
    const target = new Date(targetDate)
    const daysDiff = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Past due date
    if (daysDiff < 0) {
        if (completion === null || completion < 100) {
            return 'late'
        }
        return 'onTrack' // Completed, even if past due
    }

    // Future due date
    if (completion === null || completion < 50) {
        // Low completion
        if (daysDiff < 14) {
            // Less than 2 weeks to deadline
            return 'atRisk'
        }
    }

    if (completion !== null && completion < 75) {
        // Moderate completion
        if (daysDiff < 7) {
            // Less than 1 week to deadline
            return 'atRisk'
        }
    }

    return 'onTrack'
}

/**
 * Calculate days late (negative if not yet late)
 */
export function calculateDaysLate(dueDate: string | undefined): number | undefined {
    if (!dueDate) return undefined

    const now = new Date()
    const target = new Date(dueDate)
    const daysDiff = Math.floor((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

    return daysDiff > 0 ? daysDiff : undefined
}

/**
 * Get schedule risk for a single cell
 */
export function getCellScheduleRisk(cell: Cell): CellScheduleRisk {
    const schedule = cell.schedule
    const completion = cell.simulation?.percentComplete ?? null

    const phase: SchedulePhase = schedule?.phase ?? 'unspecified'
    const status: ScheduleStatus = schedule?.status ?? computeScheduleStatus(
        schedule?.dueDate,
        schedule?.plannedEnd,
        completion
    )

    const daysLate = calculateDaysLate(schedule?.dueDate)
    const hasDueDate = Boolean(schedule?.dueDate || schedule?.plannedEnd)

    return {
        cellId: cell.id,
        projectId: cell.projectId,
        areaId: cell.areaId,
        phase,
        status,
        completion,
        daysLate,
        hasDueDate,
        plannedStart: schedule?.plannedStart,
        plannedEnd: schedule?.plannedEnd
    }
}

/**
 * Get schedule summary for a project
 */
export function getProjectScheduleSummary(projectId: string): ProjectScheduleSummary {
    const state = coreStore.getState()
    const projectCells = state.cells.filter(c => c.projectId === projectId)

    const risks = projectCells.map(getCellScheduleRisk)

    const onTrackCount = risks.filter(r => r.status === 'onTrack').length
    const atRiskCount = risks.filter(r => r.status === 'atRisk').length
    const lateCount = risks.filter(r => r.status === 'late').length
    const unknownCount = risks.filter(r => r.status === 'unknown').length

    const cellsWithCompletion = projectCells.filter(c => c.simulation?.percentComplete !== undefined)
    const avgCompletion = cellsWithCompletion.length > 0
        ? Math.round(cellsWithCompletion.reduce((acc, c) => acc + (c.simulation?.percentComplete || 0), 0) / cellsWithCompletion.length)
        : null

    return {
        projectId,
        onTrackCount,
        atRiskCount,
        lateCount,
        unknownCount,
        avgCompletion
    }
}

/**
 * Get schedule summaries for all projects
 */
export function getAllProjectScheduleSummaries(): ProjectScheduleSummary[] {
    const state = coreStore.getState()
    return state.projects.map(p => getProjectScheduleSummary(p.id))
}

/**
 * Get all cells with schedule risk
 */
export function getAllCellScheduleRisks(): CellScheduleRisk[] {
    const state = coreStore.getState()
    return state.cells.map(getCellScheduleRisk)
}
