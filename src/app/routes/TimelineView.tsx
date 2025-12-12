import { useParams, Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { PageHeader } from '../../ui/components/PageHeader'
import { useProject, useCells } from '../../domain/coreStore'
import { getCellScheduleRisk } from '../../domain/scheduleMetrics'
import { ArrowLeft, Calendar, AlertCircle, Filter, ZoomIn, ZoomOut, Users, TrendingUp } from 'lucide-react'
import { PageHint } from '../../ui/components/PageHint'
import { cn } from '../../ui/lib/utils'

type ViewMode = 'compact' | 'comfortable' | 'spacious'
type FilterStatus = 'all' | 'onTrack' | 'atRisk' | 'late'

export function TimelineView() {
    const { projectId } = useParams<{ projectId: string }>()
    const project = useProject(projectId || '')
    const cells = useCells(projectId)

    const [viewMode, setViewMode] = useState<ViewMode>('comfortable')
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
    const [searchTerm, setSearchTerm] = useState('')

    if (!project) {
        return (
            <div>
                <PageHeader title="Project Not Found" />
                <p className="text-gray-500">The project you are looking for does not exist.</p>
            </div>
        )
    }

    // Get cells with schedule data
    const cellsWithData = cells
        .filter(c => c.schedule?.plannedStart && c.schedule?.plannedEnd)
        .map(c => ({
            cell: c,
            risk: getCellScheduleRisk(c),
            start: new Date(c.schedule!.plannedStart!),
            end: new Date(c.schedule!.plannedEnd!)
        }))

    const cellsWithoutData = cells.filter(c => !c.schedule?.plannedStart || !c.schedule?.plannedEnd)

    // Filter cells based on status and search
    const filteredCells = useMemo(() => {
        return cellsWithData.filter(item => {
            // Status filter
            if (filterStatus !== 'all' && item.risk.status !== filterStatus) {
                return false
            }

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                const matchesName = item.cell.name.toLowerCase().includes(term)
                const matchesEngineer = item.cell.assignedEngineer?.toLowerCase().includes(term)
                const matchesPhase = item.cell.schedule?.phase?.toLowerCase().includes(term)
                return matchesName || matchesEngineer || matchesPhase
            }

            return true
        })
    }, [cellsWithData, filterStatus, searchTerm])

    // Calculate statistics
    const stats = useMemo(() => {
        const total = cellsWithData.length
        const onTrack = cellsWithData.filter(c => c.risk.status === 'onTrack').length
        const atRisk = cellsWithData.filter(c => c.risk.status === 'atRisk').length
        const late = cellsWithData.filter(c => c.risk.status === 'late').length
        return { total, onTrack, atRisk, late }
    }, [cellsWithData])

    // Calculate timeline bounds
    let minDate: Date | null = null
    let maxDate: Date | null = null

    for (const item of filteredCells) {
        if (!minDate || item.start < minDate) minDate = item.start
        if (!maxDate || item.end > maxDate) maxDate = item.end
    }

    // Add padding to timeline
    if (minDate && maxDate) {
        const padding = (maxDate.getTime() - minDate.getTime()) * 0.1
        minDate = new Date(minDate.getTime() - padding)
        maxDate = new Date(maxDate.getTime() + padding)
    }

    const totalDays = minDate && maxDate
        ? Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0

    // Find current date position
    const now = new Date()
    const currentDatePosition = minDate && maxDate && now >= minDate && now <= maxDate
        ? ((now.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) * 100
        : null

    // View mode settings
    const barHeight = viewMode === 'compact' ? 'h-6' : viewMode === 'comfortable' ? 'h-8' : 'h-10'
    const spacing = viewMode === 'compact' ? 'space-y-2' : viewMode === 'comfortable' ? 'space-y-3' : 'space-y-4'

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Link
                    to={`/projects/${projectId}`}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <PageHeader
                    title={`Timeline: ${project.name}`}
                    subtitle={
                        <PageHint
                            standardText={minDate && maxDate
                                ? `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()} (${totalDays} days)`
                                : 'No schedule data available'
                            }
                            flowerText={minDate && maxDate
                                ? `Are we late, at risk, or safe across time? (${totalDays} days)`
                                : 'No schedule data available yet.'
                            }
                        />
                    }
                />
            </div>

            {/* Statistics Cards */}
            {cellsWithData.length > 0 && (
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
                                <TrendingUp className="h-4 w-4 text-emerald-600" />
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
                                <AlertCircle className="h-4 w-4 text-rose-600" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {cellsWithData.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Timeline Data</h3>
                    <p className="text-gray-500 mt-2">
                        Cells in this project don't have schedule dates yet.
                    </p>
                </div>
            ) : (
                <>
                    {/* Controls Bar */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            {/* Search */}
                            <div className="flex-1 max-w-md">
                                <input
                                    type="text"
                                    placeholder="Search cells, engineers, or phases..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Status Filter */}
                                <div className="flex items-center gap-1.5">
                                    <Filter className="h-4 w-4 text-gray-400" />
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                                        className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="all">All Status ({stats.total})</option>
                                        <option value="onTrack">On Track ({stats.onTrack})</option>
                                        <option value="atRisk">At Risk ({stats.atRisk})</option>
                                        <option value="late">Late ({stats.late})</option>
                                    </select>
                                </div>

                                {/* View Mode */}
                                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setViewMode('compact')}
                                        className={cn(
                                            "px-2.5 py-1.5 text-xs font-medium transition-colors",
                                            viewMode === 'compact'
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                        )}
                                        title="Compact View"
                                    >
                                        <ZoomOut className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('comfortable')}
                                        className={cn(
                                            "px-2.5 py-1.5 text-xs font-medium transition-colors border-x border-gray-300 dark:border-gray-600",
                                            viewMode === 'comfortable'
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                        )}
                                        title="Comfortable View"
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('spacious')}
                                        className={cn(
                                            "px-2.5 py-1.5 text-xs font-medium transition-colors",
                                            viewMode === 'spacious'
                                                ? "bg-indigo-600 text-white"
                                                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                        )}
                                        title="Spacious View"
                                    >
                                        <ZoomIn className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Active Filters */}
                        {(filterStatus !== 'all' || searchTerm) && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-xs text-gray-500">Active filters:</span>
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

                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 relative overflow-x-auto">
                        {/* Timeline Header */}
                        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
                            <div className="font-medium">Cell ({filteredCells.length})</div>
                            <div className="flex items-center space-x-2">
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded text-xs font-medium">On Track</span>
                                <span className="px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded text-xs font-medium">At Risk</span>
                                <span className="px-2 py-1 bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 rounded text-xs font-medium">Late</span>
                            </div>
                        </div>

                        {filteredCells.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 dark:text-gray-400">No cells match the current filters.</p>
                            </div>
                        ) : (
                            <>
                                {/* Timeline Grid */}
                                <div className={spacing}>
                                    {filteredCells.map(({ cell, risk, start, end }) => {
                            const leftPercent = minDate
                                ? ((start.getTime() - minDate.getTime()) / (maxDate!.getTime() - minDate.getTime())) * 100
                                : 0
                            const widthPercent = minDate
                                ? ((end.getTime() - start.getTime()) / (maxDate!.getTime() - minDate.getTime())) * 100
                                : 0

                            const barColor =
                                risk.status === 'late' ? 'bg-rose-500' :
                                    risk.status === 'atRisk' ? 'bg-amber-500' :
                                        risk.status === 'onTrack' ? 'bg-emerald-500' : 'bg-gray-400'

                            return (
                                <div key={cell.id} className="relative group">
                                    {/* Cell info */}
                                    <div className="flex items-center space-x-2 mb-1.5">
                                        <Link
                                            to={`/projects/${projectId}/cells/${encodeURIComponent(cell.id)}`}
                                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline min-w-[120px]"
                                        >
                                            {cell.name}
                                        </Link>
                                        {cell.assignedEngineer && (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                <Users className="h-3 w-3" />
                                                {cell.assignedEngineer}
                                            </span>
                                        )}
                                        {risk.completion !== null && (
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                {risk.completion}%
                                            </span>
                                        )}
                                    </div>

                                    {/* Timeline bar */}
                                    <div className={cn("relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden", barHeight)}>
                                        <div
                                            className={cn(
                                                "absolute h-full rounded-lg flex items-center px-2 text-white text-xs font-medium shadow-sm transition-all duration-200 group-hover:shadow-md",
                                                barColor
                                            )}
                                            style={{
                                                left: `${leftPercent}%`,
                                                width: `${widthPercent}%`
                                            }}
                                            title={`${start.toLocaleDateString()} - ${end.toLocaleDateString()}`}
                                        >
                                            <span className="truncate">
                                                {cell.schedule?.phase || 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Dates below bar */}
                                    {viewMode !== 'compact' && (
                                        <div className="flex justify-between mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                                            <span>{start.toLocaleDateString()}</span>
                                            <span>{end.toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Current date marker */}
                    {currentDatePosition !== null && (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-indigo-600 z-10"
                            style={{ left: `${currentDatePosition}%` }}
                            title="Today"
                        >
                            <div className="absolute -top-2 -left-8 text-xs text-indigo-600 dark:text-indigo-400 font-semibold whitespace-nowrap bg-white dark:bg-gray-800 px-1 rounded">
                                Today
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    </>
            )}

            {/* Cells without schedule data */}
            {cellsWithoutData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
                        Cells Without Schedule Data ({cellsWithoutData.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {cellsWithoutData.map(cell => (
                            <Link
                                key={cell.id}
                                to={`/projects/${projectId}/cells/${encodeURIComponent(cell.id)}`}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                {cell.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
