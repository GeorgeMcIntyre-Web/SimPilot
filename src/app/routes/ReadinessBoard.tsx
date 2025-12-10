import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { useCells, useProjects } from '../../domain/coreStore'
import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics'
import { SchedulePhase, Cell } from '../../domain/core'
import { Filter, Calendar, User, Clock } from 'lucide-react'
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

const PHASE_ICONS: Record<SchedulePhase, string> = {
    unspecified: '⚪',
    presim: '🌱',
    offline: '🌿',
    onsite: '🌷',
    rampup: '🌻',
    handover: '💐'
}

const STATUS_STYLES = {
    onTrack: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500'
    },
    atRisk: {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500'
    },
    late: {
        bg: 'bg-rose-50 dark:bg-rose-950/30',
        text: 'text-rose-700 dark:text-rose-400',
        border: 'border-rose-200 dark:border-rose-800',
        dot: 'bg-rose-500'
    },
    unknown: {
        bg: 'bg-gray-50 dark:bg-gray-800/30',
        text: 'text-gray-600 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-700',
        dot: 'bg-gray-400'
    }
}

export function ReadinessBoard() {
    const cells = useCells()
    const projects = useProjects()
    const cellRisks = getAllCellScheduleRisks()
    const navigate = useNavigate()

    const [filterPhase, setFilterPhase] = useState<SchedulePhase | 'all'>('all')
    const [filterProject, setFilterProject] = useState<string>('all')

    // Get filtered cells with risk data
    const filteredRisks = cellRisks.filter(risk => {
        if (filterPhase !== 'all' && risk.phase !== filterPhase) return false
        if (filterProject !== 'all' && risk.projectId !== filterProject) return false
        return true
    })

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

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />

                    <select
                        value={filterPhase}
                        onChange={(e) => setFilterPhase(e.target.value as SchedulePhase | 'all')}
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Phases</option>
                        {phases.map(p => (
                            <option key={p} value={p}>{PHASE_ICONS[p]} {PHASE_LABELS[p]}</option>
                        ))}
                    </select>

                    <select
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <div className="flex-1" />

                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {filteredRisks.length} {filteredRisks.length === 1 ? 'cell' : 'cells'}
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            {filteredRisks.length > 0 ? (
                <div className="max-h-[900px] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                        {groupedByPhase.map(({ phase, risks }) => (
                            <div key={phase} className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{PHASE_ICONS[phase]}</span>
                                            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                {PHASE_LABELS[phase]}
                                            </h3>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                            {risks.length}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-2 space-y-2">
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

function CellCard({ cell, risk }: CellCardProps) {
    const project = useProjects().find(p => p.id === cell.projectId)
    const styles = STATUS_STYLES[risk.status]

    return (
        <Link
            to={`/projects/${cell.projectId}/cells/${cell.id}`}
            state={{ from: '/readiness', fromLabel: 'Readiness' }}
            className={cn(
                "block rounded-md border transition-all hover:shadow-sm",
                "bg-white dark:bg-gray-800",
                styles.border
            )}
        >
            {/* Header with status */}
            <div className={cn("px-2.5 py-1.5 border-b", styles.border, styles.bg)}>
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
            <div className="px-2.5 py-2 space-y-1.5">
                {/* Project */}
                {project && (
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate font-medium">
                        {project.name}
                    </div>
                )}

                {/* Engineer */}
                {cell.assignedEngineer && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-500">
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
