import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DataTable, Column } from '../../ui/components/DataTable'
import { StatusPill } from '../../ui/components/StatusPill'
import { useAllEngineerMetrics, useCells, useProjects } from '../../ui/hooks/useDomainData'
import { Search, AlertTriangle, Users, Gauge, ChevronRight, Activity } from 'lucide-react'
import { Cell, SchedulePhase } from '../../domain/core'
import { EmptyState } from '../../ui/components/EmptyState'
import { StatCard } from '../../ui/components/StatCard'
import { cn } from '../../ui/lib/utils'

const ProgressBar = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2">
    <div className="w-24 bg-gray-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-1000',
          value >= 90 ? 'bg-emerald-500' : value >= 50 ? 'bg-indigo-500' : 'bg-rose-500',
        )}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
    <span className="text-[9px] font-black text-gray-900 dark:text-white tabular-nums">
      {value}%
    </span>
  </div>
)

const EngineerCell = ({ name, projects }: { name: string; projects: string }) => (
  <div className="flex items-center gap-3 min-w-0">
    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0 border border-indigo-500/20">
      {name.slice(0, 2).toUpperCase()}
    </div>
    <div className="min-w-0">
      <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
        {name}
      </div>
      <div className="text-xs font-black text-gray-400 uppercase tracking-widest truncate">
        {projects || '—'}
      </div>
    </div>
  </div>
)

export function EngineersPage() {
  const metrics = useAllEngineerMetrics()
  const allCells = useCells()
  const projects = useProjects()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEngineerName, setSelectedEngineerName] = useState<string | null>(null)

  const [atRiskOnly, setAtRiskOnly] = useState(false)
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [completionBand, setCompletionBand] = useState<'all' | 'low' | 'mid' | 'high' | 'no-data'>(
    'all',
  )
  const [loadFilter, setLoadFilter] = useState<'all' | 'light' | 'medium' | 'heavy'>('all')
  const [phaseFilter, setPhaseFilter] = useState<SchedulePhase | 'all'>('all')
  const [searchParams] = useSearchParams()
  const detailRef = useRef<HTMLDivElement | null>(null)

  const atRiskEngineers = metrics.filter((m) => m.atRiskCellsCount > 0).length
  const avgCompletion =
    metrics.length > 0
      ? Math.round(metrics.reduce((sum, m) => sum + m.avgCompletion, 0) / metrics.length)
      : 0

  const engineerCellsMap = useMemo(() => {
    const map = new Map<string, Cell[]>()
    allCells.forEach((cell) => {
      const name = cell.assignedEngineer?.trim() || 'UNASSIGNED'
      const list = map.get(name) || []
      list.push(cell)
      map.set(name, list)
    })
    return map
  }, [allCells])

  const getCompletionBand = (value: number) => {
    if (value === null || Number.isNaN(value)) return 'no-data'
    if (value <= 0) return 'low'
    if (value < 50) return 'low'
    if (value < 80) return 'mid'
    return 'high'
  }

  const filteredMetrics = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const completionBandFor = (metricName: string, avg: number) => {
      const cells = engineerCellsMap.get(metricName) || []
      const withSim = cells.filter((c) => c.simulation && c.simulation.percentComplete >= 0)
      if (withSim.length === 0) return 'no-data'
      return getCompletionBand(avg)
    }

    return metrics.filter((m) => {
      if (term && !m.name.toLowerCase().includes(term)) return false
      if (atRiskOnly && m.atRiskCellsCount === 0) return false
      if (projectFilter !== 'all') {
        const cells = engineerCellsMap.get(m.name) || []
        if (!cells.some((c) => c.projectId === projectFilter)) return false
      }
      if (phaseFilter !== 'all') {
        const cells = engineerCellsMap.get(m.name) || []
        if (!cells.some((c) => (c.schedule?.phase ?? 'unspecified') === phaseFilter)) return false
      }
      if (loadFilter !== 'all') {
        const count = m.cellCount
        const matchesLoad =
          (loadFilter === 'light' && count <= 3) ||
          (loadFilter === 'medium' && count > 3 && count <= 6) ||
          (loadFilter === 'heavy' && count > 6)
        if (!matchesLoad) return false
      }
      if (completionBand !== 'all') {
        const band = completionBandFor(m.name, m.avgCompletion)
        if (band !== completionBand) return false
      }
      return true
    })
  }, [
    metrics,
    searchTerm,
    atRiskOnly,
    projectFilter,
    phaseFilter,
    loadFilter,
    completionBand,
    engineerCellsMap,
  ])

  const sortedMetrics = useMemo(() => {
    return [...filteredMetrics].sort((a, b) => {
      // Sort by at-risk count (descending), then by name (ascending)
      if (b.atRiskCellsCount !== a.atRiskCellsCount) {
        return b.atRiskCellsCount - a.atRiskCellsCount
      }
      return a.name.localeCompare(b.name)
    })
  }, [filteredMetrics])

  const columns: Column<(typeof metrics)[0]>[] = [
    {
      header: (
        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          Engineer
        </span>
      ),
      accessor: (m) => <EngineerCell name={m.name} projects={m.projectNames} />,
    },
    {
      header: (
        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          Cells
        </span>
      ),
      accessor: (m) => (
        <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
          {m.cellCount}
        </span>
      ),
    },
    {
      header: (
        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          At Risk
        </span>
      ),
      accessor: (m) =>
        m.atRiskCellsCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="h-2.5 w-2.5" />
            {m.atRiskCellsCount}
          </span>
        ) : (
          <span className="text-sm font-black text-gray-400 tabular-nums">0</span>
        ),
    },
    {
      header: (
        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          Completion
        </span>
      ),
      accessor: (m) => <ProgressBar value={m.avgCompletion} />,
    },
  ]

  // Selected Engineer Details
  const selectedEngineerCells = selectedEngineerName
    ? allCells.filter((c) => (c.assignedEngineer?.trim() || 'UNASSIGNED') === selectedEngineerName)
    : []
  const highlightedEngineer = searchParams.get('highlightEngineer')?.trim()
  const hasAppliedHighlight = useRef(false)

  useEffect(() => {
    if (!highlightedEngineer) {
      hasAppliedHighlight.current = false
      return
    }
    if (hasAppliedHighlight.current) return
    const target = highlightedEngineer.trim()
    const match = metrics.find((m) => m.name.toLowerCase() === target.toLowerCase())
    setSelectedEngineerName(match ? match.name : target)
    hasAppliedHighlight.current = true
  }, [highlightedEngineer, metrics])

  useEffect(() => {
    if (selectedEngineerName && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedEngineerName])

  const cellColumns: Column<Cell>[] = [
    {
      header: (
        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          Station
        </span>
      ),
      accessor: (c) => (
        <Link
          to={
            c.projectId
              ? `/projects/${c.projectId}/cells/${encodeURIComponent(c.id)}`
              : `/cells/${encodeURIComponent(c.id)}`
          }
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {c.code || '-'}
        </Link>
      ),
    },
    {
      header: (
        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          Area
        </span>
      ),
      accessor: (c) => {
        const areaId = c.areaId || '-'
        if (c.projectId) {
          return (
            <Link
              to={`/projects/${c.projectId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {areaId}
            </Link>
          )
        }
        return (
          <span className="text-sm font-black text-gray-600 dark:text-gray-400 uppercase tracking-widest">
            {areaId}
          </span>
        )
      },
    },
    {
      header: (
        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          Status
        </span>
      ),
      accessor: (c) => <StatusPill status={c.status} />,
    },
    {
      header: (
        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          Complete
        </span>
      ),
      accessor: (c) =>
        c.simulation ? (
          <span className="text-sm font-black text-gray-900 dark:text-white tabular-nums">
            {c.simulation.percentComplete}%
          </span>
        ) : (
          <span className="text-sm font-black text-gray-400">-</span>
        ),
    },
    {
      header: (
        <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
          Issues
        </span>
      ),
      accessor: (c) =>
        c.simulation?.hasIssues ? (
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
        ) : (
          <span className="text-sm font-black text-gray-400">-</span>
        ),
    },
  ]

  const navigate = useNavigate()

  if (metrics.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              SimPilot
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 dark:text-gray-200">Engineers</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
                Simulation <span className="text-indigo-600 dark:text-indigo-400">Engineers</span>
              </h1>
            </div>
          </div>
        </div>
        <EmptyState
          title="No Engineers Found"
          message="Ensure 'PERSONS RESPONSIBLE' is filled in the Simulation Status Excel files."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
          icon={<Users className="h-7 w-7" />}
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
          <span className="text-gray-900 dark:text-gray-200">Engineers</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
              Simulation <span className="text-indigo-600 dark:text-indigo-400">Engineers</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Total Simulation Engineers"
            value={metrics.length}
            icon={<Users className="h-6 w-6 text-indigo-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="At-Risk Cells"
            value={atRiskEngineers}
            icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-amber-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Average Completion"
            value={`${avgCompletion}%`}
            icon={<Gauge className="h-6 w-6 text-emerald-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-emerald-500/50 transition-colors"
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
                placeholder="SEARCH ENGINEERS BY NAME..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setAtRiskOnly((prev) => !prev)}
                className={cn(
                  'px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all shadow-sm',
                  atRiskOnly
                    ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20'
                    : 'bg-white dark:bg-black/20 text-gray-400 border-gray-200 dark:border-white/10 hover:border-amber-500/50',
                )}
              >
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                At-Risk Only
              </button>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value as SchedulePhase | 'all')}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm"
              >
                <option value="all">All Phases</option>
                <option value="presim">Pre-Simulation</option>
                <option value="offline">Offline Programming</option>
                <option value="onsite">On-Site</option>
                <option value="rampup">Ramp-Up</option>
                <option value="handover">Handover</option>
                <option value="unspecified">Unspecified</option>
              </select>

              <select
                value={completionBand}
                onChange={(e) => setCompletionBand(e.target.value as typeof completionBand)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm"
              >
                <option value="all">All Completion</option>
                <option value="low">&lt; 50%</option>
                <option value="mid">50–79%</option>
                <option value="high">80–100%</option>
                <option value="no-data">No Data</option>
              </select>

              <select
                value={loadFilter}
                onChange={(e) => setLoadFilter(e.target.value as typeof loadFilter)}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-sm"
              >
                <option value="all">All Loads</option>
                <option value="light">0–3 Cells</option>
                <option value="medium">4–6 Cells</option>
                <option value="heavy">7+ Cells</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm ||
            atRiskOnly ||
            projectFilter !== 'all' ||
            phaseFilter !== 'all' ||
            completionBand !== 'all' ||
            loadFilter !== 'all') && (
            <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                Active Filters:
              </span>
              {searchTerm && (
                <Chip label={`SEARCH: ${searchTerm}`} onClear={() => setSearchTerm('')} />
              )}
              {atRiskOnly && <Chip label="AT-RISK ONLY" onClear={() => setAtRiskOnly(false)} />}
              {projectFilter !== 'all' && (
                <Chip
                  label={`PROJECT: ${projects.find((p) => p.id === projectFilter)?.name}`}
                  onClear={() => setProjectFilter('all')}
                />
              )}
              {phaseFilter !== 'all' && (
                <Chip label={`PHASE: ${phaseFilter}`} onClear={() => setPhaseFilter('all')} />
              )}
              {completionBand !== 'all' && (
                <Chip
                  label={`COMPLETION: ${completionBand}`}
                  onClear={() => setCompletionBand('all')}
                />
              )}
              {loadFilter !== 'all' && (
                <Chip label={`LOAD: ${loadFilter}`} onClear={() => setLoadFilter('all')} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[15px] font-black uppercase tracking-widest text-gray-400">
              Simulator Roster
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              Click a row to view assignments
            </p>
          </div>
        </div>
        <DataTable
          data={sortedMetrics}
          columns={columns}
          emptyMessage="No engineers match your filter."
          density="compact"
          onRowClick={(row) => {
            hasAppliedHighlight.current = true
            setSelectedEngineerName(row.name === selectedEngineerName ? null : row.name)
          }}
          rowClassName={(row) =>
            row.name === selectedEngineerName
              ? 'bg-indigo-50/80 dark:bg-indigo-900/30 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-700'
              : undefined
          }
        />
      </div>

      {/* Selected Engineer Detail */}
      {selectedEngineerName && (
        <div
          ref={detailRef}
          className="bg-white dark:bg-[rgb(31,41,55)] border border-indigo-500/50 dark:border-indigo-500/30 rounded-2xl p-6 shadow-xl shadow-indigo-500/5 animate-fade-in"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[15px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Cell Assignments
              </p>
              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight mt-1">
                {selectedEngineerName}
              </h3>
            </div>
            <button
              onClick={() => setSelectedEngineerName(null)}
              className="text-[15px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
          <DataTable
            data={selectedEngineerCells}
            columns={cellColumns}
            density="compact"
            emptyMessage="No cells assigned to this engineer."
          />
        </div>
      )}
    </div>
  )
}

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

export default EngineersPage
