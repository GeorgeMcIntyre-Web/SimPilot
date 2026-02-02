import { useParams, Link } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { PageHint } from '../../ui/components/PageHint'
import { useOverviewSchedule } from '../../domain/coreStore'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { cn } from '../../ui/lib/utils'

export function AreaOverviewPage() {
    const { areaKey } = useParams<{ areaKey: string }>()
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

    const formatPercent = (value?: number) => {
        if (value === undefined || value === null || Number.isNaN(value)) return '—'
        const pct = value > 1 ? value : value * 100
        return `${pct.toFixed(1)}%`
    }

    const sections: Array<{ title: string; items: { label: string; value: string }[] }> = [
        {
            title: 'Timeline',
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
            items: [
                { label: 'Complete', value: formatWeek(overview?.firstStageSimComplete) },
                { label: 'Duration', value: formatNumber(overview?.firstStageSimDuration, ' wks') },
                { label: '% Complete per Week', value: formatPercent(overview?.firstStageSimPerWeek) },
                { label: '% Complete Required', value: formatPercent(overview?.firstStageSimRequired) }
            ]
        },
        {
            title: 'Virtual Commissioning',
            items: [
                { label: 'VC Start', value: formatWeek(overview?.vcStartWeek) },
                { label: 'Job Duration to VC Start', value: formatNumber(overview?.jobDurationToVcStart, ' wks') },
                { label: '% VC Ready per Week', value: formatPercent(overview?.vcReadyPerWeek) },
                { label: 'VC Ready Required', value: formatPercent(overview?.vcReadyRequired) }
            ]
        },
        {
            title: 'Final Deliverables',
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
        { label: 'ROBOT SIMULATION', value: areaValues?.['ROBOT SIMULATION'] ?? overview?.robotSimulation },
        { label: 'JOINING', value: areaValues?.['JOINING'] ?? overview?.joining },
        { label: 'GRIPPER', value: areaValues?.['GRIPPER'] ?? overview?.gripper },
        { label: 'FIXTURE', value: areaValues?.['FIXTURE'] ?? overview?.fixture },
        { label: 'DOCUMENTATION', value: areaValues?.['DOCUMENTATION'] ?? overview?.documentation },
        { label: 'MRS', value: areaValues?.['MRS'] ?? overview?.mrs },
        { label: 'OLP', value: areaValues?.['OLP'] ?? overview?.olp },
        { label: 'SAFETY', value: areaValues?.['SAFETY'] ?? overview?.safety },
        { label: 'CABLE & HOSE LENGTH', value: areaValues?.['CABLE & HOSE LENGTH'] ?? overview?.cableAndHoseLength },
        { label: 'LAYOUT', value: areaValues?.['LAYOUT'] ?? overview?.layout },
        { label: '1st STAGE SIM COMPLETION', value: areaValues?.['1st STAGE SIM COMPLETION'] ?? overview?.firstStageSimCompletion },
        { label: 'VC READY', value: areaValues?.['VC READY'] ?? overview?.vcReady },
        { label: 'FINAL DELIVERABLES COMPLETION', value: areaValues?.['FINAL DELIVERABLES COMPLETION'] ?? overview?.finalDeliverablesCompletion }
    ]

    return (
        <div className="space-y-4">
            <PageHeader
                title={`Area Overview — ${title}`}
                subtitle={
                    <PageHint
                        standardText="Area-level overview"
                        flowerText="Timeline and readiness context per area."
                    />
                }
                breadcrumbs={[
                    { label: 'Dashboard', href: '/dashboard' },
                    { label: title, href: '#' }
                ]}
            />

            {!hasData && !hasAreaMetrics && (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-sm text-gray-600 dark:text-gray-300">
                    No overview metrics found. Reload your simulation file to populate the overview data.
                </div>
            )}

            {(hasData || hasAreaMetrics) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {sections.map(section => (
                        <div
                            key={section.title}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                        >
                            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                            </div>
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                                {section.items.map(item => (
                                    <div key={item.label} className="px-4 py-3 flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{item.label}</span>
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            item.value === '—' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
                                        )}>
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(hasData || hasAreaMetrics) && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Readiness Measurements</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Key completion percentages by discipline</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                        {readinessMetrics.map(metric => (
                            <div key={metric.label} className="px-4 py-3 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{metric.label}</span>
                                <span className={cn(
                                    "text-sm font-semibold",
                                    metric.value === undefined || metric.value === null
                                        ? 'text-gray-400 dark:text-gray-500'
                                        : 'text-gray-900 dark:text-white'
                                )}>
                                    {formatPercent(metric.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
                ← Back to Dashboard
            </Link>
        </div>
    )
}

export default AreaOverviewPage
