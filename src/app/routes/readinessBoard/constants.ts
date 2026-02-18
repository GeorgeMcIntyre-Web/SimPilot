import type { SchedulePhase } from '../../domain/core'

export const PHASE_LABELS: Record<SchedulePhase, string> = {
  unspecified: 'Unspecified',
  presim: 'Pre-Simulation',
  offline: 'Offline Programming',
  onsite: 'On-Site',
  rampup: 'Ramp-Up',
  handover: 'Handover',
}

export const PHASE_ORDER: SchedulePhase[] = [
  'presim',
  'offline',
  'onsite',
  'rampup',
  'handover',
  'unspecified',
]
