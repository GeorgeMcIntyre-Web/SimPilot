import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  User,
  Wrench,
  ChevronRight,
  Activity,
  Target,
} from 'lucide-react'

import { StatCard } from '../../ui/components/StatCard'
import { useCells, useProjects, useAreas } from '../../domain/coreStore'
import { SchedulePhase, ScheduleStatus } from '../../domain/core'
import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics'
import { EmptyState } from '../../ui/components/EmptyState'
import { cn } from '../../ui/lib/utils'
import { useAllStations, type StationContext } from '../../features/simulation/simulationStore'

// ============================================================================
// LABELS & TOKENS
// ============================================================================

const PHASE_LABELS: Record<SchedulePhase, string> = {
  unspecified: 'Unspecified',
  presim: 'Pre-Simulation',
  offline: 'Offline Programming',
  onsite: 'On-Site',
  rampup: 'Ramp-Up',
  handover: 'Handover',
}

// ============================================================================
// TYPES
// ============================================================================

interface StationReadinessItem {
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

// ============================================================================
// MAIN ROUTE
// ============================================================================

export function ReadinessBoard() {
  const stations = useAllStations()
  const cells = useCells()
  const projects = useProjects()
  const areas = useAreas()
  const cellRisks = getAllCellScheduleRisks()
  const navigate = useNavigate()

  const [filterPhase, setFilterPhase] = useState<SchedulePhase | 'all'>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<
    Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>
  >([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<'risk' | 'due'>('risk')
  //const [density, setDensity] = useState<'compact' | 'comfortable'>('compact')

  // Map cell risks for quick lookup
  const riskMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getAllCellScheduleRisks>[number]>()
    for (const risk of cellRisks) map.set(risk.cellId, risk)
    return map
  }, [cellRisks])

  // Enrich stations with readiness data
  const stationReadiness = useMemo<StationReadinessItem[]>(() => {
    return stations.map((station) => {
      const risk = riskMap.get(station.cellId)
      const cell = cells.find((c) => c.id === station.cellId)
      const project = projects.find((p) => p.id === (risk?.projectId ?? cell?.projectId))
      const area = areas.find((a) => a.id === cell?.areaId)

      const completion = risk?.completion ?? station.simulationStatus?.firstStageCompletion ?? null
      const status: ScheduleStatus = risk?.status ?? 'unknown'
      const phase: SchedulePhase = risk?.phase ?? 'unspecified'

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

  // Filters
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

  // Sorting
  const sorted = useMemo(() => {
    const riskOrder: Record<ScheduleStatus, number> = { late: 0, atRisk: 1, onTrack: 2, unknown: 3 }

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

  // Stats
  const stats = useMemo(() => {
    const total = stationReadiness.length
    const onTrack = stationReadiness.filter((r) => r.status === 'onTrack').length
    const atRisk = stationReadiness.filter((r) => r.status === 'atRisk').length
    const late = stationReadiness.filter((r) => r.status === 'late').length
    return { total, onTrack, atRisk, late }
  }, [stationReadiness])

  // Group by phase
  const phases: SchedulePhase[] = [
    'presim',
    'offline',
    'onsite',
    'rampup',
    'handover',
    'unspecified',
  ]
  const grouped = phases
    .map((phase) => ({ phase, items: sorted.filter((r) => r.phase === phase) }))
    .filter((group) => group.items.length > 0)

  if (stationReadiness.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              SimPilot
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 dark:text-gray-200">Readiness Board</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
                Readiness <span className="text-indigo-600 dark:text-indigo-400">Board</span>
              </h1>
              <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-1">
                Project Deployment Intelligence
              </h2>
            </div>
          </div>
        </div>
        <EmptyState
          title="No Stations Found"
          message="Load simulation data to see readiness by station."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
          icon={<Calendar className="h-7 w-7" />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
            SimPilot
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 dark:text-gray-200">Readiness Board</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
              Readiness <span className="text-indigo-600 dark:text-indigo-400">Board</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Total Stations"
            value={stats.total}
            icon={<Target className="h-6 w-6 text-indigo-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="On Track"
            value={stats.onTrack}
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-emerald-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="At Risk"
            value={stats.atRisk}
            icon={<AlertCircle className="h-6 w-6 text-amber-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-amber-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Late"
            value={stats.late}
            icon={<Clock className="h-6 w-6 text-rose-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-rose-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center gap-4">
            {/* Search */}
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="SEARCH STATIONS, ENGINEERS, LINES..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value as SchedulePhase | 'all')}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm"
              >
                <option value="all">All Phases</option>
                {phases.map((p) => (
                  <option key={p} value={p}>
                    {PHASE_LABELS[p]}
                  </option>
                ))}
              </select>

              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1" />

              <StatusMultiSelect selected={filterStatus} onChange={setFilterStatus} />

              <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-1" />

              <SortToggle sortMode={sortMode} onChange={setSortMode} />
            </div>
          </div>

          {/* Active Filters */}
          {(filterPhase !== 'all' ||
            filterProject !== 'all' ||
            filterStatus.length > 0 ||
            searchTerm) && (
            <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                Active Intelligence Filters:
              </span>
              {filterPhase !== 'all' && (
                <Chip
                  label={`PHASE: ${PHASE_LABELS[filterPhase]}`}
                  onClear={() => setFilterPhase('all')}
                />
              )}
              {filterProject !== 'all' && (
                <Chip
                  label={`PROJECT: ${projects.find((p) => p.id === filterProject)?.name}`}
                  onClear={() => setFilterProject('all')}
                />
              )}
              {filterStatus.length > 0 && (
                <Chip
                  label={`STATUS: ${filterStatus.join(', ')}`}
                  onClear={() => setFilterStatus([])}
                />
              )}
              {searchTerm && (
                <Chip label={`SEARCH: ${searchTerm}`} onClear={() => setSearchTerm('')} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Board */}
      {sorted.length > 0 ? (
        <div className="max-h-[1200px] overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-4 min-w-max h-full">
            {grouped.map(({ phase, items }) => (
              <div
                key={phase}
                className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="px-4 py-3 bg-gray-50/50 dark:bg-black/20 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] truncate pr-2">
                    {PHASE_LABELS[phase]}
                  </h3>
                  <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[9px] font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                    {items.length}
                  </span>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 max-h-[70vh]">
                  {items.map((item) => (
                    <StationReadinessCard
                      key={item.station.contextKey}
                      item={item}
                      density={'compact'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl">
          <div className="p-4 rounded-full bg-gray-50 dark:bg-white/5 mb-4">
            <Target className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            No Stations Nodes Found
          </h3>
          <p className="text-xs text-gray-500 mt-1">Adjust filters to monitor deployment</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CARD COMPONENT
// ============================================================================

interface StationReadinessCardProps {
  item: StationReadinessItem
  density: 'compact' | 'comfortable'
}

function StationReadinessCard({ item }: StationReadinessCardProps) {
  const engineer = item.station.simulationStatus?.engineer
  const completion = item.completion ?? undefined
  const totalTools = item.station.assetCounts.tools + item.station.assetCounts.other
  const navigate = useNavigate()

  const statusLabel =
    item.status === 'onTrack'
      ? 'Active'
      : item.status === 'atRisk'
        ? 'At Risk'
        : item.status === 'late'
          ? 'Delayed'
          : 'Pending'

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'onTrack':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dot-emerald-500'
      case 'atRisk':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20 dot-amber-500'
      case 'late':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20 dot-rose-500'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20 dot-gray-400'
    }
  }

  const styles = getStatusStyle(item.status)

  return (
    <div
      onClick={() =>
        navigate(
          `/projects/${item.projectId ?? ''}/cells/${encodeURIComponent(item.station.cellId)}`,
        )
      }
      className={cn(
        'group relative rounded-2xl border p-4 transition-all cursor-pointer overflow-hidden',
        'bg-white dark:bg-white/5',
        'border-gray-100 dark:border-white/5',
        'hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1',
      )}
    >
      {/* Decorative pulse for late items */}
      {item.status === 'late' && (
        <div className="absolute top-0 right-0 p-1">
          <div className="h-1 w-1 rounded-full bg-rose-500 animate-ping" />
        </div>
      )}

      {/* Header: Station & Progress */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-black/20 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <Target className="h-3 w-3" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {item.station.station}
            </h4>
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest truncate">
              {item.projectName || 'Unassigned Node'}
            </div>
          </div>
        </div>

        {completion !== undefined && (
          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-gray-900 dark:text-white tabular-nums">
              {completion}%
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-4">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000',
            (completion ?? 0) >= 90
              ? 'bg-emerald-500'
              : (completion ?? 0) >= 50
                ? 'bg-indigo-500'
                : 'bg-rose-500',
          )}
          style={{ width: `${completion ?? 0}%` }}
        />
      </div>

      {/* Metadata Strip */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 dark:border-white/5 pt-3">
        <div className="flex items-center gap-3">
          {engineer ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="h-3 w-3 text-gray-400" />
              <span className="text-[9px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-tight truncate">
                {engineer}
              </span>
            </div>
          ) : (
            <span className="text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">
              UNASSIGNED
            </span>
          )}

          {totalTools > 0 && (
            <div className="flex items-center gap-1.5">
              <Wrench className="h-3 w-3 text-indigo-500/50" />
              <span className="text-[9px] font-black text-gray-900 dark:text-white tabular-nums">
                {totalTools}
              </span>
            </div>
          )}
        </div>

        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border',
            styles,
          )}
        >
          <div className={cn('h-1 w-1 rounded-full', styles.split('dot-')[1])} />
          {statusLabel}
        </span>
      </div>

      {/* Footer: Date Alert */}
      {(item.daysLate !== undefined && item.daysLate > 0) || item.daysToDue !== undefined ? (
        <div className="mt-3 flex items-center justify-end">
          {item.daysLate && item.daysLate > 0 ? (
            <div className="flex items-center gap-1 py-1 px-2 rounded-md bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest border border-rose-500/20">
              <Clock className="h-2.5 w-2.5" />
              Critical: {item.daysLate}d Overdue
            </div>
          ) : item.daysToDue !== undefined ? (
            <div className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-widest">
              <Calendar className="h-2.5 w-2.5" />
              Due in {item.daysToDue}d
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

// ============================================================================
// UI FRAGMENTS
// ============================================================================

function Chip({ label, onClear }: { label: string | undefined; onClear: () => void }) {
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase tracking-widest">
      {label}
      <button
        onClick={onClear}
        className="hover:text-indigo-900 dark:hover:text-white transition-colors"
      >
        <Activity className="h-2.5 w-2.5" />
      </button>
    </span>
  )
}

function StatusMultiSelect({
  selected,
  onChange,
}: {
  selected: Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>
  onChange: (val: Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>) => void
}) {
  const options: Array<{ value: 'onTrack' | 'atRisk' | 'late' | 'unknown'; label: string }> = [
    { value: 'onTrack', label: 'ACTIVE' },
    { value: 'atRisk', label: 'AT RISK' },
    { value: 'late', label: 'DELAYED' },
    { value: 'unknown', label: 'PENDING' },
  ]

  const toggle = (value: (typeof options)[number]['value']) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value))
    else onChange([...selected, value])
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => toggle(opt.value)}
          className={cn(
            'px-2.5 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all',
            selected.includes(opt.value)
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-white dark:bg-black/20 text-gray-400 border-gray-200 dark:border-white/10 hover:border-indigo-500/50',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SortToggle({
  sortMode,
  onChange,
}: {
  sortMode: 'risk' | 'due'
  onChange: (mode: 'risk' | 'due') => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 dark:border-white/10 px-1 py-1 bg-white dark:bg-black/20 shadow-sm">
      <button
        onClick={() => onChange('risk')}
        className={cn(
          'px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
          sortMode === 'risk'
            ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
        )}
      >
        RISK
      </button>
      <button
        onClick={() => onChange('due')}
        className={cn(
          'px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
          sortMode === 'due'
            ? 'bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
        )}
      >
        DUE
      </button>
    </div>
  )
}

export default ReadinessBoard
