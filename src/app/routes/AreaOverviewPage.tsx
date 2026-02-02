import { ReactNode } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
    ChevronRight,
    LayoutDashboard,
    CalendarDays,
    CalendarClock,
    Play,
    Monitor,
    PackageCheck,
    DatabaseZap,
    ClipboardCheck
} from 'lucide-react'
import { PageHeader } from '../../ui/components/PageHeader'
import { PageHint } from '../../ui/components/PageHint'
import { StatCard } from '../../ui/components/StatCard'
import { EmptyState } from '../../ui/components/EmptyState'
import { useOverviewSchedule } from '../../domain/coreStore'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { cn } from '../../ui/lib/utils'

export function AreaOverviewPage() {
    const { areaKey } = useParams<{ areaKey: string }>()
    const navigate = useNavigate()
    const title = areaKey ? decodeURIComponent(areaKey) : 'Area'
    const overview = useOverviewSchedule()
    const { areaMetrics } = useCrossRefData()
    const areaKeyDecoded = areaKey ? decodeURIComponent(areaKey) : ''
    const areaValues = areaKeyDecoded ? areaMetrics[areaKeyDecoded] : undefined

    const formatWeek = (value?: number) => {
        if (value === undefined || value === null || Number.isNaN(value)) return '—'
        return `CW ${value}`
    }

    const formatNumber = (value?: number, suffix = '') => {
        if (value === undefined || value === null || Number.isNaN(value)) return '—'
        return `${value}${suffix}`
    }

    const formatPercent = (value?: number | null) => {
        if (value === undefined || value === null || Number.isNaN(value)) return '—'
        const pct = value > 1 ? value : value * 100
        return `${pct.toFixed(1)}%`
    }

    const ProgressBar = ({ value }: { value?: number | null }) => {
        const pct = value === undefined || value === null || Number.isNaN(value)
            ? 0
            : (value > 1 ? value : value * 100)
        const clamped = Math.max(0, Math.min(100, pct))
        const empty = value === undefined || value === null || Number.isNaN(value)

        return (
            <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {!empty && (
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${clamped}%` }}
                    />
                )}
            </div>
        )
    }

    const getVariant = (value?: number): 'default' | 'success' | 'warning' | 'danger' => {
        if (value === undefined || value === null || Number.isNaN(value)) return 'default'
        const pct = value > 1 ? value : value * 100
        if (pct >= 90) return 'success'
        if (pct >= 50) return 'warning'
        return 'danger'
    }

    const sections: Array<{
        title: string
        icon: ReactNode
        accent: string
        items: { label: string; value: string }[]
    }> = [
        {
            title: 'Timeline',
            icon: <CalendarDays className="h-4 w-4" />,
            accent: 'border-l-indigo-500 dark:border-l-indigo-400',
            items: [
                { label: 'Current Week', value: formatWeek(overview?.currentWeek) },
                { label: 'Current Job Duration', value: formatNumber(overview?.currentJobDuration, ' wks') },
                { label: 'Job Start', value: formatWeek(overview?.jobStartWeek) },
                { label: 'Job End', value: formatWeek(overview?.jobEndWeek) },
                { label: 'Complete Job Duration', value: formatNumber(overview?.completeJobDuration, ' wks') }
            ]
        },
        {
            title: '1st Stage Simulation',
            icon: <Play className="h-4 w-4" />,
            accent: 'border-l-emerald-500 dark:border-l-emerald-400',
            items: [
                { label: 'Complete', value: formatWeek(overview?.firstStageSimComplete) },
                { label: 'Duration', value: formatNumber(overview?.firstStageSimDuration, ' wks') },
                { label: '% Complete per Week', value: formatPercent(overview?.firstStageSimPerWeek) },
                { label: '% Complete Required', value: formatPercent(overview?.firstStageSimRequired) }
            ]
        },
        {
            title: 'Virtual Commissioning',
            icon: <Monitor className="h-4 w-4" />,
            accent: 'border-l-amber-500 dark:border-l-amber-400',
            items: [
                { label: 'VC Start', value: formatWeek(overview?.vcStartWeek) },
                { label: 'Job Duration to VC Start', value: formatNumber(overview?.jobDurationToVcStart, ' wks') },
                { label: '% VC Ready per Week', value: formatPercent(overview?.vcReadyPerWeek) },
                { label: 'VC Ready Required', value: formatPercent(overview?.vcReadyRequired) }
            ]
        },
        {
            title: 'Final Deliverables',
            icon: <PackageCheck className="h-4 w-4" />,
            accent: 'border-l-blue-500 dark:border-l-blue-400',
            items: [
                { label: 'Complete End', value: formatWeek(overview?.finalDeliverablesEndWeek) },
                { label: 'Job Duration', value: formatNumber(overview?.finalDeliverablesDuration, ' wks') },
                { label: '% Complete per Week', value: formatPercent(overview?.finalDeliverablesPerWeek) },
                { label: '% Complete Required', value: formatPercent(overview?.finalDeliverablesRequired) }
            ]
        }
    ]

    const hasData = overview !== undefined
    const hasAreaMetrics = areaValues !== undefined

    const readinessMetrics = [
        { label: 'ROBOT SIMULATION', value: areaValues?.['ROBOT SIMULATION'] },
        { label: 'JOINING', value: areaValues?.['JOINING'] },
        { label: 'GRIPPER', value: areaValues?.['GRIPPER'] },
        { label: 'FIXTURE', value: areaValues?.['FIXTURE'] },
        { label: 'DOCUMENTATION', value: areaValues?.['DOCUMENTATION'] },
        { label: 'MRS', value: areaValues?.['MRS'] },
        { label: 'OLP', value: areaValues?.['OLP'] },
        { label: 'SAFETY', value: areaValues?.['SAFETY'] },
        { label: 'CABLE & HOSE LENGTH', value: areaValues?.['CABLE & HOSE LENGTH'] },
        { label: 'LAYOUT', value: areaValues?.['LAYOUT'] },
        { label: '1st STAGE SIM COMPLETION', value: areaValues?.['1st STAGE SIM COMPLETION'] },
        { label: 'VC READY', value: areaValues?.['VC READY'] },
        { label: 'FINAL DELIVERABLES COMPLETION', value: areaValues?.['FINAL DELIVERABLES COMPLETION'] }
    ]

    return (
        <div className="space-y-6">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
                <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white">{title}</span>
            </nav>

            <PageHeader
                title={`Area Overview — ${title}`}
                subtitle={
                    <PageHint
                        standardText="Timeline, simulation milestones, and discipline readiness for this area."
                        flowerText="Context at a glance."
                    />
                }
            />

            {/* Empty State */}
            {!hasData && !hasAreaMetrics && (
                <EmptyState
                    title="No Overview Data"
                    message="No metrics found for this area. Load or reload your simulation file in the Data Loader to populate overview data."
                    icon={<DatabaseZap className="h-7 w-7" />}
                    ctaLabel="Go to Data Loader"
                    onCtaClick={() => navigate('/data-loader')}
                />
            )}

            {/* Hero Summary Strip */}
            {(hasData || hasAreaMetrics) && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Current Week"
                        value={formatWeek(overview?.currentWeek)}
                        subtitle={`Job: ${formatWeek(overview?.jobStartWeek)} → ${formatWeek(overview?.jobEndWeek)}`}
                        icon={<CalendarClock className="h-5 w-5" />}
                    />
                    <StatCard
                        title="1st Stage Sim"
                        value={formatPercent(overview?.firstStageSimRequired)}
                        subtitle={`Complete by ${formatWeek(overview?.firstStageSimComplete)}`}
                        icon={<Play className="h-5 w-5" />}
                        variant={getVariant(overview?.firstStageSimRequired)}
                    />
                    <StatCard
                        title="VC Readiness"
                        value={formatPercent(overview?.vcReadyRequired)}
                        subtitle={`Start ${formatWeek(overview?.vcStartWeek)}`}
                        icon={<Monitor className="h-5 w-5" />}
                        variant={getVariant(overview?.vcReadyRequired)}
                    />
                    <StatCard
                        title="Final Deliverables"
                        value={formatPercent(overview?.finalDeliverablesRequired)}
                        subtitle={`End ${formatWeek(overview?.finalDeliverablesEndWeek)}`}
                        icon={<PackageCheck className="h-5 w-5" />}
                        variant={getVariant(overview?.finalDeliverablesRequired)}
                    />
                </div>
            )}

            {/* Schedule Details Section */}
            {(hasData || hasAreaMetrics) && (
                <>
                    <div className="flex items-center gap-2 pt-2">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide uppercase">
                            Schedule Details
                        </h2>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {sections.map(section => (
                            <div
                                key={section.title}
                                className={cn(
                                    'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm',
                                    'border-l-4',
                                    section.accent
                                )}
                            >
                                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2.5">
                                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400">
                                        {section.icon}
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {section.title}
                                    </h3>
                                </div>
                                <div className="px-5 py-2">
                                    {section.items.map((item, idx) => (
                                        <div
                                            key={item.label}
                                            className={cn(
                                                'flex items-center justify-between py-2.5',
                                                idx < section.items.length - 1 && 'border-b border-gray-100 dark:border-gray-700/30'
                                            )}
                                        >
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                {item.label}
                                            </span>
                                            <span className={cn(
                                                'text-sm font-semibold tabular-nums',
                                                item.value === '—'
                                                    ? 'text-gray-300 dark:text-gray-600'
                                                    : 'text-gray-900 dark:text-white'
                                            )}>
                                                {item.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Readiness Measurements Section Heading */}
            {(hasData || hasAreaMetrics) && (
                <div className="flex items-center gap-2 pt-2">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide uppercase">
                        Readiness Measurements
                    </h2>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>
            )}

            {/* Readiness Measurements */}
            {(hasData || hasAreaMetrics) && (
                <div className={cn(
                    'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm',
                    'border-l-4 border-l-emerald-500 dark:border-l-emerald-400'
                )}>
                    <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2.5">
                        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400">
                            <ClipboardCheck className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Readiness Measurements</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        {readinessMetrics.map((metric, idx) => (
                            <div
                                key={metric.label}
                                className={cn(
                                    'px-5 py-3 space-y-2',
                                    idx < readinessMetrics.length - 2 && 'border-b border-gray-100 dark:border-gray-700/30',
                                    idx % 2 === 0 && 'md:border-r md:border-r-gray-100 md:dark:border-r-gray-700/30'
                                )}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">{metric.label}</span>
                                    <span className={cn(
                                        "text-sm font-semibold tabular-nums",
                                        metric.value === undefined || metric.value === null
                                            ? 'text-gray-300 dark:text-gray-600'
                                            : 'text-gray-900 dark:text-white'
                                    )}>
                                        {formatPercent(metric.value)}
                                    </span>
                                </div>
                                <ProgressBar value={metric.value} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AreaOverviewPage
