import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { useCells, useProjects } from '../../domain/coreStore'
import { getAllCellScheduleRisks } from '../../domain/scheduleMetrics'
import { SchedulePhase, Cell } from '../../domain/core'
import { Filter, Calendar, User } from 'lucide-react'

const PHASE_LABELS: Record<SchedulePhase, string> = {
    unspecified: 'Unspecified',
    presim: 'Pre-Simulation',
    offline: 'Offline Programming',
    onsite: 'On-Site',
    rampup: 'Ramp-Up',
    handover: 'Handover'
}

const STATUS_COLORS = {
    onTrack: 'bg-green-100 text-green-800 border-green-200',
    atRisk: 'bg-orange-100 text-orange-800 border-orange-200',
    late: 'bg-red-100 text-red-800 border-red-200',
    unknown: 'bg-gray-100 text-gray-600 border-gray-200'
}

export function ReadinessBoard() {
    const cells = useCells()
    const projects = useProjects()
    const cellRisks = getAllCellScheduleRisks()

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

    return (
        <div className="space-y-6">
            <PageHeader
                title="Readiness Board"
                subtitle="Track cells by schedule phase and status"
            />

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                <div className="flex items-center space-x-4">
                    <Filter className="h-5 w-5 text-gray-400" />

                    <select
                        value={filterPhase}
                        onChange={(e) => setFilterPhase(e.target.value as SchedulePhase | 'all')}
                        className="border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Phases</option>
                        {phases.map(p => (
                            <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                        ))}
                    </select>

                    <select
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        className="border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="all">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <div className="flex-1" />

                    <div className="text-sm text-gray-500">
                        {filteredRisks.length} cells
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupedByPhase.map(({ phase, risks }) => (
                    <div key={phase} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            {PHASE_LABELS[phase]}
                            <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                                {risks.length}
                            </span>
                        </h3>

                        <div className="space-y-2">
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

            {filteredRisks.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Cells Found</h3>
                    <p className="text-gray-500 mt-2">Adjust your filters to see more cells.</p>
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

    return (
        <Link
            to={`/projects/${cell.projectId}/cells/${cell.id}`}
            className="block bg-white dark:bg-gray-800 rounded border-l-4 shadow-sm hover:shadow-md transition-shadow p-3"
            style={{
                borderLeftColor:
                    risk.status === 'late' ? '#ef4444' :
                        risk.status === 'atRisk' ? '#f97316' :
                            risk.status === 'onTrack' ? '#22c55e' : '#6b7280'
            }}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="font-medium text-sm text-gray-900 dark:text-white">
                    {cell.name}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[risk.status]}`}>
                    {risk.status}
                </span>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                {project && (
                    <div className="truncate">{project.name}</div>
                )}

                {cell.assignedEngineer && (
                    <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {cell.assignedEngineer}
                    </div>
                )}

                {risk.completion !== null && (
                    <div className="flex items-center justify-between mt-2">
                        <span>Progress</span>
                        <span className="font-medium">{risk.completion}%</span>
                    </div>
                )}

                {risk.daysLate && risk.daysLate > 0 && (
                    <div className="text-red-600 font-medium mt-1">
                        {risk.daysLate} days late
                    </div>
                )}

                {cell.schedule?.dueDate && (
                    <div className="text-xs text-gray-400 mt-1">
                        Due: {new Date(cell.schedule.dueDate).toLocaleDateString()}
                    </div>
                )}
            </div>
        </Link>
    )
}
