import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  SlidersHorizontal,
  User,
  RefreshCw,
  ShoppingCart,
  Wrench,
  ArrowUpRight,
} from 'lucide-react'

import { useCells, useProjects } from '../../domain/coreStore'
import { SchedulePhase, ScheduleStatus } from '../../domain/core'
import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics'
import { EmptyState } from '../../ui/components/EmptyState'
import { PageHeader } from '../../ui/components/PageHeader'
import { PageHint } from '../../ui/components/PageHint'
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

const STATUS_TOKENS = {
  onTrack: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    accent: 'border-l-4 border-l-emerald-500/70',
    pill: 'bg-emerald-100/70 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  },
  atRisk: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    accent: 'border-l-4 border-l-amber-500/70',
    pill: 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  },
  late: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500',
    accent: 'border-l-4 border-l-rose-500/70',
    pill: 'bg-rose-100/80 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  },
  unknown: {
    bg: 'bg-gray-50 dark:bg-gray-800/30',
    text: 'text-gray-600 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
    dot: 'bg-gray-400',
    accent: 'border-l-4 border-l-gray-400/70',
    pill: 'bg-gray-100 text-gray-700 dark:bg-gray-800/40 dark:text-gray-200',
  },
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
}

// ============================================================================
// MAIN ROUTE
// ============================================================================

export function ReadinessBoard() {
  const stations = useAllStations()
  const cells = useCells()
  const projects = useProjects()
  const cellRisks = getAllCellScheduleRisks()
  const navigate = useNavigate()

  const [filterPhase, setFilterPhase] = useState<SchedulePhase | 'all'>('all')
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<
    Array<'onTrack' | 'atRisk' | 'late' | 'unknown'>
  >([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<'risk' | 'due'>('risk')
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact')

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
      }
    })
  }, [stations, riskMap, cells, projects])

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
      <div className="space-y-4">
        <PageHeader
          title="Readiness Board"
          subtitle={
            <PageHint
              standardText="Track stations by schedule phase and status"
              flowerText="Stations moving from presim to handover, at a glance."
            />
          }
        />
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
    <div className="space-y-4">
      <PageHeader
        title="Readiness Board"
        subtitle={
          <PageHint
            standardText="Track stations by schedule phase and status"
            flowerText="Stations moving from presim to handover, at a glance."
          />
        }
      />

      {/* Statistics strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill
          label="Total"
          value={stats.total}
          tone="stone"
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatPill
          label="On Track"
          value={stats.onTrack}
          tone="emerald"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatPill
          label="At Risk"
          value={stats.atRisk}
          tone="amber"
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <StatPill
          label="Late"
          value={stats.late}
          tone="rose"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stations, engineers, lines, or projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />

              <select
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value as SchedulePhase | 'all')}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <StatusMultiSelect selected={filterStatus} onChange={setFilterStatus} />
              <SortToggle sortMode={sortMode} onChange={setSortMode} />
              <DensityToggle density={density} onChange={setDensity} />

              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {filtered.length} {filtered.length === 1 ? 'station' : 'stations'}
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {(filterPhase !== 'all' ||
            filterProject !== 'all' ||
            filterStatus.length > 0 ||
            searchTerm) && (
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Active filters:</span>
              {filterPhase !== 'all' && (
                <Chip
                  label={`Phase: ${PHASE_LABELS[filterPhase]}`}
                  onClear={() => setFilterPhase('all')}
                />
              )}
              {filterProject !== 'all' && (
                <Chip
                  label={`Project: ${projects.find((p) => p.id === filterProject)?.name}`}
                  onClear={() => setFilterProject('all')}
                />
              )}
              {filterStatus.length > 0 && (
                <Chip
                  label={`Status: ${filterStatus.join(', ')}`}
                  onClear={() => setFilterStatus([])}
                />
              )}
              {searchTerm && (
                <Chip label={`Search: ${searchTerm}`} onClear={() => setSearchTerm('')} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Board */}
      {sorted.length > 0 ? (
        <div className="max-h-[900px] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {grouped.map(({ phase, items }) => (
              <div
                key={phase}
                className="relative bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden flex flex-col shadow-sm backdrop-blur-sm"
              >
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex-shrink-0">
                  <div className="flex items-center justify-between gap-2 h-6">
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                      {PHASE_LABELS[phase]}
                    </h3>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded">
                      {items.length}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 space-y-2.5 overflow-y-auto custom-scrollbar max-h-[70vh]">
                  {items.map((item) => (
                    <StationReadinessCard
                      key={item.station.contextKey}
                      item={item}
                      density={density}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No Stations Found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Adjust your filters to see more stations.
          </p>
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

function StationReadinessCard({ item, density }: StationReadinessCardProps) {
  const styles = STATUS_TOKENS[item.status]
  const isCompact = density === 'compact'
  const engineer = item.station.simulationStatus?.engineer
  const completion = item.completion ?? undefined
  const totalTools = item.station.assetCounts.tools + item.station.assetCounts.other
  const reusePct = useMemo(() => {
    const total =
      item.station.sourcingCounts.reuse +
      item.station.sourcingCounts.freeIssue +
      item.station.sourcingCounts.newBuy +
      item.station.sourcingCounts.unknown
    if (total === 0) return null
    return Math.round(
      ((item.station.sourcingCounts.reuse + item.station.sourcingCounts.freeIssue) / total) * 100,
    )
  }, [item.station.sourcingCounts])
  const newBuyPct = useMemo(() => {
    const total =
      item.station.sourcingCounts.reuse +
      item.station.sourcingCounts.freeIssue +
      item.station.sourcingCounts.newBuy +
      item.station.sourcingCounts.unknown
    if (total === 0) return null
    return Math.round((item.station.sourcingCounts.newBuy / total) * 100)
  }, [item.station.sourcingCounts])

  return (
    <div
      className={cn(
        'group relative block rounded-md border transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500',
        'bg-white dark:bg-gray-800',
        styles.border,
        styles.accent,
        isCompact ? 'text-[11px]' : 'text-xs',
      )}
      tabIndex={0}
      aria-label={`Station ${item.station.station}, status ${item.status}`}
    >
      {/* Header */}
      <div className={cn('px-3 py-2 border-b', styles.border, styles.bg)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', styles.dot)} />
            <span
              className={cn(
                isCompact ? 'text-[11px]' : 'text-[12px]',
                'font-semibold truncate',
                styles.text,
              )}
            >
              {item.station.station}
            </span>
          </div>
          {completion !== undefined && (
            <span
              className={cn(
                isCompact ? 'text-[10px]' : 'text-[11px]',
                'font-bold flex-shrink-0',
                styles.text,
              )}
            ></span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={cn('px-3', isCompact ? 'py-2 space-y-1.5' : 'py-3 space-y-2.5')}>
        {/* Project / line */}
        {(item.projectName || item.station.line) && (
          <div
            className={cn(
              isCompact ? 'text-[10px]' : 'text-[11px]',
              'text-gray-600 dark:text-gray-400 truncate font-semibold',
            )}
          >
            {item.projectName ? `${item.projectName} • ${item.station.line}` : item.station.line}
          </div>
        )}

        {/* Engineer */}
        {engineer && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-gray-500 dark:text-gray-500',
              isCompact ? 'text-[10px]' : 'text-[11px]',
            )}
          >
            <User className="h-2.5 w-2.5 flex-shrink-0" />
            <Link
              to={`/engineers?highlightEngineer=${encodeURIComponent(engineer)}`}
              className="truncate hover:underline"
            >
              {engineer}
            </Link>
          </div>
        )}

        {/* Phase + status pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
            {PHASE_LABELS[item.phase]}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
              styles.pill,
            )}
          >
            {item.status}
          </span>
        </div>

        {/* Progress */}
        <CompletionBar percent={completion} />

        {/* Sourcing + assets */}
        <div className="flex items-center justify-between gap-2 text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            {reusePct !== null && reusePct > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <RefreshCw className="h-3 w-3" />
                <span>{reusePct}%</span>
              </span>
            )}
            {newBuyPct !== null && newBuyPct > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                <ShoppingCart className="h-3 w-3" />
                <span>{newBuyPct}%</span>
              </span>
            )}
          </div>

          {totalTools > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
              <Wrench className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium">{totalTools}</span>
              <span className="text-gray-500">other</span>
            </span>
          )}
        </div>

        {/* Due info */}
        {item.daysLate && item.daysLate > 0 ? (
          <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
            <span>{item.daysLate}d late</span>
          </div>
        ) : item.daysToDue !== undefined ? (
          <div className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
            <span>{item.daysToDue}d to due</span>
          </div>
        ) : item.hasDueDate ? (
          <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-500">
            <Clock className="h-2.5 w-2.5 flex-shrink-0" />
            <span>No due date calculated</span>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <Link
            to={`/projects/${item.projectId ?? ''}/cells/${encodeURIComponent(item.station.cellId)}`}
            className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-300 hover:underline"
          >
            View station
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <span className="text-[10px] text-gray-400">{item.station.line}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// UI FRAGMENTS
// ============================================================================

function CompletionBar({ percent }: { percent: number | undefined }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            'bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400',
          )}
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200 min-w-[32px] text-right">
        {percent !== undefined ? `${percent}%` : '—'}
      </span>
    </div>
  )
}

function Chip({ label, onClear }: { label: string | undefined; onClear: () => void }) {
  if (!label) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
      {label}
      <button onClick={onClear} className="hover:text-indigo-900 dark:hover:text-indigo-100">
        ×
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
    { value: 'onTrack', label: 'On Track' },
    { value: 'atRisk', label: 'At Risk' },
    { value: 'late', label: 'Late' },
    { value: 'unknown', label: 'Unknown' },
  ]

  const toggle = (value: (typeof options)[number]['value']) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value))
    else onChange([...selected, value])
  }

  return (
    <div className="flex items-center gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => toggle(opt.value)}
          className={cn(
            'px-2 py-1 rounded-md border text-xs font-semibold transition-all',
            selected.includes(opt.value)
              ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700'
              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600',
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
    <div className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-1 py-1 text-xs text-gray-600 dark:text-gray-300">
      <SlidersHorizontal className="h-4 w-4 text-gray-400" />
      <button
        onClick={() => onChange('risk')}
        className={cn(
          'px-2 py-1 rounded',
          sortMode === 'risk'
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700',
        )}
      >
        Risk
      </button>
      <button
        onClick={() => onChange('due')}
        className={cn(
          'px-2 py-1 rounded',
          sortMode === 'due'
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700',
        )}
      >
        Due
      </button>
    </div>
  )
}

function DensityToggle({
  density,
  onChange,
}: {
  density: 'compact' | 'comfortable'
  onChange: (d: 'compact' | 'comfortable') => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-1 py-1 text-xs text-gray-600 dark:text-gray-300">
      <button
        onClick={() => onChange('compact')}
        className={cn(
          'px-2 py-1 rounded',
          density === 'compact'
            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700',
        )}
      >
        Compact
      </button>
      <button
        onClick={() => onChange('comfortable')}
        className={cn(
          'px-2 py-1 rounded',
          density === 'comfortable'
            ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700',
        )}
      >
        Cozy
      </button>
    </div>
  )
}

function StatPill({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: 'stone' | 'emerald' | 'amber' | 'rose'
  icon: JSX.Element
}) {
  const tones: Record<typeof tone, { bg: string; text: string }> = {
    stone: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-100' },
    emerald: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-800 dark:text-emerald-200',
    },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-800 dark:text-amber-200' },
    rose: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-200' },
  }

  const style = tones[tone]

  return (
    <div
      className={cn('flex items-center gap-2 rounded-lg px-3 py-2 shadow-sm', style.bg, style.text)}
    >
      {icon}
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
        <span className="text-lg font-bold">{value}</span>
      </div>
    </div>
  )
}

export default ReadinessBoard
