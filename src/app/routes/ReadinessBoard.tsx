import { useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { EmptyState } from '../../ui/components/EmptyState'
import { useProjects } from '../../domain/coreStore'
import { ReadinessBoardHeader } from './readinessBoard/components/ReadinessBoardHeader'
import { StatCards } from './readinessBoard/components/StatCards'
import { FiltersBar } from './readinessBoard/components/FiltersBar'
import { BoardColumns, EmptyBoardState } from './readinessBoard/components/BoardColumns'
import { PHASE_ORDER } from './readinessBoard/constants'
import {
  useFilters,
  useReadinessFilters,
  useReadinessStats,
  useStationReadiness,
} from './readinessBoard/hooks'

export function ReadinessBoard() {
  const projects = useProjects()
  const { stationReadiness } = useStationReadiness()
  const filters = useFilters()

  const { sorted } = useReadinessFilters(
    stationReadiness,
    filters.filterPhase,
    filters.filterProject,
    filters.filterStatus,
    filters.searchTerm,
    filters.sortMode,
  )

  const stats = useReadinessStats(stationReadiness)

  const grouped = useMemo(
    () =>
      PHASE_ORDER.map((phase) => ({
        phase,
        items: sorted.filter((r) => r.phase === phase),
      })).filter((group) => group.items.length > 0),
    [sorted],
  )

  if (stationReadiness.length === 0) {
    return (
      <div className="space-y-8">
        <ReadinessBoardHeader />
        <EmptyState
          title="No Stations Found"
          message="Load simulation data to see readiness by station."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => window.location.assign('/data-loader')}
          icon={<Calendar className="h-7 w-7" />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <ReadinessBoardHeader />
      <StatCards stats={stats} />
      <FiltersBar
        filterPhase={filters.filterPhase}
        setFilterPhase={filters.setFilterPhase}
        filterProject={filters.filterProject}
        setFilterProject={filters.setFilterProject}
        filterStatus={filters.filterStatus}
        setFilterStatus={filters.setFilterStatus}
        searchTerm={filters.searchTerm}
        setSearchTerm={filters.setSearchTerm}
        sortMode={filters.sortMode}
        setSortMode={filters.setSortMode}
        projects={projects}
      />
      {sorted.length > 0 ? <BoardColumns grouped={grouped} /> : <EmptyBoardState />}
    </div>
  )
}

export default ReadinessBoard
