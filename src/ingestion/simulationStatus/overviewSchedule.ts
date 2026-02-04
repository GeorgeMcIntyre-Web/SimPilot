import * as XLSX from 'xlsx'
import { getWeek } from 'date-fns'
import type { OverviewScheduleMetrics } from '../../domain/core'

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
