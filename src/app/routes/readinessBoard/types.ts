import type { SchedulePhase, ScheduleStatus } from '../../domain/core'
import type { StationContext } from '../../features/simulation/simulationStore'

export interface StationReadinessItem {
  station: StationContext
  status: ScheduleStatus
  phase: SchedulePhase
  completion: number | null
  daysLate?: number
  daysToDue?: number
  hasDueDate: boolean
  projectId?: string
  projectName?: string
  areaId?: string
  areaName?: string
}

export interface ReadinessStats {
  total: number
  onTrack: number
  atRisk: number
  late: number
}
