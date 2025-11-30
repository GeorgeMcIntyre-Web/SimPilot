import { useParams, Link } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { useProject, useCells } from '../../domain/coreStore'
import { getCellScheduleRisk } from '../../domain/scheduleMetrics'
import { ArrowLeft, Calendar, AlertCircle } from 'lucide-react'

export function TimelineView() {
    const { projectId } = useParams<{ projectId: string }>()
    const project = useProject(projectId || '')
    const cells = useCells(projectId)

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

    // Calculate timeline bounds
    let minDate: Date | null = null
    let maxDate: Date | null = null

    for (const item of cellsWithData) {
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
                    subtitle={minDate && maxDate
                        ? `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()} (${totalDays} days)`
                        : 'No schedule data available'
                    }
                />
            </div>

            {cellsWithData.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Timeline Data</h3>
                    <p className="text-gray-500 mt-2">
                        Cells in this project don't have schedule dates yet.
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    {/* Timeline Header */}
                    <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
                        <div>Cell</div>
                        <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">On Track</span>
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">At Risk</span>
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Late</span>
                        </div>
                    </div>

                    {/* Timeline Grid */}
                    <div className="space-y-3">
                        {cellsWithData.map(({ cell, risk, start, end }) => {
                            const leftPercent = minDate
                                ? ((start.getTime() - minDate.getTime()) / (maxDate!.getTime() - minDate.getTime())) * 100
                                : 0
                            const widthPercent = minDate
                                ? ((end.getTime() - start.getTime()) / (maxDate!.getTime() - minDate.getTime())) * 100
                                : 0

                            const barColor =
                                risk.status === 'late' ? 'bg-red-500' :
                                    risk.status === 'atRisk' ? 'bg-orange-500' :
                                        risk.status === 'onTrack' ? 'bg-green-500' : 'bg-gray-400'

                            return (
                                <div key={cell.id} className="relative">
                                    {/* Cell info */}
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Link
                                            to={`/projects/${projectId}/cells/${cell.id}`}
                                            className="text-sm font-medium text-blue-600 hover:underline min-w-[120px]"
                                        >
                                            {cell.name}
                                        </Link>
                                        {cell.assignedEngineer && (
                                            <span className="text-xs text-gray-500">
                                                {cell.assignedEngineer}
                                            </span>
                                        )}
                                        {risk.completion !== null && (
                                            <span className="text-xs text-gray-500">
                                                {risk.completion}%
                                            </span>
                                        )}
                                    </div>

                                    {/* Timeline bar */}
                                    <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded">
                                        <div
                                            className={`absolute h-full ${barColor} rounded flex items-center px-2 text-white text-xs font-medium`}
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
                                </div>
                            )
                        })}
                    </div>

                    {/* Current date marker */}
                    {currentDatePosition !== null && (
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-blue-600"
                            style={{ left: `${currentDatePosition}%` }}
                            title="Today"
                        >
                            <div className="absolute -top-2 -left-8 text-xs text-blue-600 font-medium whitespace-nowrap">
                                Today
                            </div>
                        </div>
                    )}
                </div>
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
                                to={`/projects/${projectId}/cells/${cell.id}`}
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
