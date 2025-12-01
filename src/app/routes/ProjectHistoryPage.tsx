import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { useProject } from '../../domain/coreStore'
import {
    useSnapshotTimeline,
    useSnapshotComparison,
    useProjectHistoryStats,
    TimelineEntry
} from '../../hooks/useSnapshotDiff'
import { describeCellDelta } from '../../domain/history/snapshotDiff'
import { CellDelta } from '../../domain/history/snapshotTypes'
import {
    ArrowLeft,
    GitCommit,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    ArrowRightLeft
} from 'lucide-react'
import { PageHint } from '../../ui/components/PageHint'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProjectHistoryPage() {
    const { projectId } = useParams<{ projectId: string }>()
    const project = useProject(projectId || '')
    const timeline = useSnapshotTimeline(projectId || '')
    const stats = useProjectHistoryStats(projectId || '')
    const comparison = useSnapshotComparison(projectId || '')

    const [expandedSnapshots, setExpandedSnapshots] = useState<Set<string>>(new Set())
    const [showComparison, setShowComparison] = useState(false)

    if (!project) {
        return (
            <div>
                <PageHeader title="Project Not Found" />
                <p className="text-gray-500 dark:text-gray-400">
                    The project you are looking for does not exist.
                </p>
            </div>
        )
    }

    const toggleExpand = (snapshotId: string) => {
        const newSet = new Set(expandedSnapshots)
        if (newSet.has(snapshotId)) {
            newSet.delete(snapshotId)
        } else {
            newSet.add(snapshotId)
        }
        setExpandedSnapshots(newSet)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Link
                    to={`/projects/${projectId}`}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </Link>
                <PageHeader
                    title={`History: ${project.name}`}
                    subtitle={
                        <PageHint
                            standardText={`${stats.snapshotCount} snapshots captured`}
                            flowerText="Git-style history for your simulation data"
                        />
                    }
                    actions={
                        <button
                            onClick={() => setShowComparison(!showComparison)}
                            className={`flex items-center px-4 py-2 rounded-md transition-colors ${showComparison
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            Compare Snapshots
                        </button>
                    }
                />
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Snapshots"
                    value={stats.snapshotCount}
                    icon={<GitCommit className="h-5 w-5" />}
                />
                <StatCard
                    label="Issues Resolved"
                    value={stats.resolvedFlagsTotal}
                    icon={<CheckCircle className="h-5 w-5 text-green-500" />}
                    variant="success"
                />
                <StatCard
                    label="New Issues"
                    value={stats.newFlagsTotal}
                    icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
                    variant="warning"
                />
                <StatCard
                    label="Avg Trend"
                    value={stats.avgCompletionTrend !== null
                        ? `${stats.avgCompletionTrend > 0 ? '+' : ''}${stats.avgCompletionTrend.toFixed(1)}%`
                        : 'N/A'
                    }
                    icon={stats.avgCompletionTrend !== null && stats.avgCompletionTrend > 0
                        ? <TrendingUp className="h-5 w-5 text-green-500" />
                        : stats.avgCompletionTrend !== null && stats.avgCompletionTrend < 0
                            ? <TrendingDown className="h-5 w-5 text-red-500" />
                            : <Minus className="h-5 w-5" />
                    }
                />
            </div>

            {/* Comparison Mode */}
            {showComparison && (
                <ComparisonPanel
                    timeline={timeline}
                    comparison={comparison}
                />
            )}

            {/* Timeline */}
            {timeline.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Snapshot Timeline
                        </h3>
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {timeline.map((entry, index) => (
                            <TimelineRow
                                key={entry.snapshot.id}
                                entry={entry}
                                isFirst={index === 0}
                                isExpanded={expandedSnapshots.has(entry.snapshot.id)}
                                onToggle={() => toggleExpand(entry.snapshot.id)}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
    label: string
    value: string | number
    icon: React.ReactNode
    variant?: 'default' | 'success' | 'warning'
}

function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
    const bgColor = variant === 'success' ? 'bg-green-50 dark:bg-green-900/20'
        : variant === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20'
            : 'bg-white dark:bg-gray-800'

    return (
        <div className={`${bgColor} rounded-lg shadow p-4`}>
            <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400 text-sm">{label}</span>
                {icon}
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {value}
            </div>
        </div>
    )
}

interface TimelineRowProps {
    entry: TimelineEntry
    isFirst: boolean
    isExpanded: boolean
    onToggle: () => void
}

function TimelineRow({ entry, isFirst, isExpanded, onToggle }: TimelineRowProps) {
    const { snapshot, diff, summaryText } = entry
    const date = new Date(snapshot.capturedAt)

    const cellChanges = diff?.cells.filter(c => !c.added && !c.removed) ?? []

    return (
        <div className="px-6 py-4">
            {/* Main row */}
            <div
                className="flex items-start cursor-pointer"
                onClick={onToggle}
            >
                {/* Timeline dot */}
                <div className="flex-shrink-0 mr-4">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${isFirst
                            ? 'bg-indigo-500 ring-4 ring-indigo-100 dark:ring-indigo-900'
                            : 'bg-gray-400'
                        }`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <span className="font-medium text-gray-900 dark:text-white">
                                {formatDate(date)}
                            </span>
                            {isFirst && (
                                <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full">
                                    Latest
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{formatTime(date)}</span>
                            {isExpanded
                                ? <ChevronDown className="h-4 w-4" />
                                : <ChevronRight className="h-4 w-4" />
                            }
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {summaryText}
                    </div>

                    {/* Quick stats */}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                            {snapshot.cellCount} cells
                        </span>
                        {snapshot.avgCompletion !== undefined && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                {snapshot.avgCompletion}% avg
                            </span>
                        )}
                        {snapshot.atRiskCount > 0 && (
                            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">
                                {snapshot.atRiskCount} at risk
                            </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                            by {snapshot.capturedBy}
                        </span>
                    </div>
                </div>
            </div>

            {/* Expanded details */}
            {isExpanded && diff && (
                <div className="mt-4 ml-7 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                    {/* Changes summary */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {diff.summary.cellsAdded > 0 && (
                            <div className="text-sm">
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                    +{diff.summary.cellsAdded}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400"> stations added</span>
                            </div>
                        )}
                        {diff.summary.cellsRemoved > 0 && (
                            <div className="text-sm">
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                    -{diff.summary.cellsRemoved}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400"> stations removed</span>
                            </div>
                        )}
                        {diff.summary.cellsModified > 0 && (
                            <div className="text-sm">
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                    {diff.summary.cellsModified}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400"> modified</span>
                            </div>
                        )}
                    </div>

                    {/* Cell changes */}
                    {cellChanges.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Cell Changes
                            </h4>
                            {cellChanges.slice(0, 10).map(cellDelta => (
                                <CellDeltaRow key={cellDelta.stationKey} delta={cellDelta} />
                            ))}
                            {cellChanges.length > 10 && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 italic">
                                    + {cellChanges.length - 10} more changes
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

interface CellDeltaRowProps {
    delta: CellDelta
}

function CellDeltaRow({ delta }: CellDeltaRowProps) {
    const descriptions = describeCellDelta(delta)

    return (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-3">
            <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {delta.stationKey}
                </span>
                {delta.completionChange && (
                    <CompletionBadge change={delta.completionChange} />
                )}
            </div>
            {descriptions.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {descriptions.map((desc, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400">
                            • {desc}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

interface CompletionBadgeProps {
    change: {
        fromFirstStage: number | null
        toFirstStage: number | null
        fromFinalDeliverables: number | null
        toFinalDeliverables: number | null
    }
}

function CompletionBadge({ change }: CompletionBadgeProps) {
    const { fromFirstStage, toFirstStage } = change

    if (fromFirstStage === null || toFirstStage === null) return null

    const diff = toFirstStage - fromFirstStage
    if (diff === 0) return null

    const isPositive = diff > 0

    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${isPositive
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
            {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {isPositive ? '+' : ''}{diff}%
        </span>
    )
}

interface ComparisonPanelProps {
    timeline: TimelineEntry[]
    comparison: ReturnType<typeof useSnapshotComparison>
}

function ComparisonPanel({ timeline, comparison }: ComparisonPanelProps) {
    return (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Compare Two Snapshots
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        From (older)
                    </label>
                    <select
                        value={comparison.fromId ?? ''}
                        onChange={(e) => comparison.setFrom(e.target.value || null)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">Select snapshot...</option>
                        {timeline.map(entry => (
                            <option key={entry.snapshot.id} value={entry.snapshot.id}>
                                {formatDate(new Date(entry.snapshot.capturedAt))} - {entry.snapshot.cellCount} cells
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        To (newer)
                    </label>
                    <select
                        value={comparison.toId ?? ''}
                        onChange={(e) => comparison.setTo(e.target.value || null)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">Select snapshot...</option>
                        {timeline.map(entry => (
                            <option key={entry.snapshot.id} value={entry.snapshot.id}>
                                {formatDate(new Date(entry.snapshot.capturedAt))} - {entry.snapshot.cellCount} cells
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {comparison.isValid && comparison.diff && (
                <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        Comparison Result
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">Added:</span>
                            <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                                +{comparison.diff.summary.cellsAdded}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">Removed:</span>
                            <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                                -{comparison.diff.summary.cellsRemoved}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">Modified:</span>
                            <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                                {comparison.diff.summary.cellsModified}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500 dark:text-gray-400">Unchanged:</span>
                            <span className="ml-2 font-medium">
                                {comparison.diff.summary.cellsUnchanged}
                            </span>
                        </div>
                    </div>

                    {comparison.diff.summary.avgCompletionDelta !== undefined && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-500 dark:text-gray-400">Avg Completion Change:</span>
                            <span className={`ml-2 font-medium ${comparison.diff.summary.avgCompletionDelta >= 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                {comparison.diff.summary.avgCompletionDelta >= 0 ? '+' : ''}
                                {comparison.diff.summary.avgCompletionDelta.toFixed(1)}%
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function EmptyState() {
    return (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                No History Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                Snapshots are captured automatically when you import data.
                Each import creates a "commit" that you can compare later.
            </p>
        </div>
    )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    })
}
