import { useMemo, useState } from 'react'
import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics'
import { useCells, useProjects, useAreas } from '../../domain/coreStore'
import type { SchedulePhase } from '../../domain/core'
import { useAllStations } from '../../features/simulation/simulationStore'
import type { StationReadinessItem, ReadinessStats } from './types'

export function useFilters() {
  const [filterPhase, setFilterPhase] = useState<SchedulePhase | 'all'>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<
    Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>
  >([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<'risk' | 'due'>('risk')

  return {
    filterPhase,
    setFilterPhase,
    filterProject,
    setFilterProject,
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    sortMode,
    setSortMode,
  }
}

export function useStationReadiness() {
  const stations = useAllStations()
  const cells = useCells()
  const projects = useProjects()
  const areas = useAreas()
  const cellRisks = getAllCellScheduleRisks()

  const riskMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getAllCellScheduleRisks>[number]>()
    for (const risk of cellRisks) map.set(risk.cellId, risk)
    return map
  }, [cellRisks])

  const stationReadiness = useMemo<StationReadinessItem[]>(() => {
    return stations.map((station) => {
      const risk = riskMap.get(station.cellId)
      const cell = cells.find((c) => c.id === station.cellId)
      const project = projects.find((p) => p.id === (risk?.projectId ?? cell?.projectId))
      const area = areas.find((a) => a.id === cell?.areaId)

      const completion = risk?.completion ?? station.simulationStatus?.firstStageCompletion ?? null
      const status = risk?.status ?? 'unknown'
      const phase = risk?.phase ?? 'unspecified'

      return {
        station,
        status,
        phase,
        completion,
        daysLate: risk?.daysLate,
        daysToDue: risk?.daysToDue,
        hasDueDate: risk?.hasDueDate ?? false,
        projectId: project?.id,
        projectName: project?.name,
        areaId: area?.id,
        areaName: area?.name,
      }
    })
  }, [stations, riskMap, cells, projects, areas])

  return { stationReadiness }
}

export function useReadinessStats(stationReadiness: StationReadinessItem[]): ReadinessStats {
  return useMemo(() => {
    const total = stationReadiness.length
    const onTrack = stationReadiness.filter((r) => r.status === 'onTrack').length
    const atRisk = stationReadiness.filter((r) => r.status === 'atRisk').length
    const late = stationReadiness.filter((r) => r.status === 'late').length
    return { total, onTrack, atRisk, late }
  }, [stationReadiness])
}

export function useReadinessFilters(
  stationReadiness: StationReadinessItem[],
  filterPhase: SchedulePhase | 'all',
  filterProject: string,
  filterStatus: Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>,
  searchTerm: string,
  sortMode: 'risk' | 'due',
) {
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return stationReadiness.filter((item) => {
      if (filterPhase !== 'all' && item.phase !== filterPhase) return false
      if (filterProject !== 'all' && item.projectId !== filterProject) return false
      if (filterStatus.length > 0 && !filterStatus.includes(item.status)) return false

      if (term) {
        const nameMatch = item.station.station.toLowerCase().includes(term)
        const engineerMatch = item.station.simulationStatus?.engineer?.toLowerCase().includes(term)
        const projectMatch = item.projectName?.toLowerCase().includes(term)
        const lineMatch = item.station.line.toLowerCase().includes(term)
        if (!(nameMatch || engineerMatch || projectMatch || lineMatch)) return false
      }

      return true
    })
  }, [stationReadiness, filterPhase, filterProject, filterStatus, searchTerm])

  const sorted = useMemo(() => {
    const riskOrder: Record<'late' | 'atRisk' | 'onTrack' | 'unknown', number> = {
      late: 0,
      atRisk: 1,
      onTrack: 2,
      unknown: 3,
    }

    return [...filtered].sort((a, b) => {
      if (sortMode === 'risk') {
        const byStatus = riskOrder[a.status] - riskOrder[b.status]
        if (byStatus !== 0) return byStatus
        return (b.completion ?? 0) - (a.completion ?? 0)
      }

      const aDue = a.daysToDue ?? Infinity
      const bDue = b.daysToDue ?? Infinity
      if (aDue !== bDue) return aDue - bDue
      return riskOrder[a.status] - riskOrder[b.status]
    })
  }, [filtered, sortMode])

  return { filtered, sorted }
}
