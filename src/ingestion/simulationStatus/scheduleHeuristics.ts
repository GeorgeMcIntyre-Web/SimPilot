import type { SchedulePhase, ScheduleStatus, OverviewScheduleMetrics } from '../../domain/core'

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
