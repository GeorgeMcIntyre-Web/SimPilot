import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { useCells, useProjects, useOverviewSchedule } from '../../domain/coreStore'
import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics'
import { SchedulePhase, Cell } from '../../domain/core'
import { Filter, Calendar, User, Clock, Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PageHint } from '../../ui/components/PageHint'
import { cn } from '../../ui/lib/utils'
import { EmptyState } from '../../ui/components/EmptyState'

const PHASE_LABELS: Record<SchedulePhase, string> = {
    unspecified: 'Unspecified',
    presim: 'Pre-Simulation',
    offline: 'Offline Programming',
    onsite: 'On-Site',
    rampup: 'Ramp-Up',
    handover: 'Handover'
}


const STATUS_STYLES = {
    onTrack: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        accent: 'border-l-4 border-l-emerald-500/70'
    },
    atRisk: {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
        accent: 'border-l-4 border-l-amber-500/70'
    },
    late: {
        bg: 'bg-rose-50 dark:bg-rose-950/30',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500',
        accent: 'border-l-4 border-l-rose-500/70'
    },
    unknown: {
        bg: 'bg-gray-50 dark:bg-gray-800/30',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-700',
        dot: 'bg-gray-400',
        accent: 'border-l-4 border-l-gray-400/70'
    }
}

export function ReadinessBoard() {
    const cells = useCells()
    const projects = useProjects()
    const cellRisks = getAllCellScheduleRisks()
    const overview = useOverviewSchedule()
    const navigate = useNavigate()

    const [filterPhase, setFilterPhase] = useState<SchedulePhase | 'all'>('all')
    const [filterProject, setFilterProject] = useState<string>('all')
    const [filterStatus, setFilterStatus] = useState<'all' | 'onTrack' | 'atRisk' | 'late'>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Get filtered cells with risk data
    const filteredRisks = useMemo(() => {
        return cellRisks.filter(risk => {
            // Phase filter
            if (filterPhase !== 'all' && risk.phase !== filterPhase) return false

            // Project filter
            if (filterProject !== 'all' && risk.projectId !== filterProject) return false

            // Status filter
            if (filterStatus !== 'all' && risk.status !== filterStatus) return false

            // Search filter
            if (searchTerm) {
                const cell = cells.find(c => c.id === risk.cellId)
                if (!cell) return false

                const term = searchTerm.toLowerCase()
                const matchesName = cell.name.toLowerCase().includes(term)
                const matchesEngineer = cell.assignedEngineer?.toLowerCase().includes(term)
                const project = projects.find(p => p.id === cell.projectId)
                const matchesProject = project?.name.toLowerCase().includes(term)

                return matchesName || matchesEngineer || matchesProject
            }

            return true
        })
    }, [cellRisks, filterPhase, filterProject, filterStatus, searchTerm, cells, projects])

    // Calculate statistics
    const stats = useMemo(() => {
        const total = cellRisks.length
        const onTrack = cellRisks.filter(r => r.status === 'onTrack').length
        const atRisk = cellRisks.filter(r => r.status === 'atRisk').length
        const late = cellRisks.filter(r => r.status === 'late').length
        return { total, onTrack, atRisk, late }
    }, [cellRisks])

    // Group by phase
    const phases: SchedulePhase[] = ['presim', 'offline', 'onsite', 'rampup', 'handover', 'unspecified']

    const groupedByPhase = phases.map(phase => {
        const phaseRisks = filteredRisks.filter(r => r.phase === phase)
        return { phase, risks: phaseRisks }
    }).filter(g => g.risks.length > 0)

    // No data loaded across the board
    if (cellRisks.length === 0) {
        return (
            <div className="space-y-4">
                <PageHeader
                    title="Readiness Board"
                    subtitle={
                        <PageHint
                            standardText="Track cells by schedule phase and status"
                            flowerText="Where every cell lives in the presim → handover journey."
                        />
                    }
                />
                <EmptyState
                    title="No Cells Found"
                    message="Please go to the Data Loader to import your simulation files."
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
                        standardText="Track cells by schedule phase and status"
                        flowerText="Where every cell lives in the presim → handover journey."
                    />
                }
            />

            {/* Overview schedule metrics (calendar week based) */}
            {overview && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <MetricChip label="Current Week" value={formatWeek(overview.currentWeek)} />
                    <MetricChip label="Job Start" value={formatWeek(overview.jobStartWeek)} />
                    <MetricChip label="Job End" value={formatWeek(overview.jobEndWeek)} />
                    <MetricChip label="Job Duration" value={overview.completeJobDuration ? `${overview.completeJobDuration} wks` : '—'} />
                </div>
            )}

            {/* Statistics Cards */}
            {cellRisks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Total Cells</div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                                <Calendar className="h-4 w-4 text-gray-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <div className="text-xl font-bold text-emerald-700">{stats.onTrack}</div>
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">On Track</div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <div className="text-xl font-bold text-amber-700">{stats.atRisk}</div>
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">At Risk</div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <div className="text-xl font-bold text-rose-700">{stats.late}</div>
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Late</div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800">
                                <Clock className="h-4 w-4 text-rose-600" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {/* Search */}
                    <div className="flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search cells, engineers, or projects..."
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
                            {phases.map(p => (
                                <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                            ))}
                        </select>

                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                            className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="onTrack">On Track</option>
                            <option value="atRisk">At Risk</option>
                            <option value="late">Late</option>
                        </select>

                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {filteredRisks.length} {filteredRisks.length === 1 ? 'cell' : 'cells'}
                        </div>
                    </div>
                </div>

                {/* Active Filters */}
                {(filterPhase !== 'all' || filterProject !== 'all' || filterStatus !== 'all' || searchTerm) && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">Active filters:</span>
                        {filterPhase !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                Phase: {PHASE_LABELS[filterPhase]}
                                <button
                                    onClick={() => setFilterPhase('all')}
                                    className="hover:text-indigo-900 dark:hover:text-indigo-100"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {filterProject !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                Project: {projects.find(p => p.id === filterProject)?.name}
                                <button
                                    onClick={() => setFilterProject('all')}
                                    className="hover:text-indigo-900 dark:hover:text-indigo-100"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {filterStatus !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                Status: {filterStatus}
                                <button
                                    onClick={() => setFilterStatus('all')}
                                    className="hover:text-indigo-900 dark:hover:text-indigo-100"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                        {searchTerm && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                Search: {searchTerm}
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="hover:text-indigo-900 dark:hover:text-indigo-100"
                                >
                                    ×
                                </button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Kanban Board */}
            {filteredRisks.length > 0 ? (
                <div className="max-h-[900px] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        {groupedByPhase.map(({ phase, risks }) => (
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
                                            {risks.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-2.5 space-y-2.5 overflow-y-auto custom-scrollbar max-h-[70vh]">
                                    {risks.map(risk => {
                                        const cell = cells.find(c => c.id === risk.cellId)
                                        if (!cell) return null

                                        return (
                                            <CellCard key={cell.id} cell={cell} risk={risk} />
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">No Cells Found</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Adjust your filters to see more cells.</p>
                </div>
            )}
        </div>
    )
}

interface CellCardProps {
    cell: Cell
    risk: ReturnType<typeof getAllCellScheduleRisks>[0]
}

function formatWeek(value?: number) {
    if (value === undefined || value === null || Number.isNaN(value)) return '—'
    return `CW ${value}`
}

function MetricChip({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{value}</div>
        </div>
    )
}

function CellCard({ cell, risk }: CellCardProps) {
    const project = useProjects().find(p => p.id === cell.projectId)
    const styles = STATUS_STYLES[risk.status]

    return (
        <Link
            to={`/projects/${cell.projectId}/cells/${encodeURIComponent(cell.id)}`}
            state={{ from: '/readiness', fromLabel: 'Readiness' }}
            className={cn(
                "group relative block rounded-md border transition-all hover:-translate-y-0.5 hover:shadow-md",
                "bg-white dark:bg-gray-800",
                styles.border,
                styles.accent
            )}
        >
            {/* Header with status */}
            <div className={cn("px-3 py-2 border-b", styles.border, styles.bg)}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", styles.dot)} />
                        <span className={cn("text-[11px] font-semibold truncate", styles.text)}>
                            {cell.name}
                        </span>
                    </div>
                    {risk.completion !== null && (
                        <span className={cn("text-[10px] font-bold flex-shrink-0", styles.text)}>
                            {risk.completion}%
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-3 py-2.5 space-y-2">
                {/* Project */}
                {project && (
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate font-semibold">
                        {project.name}
                    </div>
                )}

                {/* Engineer */}
                {cell.assignedEngineer && (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-500">
                        <User className="h-2.5 w-2.5 flex-shrink-0" />
                        <span className="truncate">{cell.assignedEngineer}</span>
                    </div>
                )}

                {/* Due Date or Days Late */}
                {risk.daysLate && risk.daysLate > 0 ? (
                    <div className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                        <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                        <span>{risk.daysLate}d late</span>
                    </div>
                ) : cell.schedule?.dueDate ? (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-500">
                        <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                        <span>{new Date(cell.schedule.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                ) : null}
            </div>
        </Link>
    )
}

export default ReadinessBoard
