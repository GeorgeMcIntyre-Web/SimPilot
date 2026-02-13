import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  CalendarDays,
  CalendarClock,
  Play,
  Monitor,
  PackageCheck,
  DatabaseZap,
  ClipboardCheck,
  TrendingUp,
  Target,
  ArrowRight,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react'
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

  const ProgressBar = ({ value, label }: { value?: number | null; label?: string }) => {
    const pct =
      value === undefined || value === null || Number.isNaN(value)
        ? 0
        : value > 1
          ? value
          : value * 100
    const clamped = Math.max(0, Math.min(100, pct))
    const empty = value === undefined || value === null || Number.isNaN(value)

    return (
      <div className="space-y-1.5 flex-1">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
          <span className="text-gray-500 dark:text-gray-400">{label}</span>
          <span
            className={cn(
              clamped >= 90
                ? 'text-emerald-500'
                : clamped >= 50
                  ? 'text-amber-500'
                  : 'text-rose-500',
            )}
          >
            {empty ? '—' : `${clamped.toFixed(1)}%`}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800/50 overflow-hidden relative shadow-inner">
          {!empty && (
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden',
                clamped >= 90
                  ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : clamped >= 50
                    ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
              )}
              style={{ width: `${clamped}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
            </div>
          )}
        </div>
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

  const hasData = overview !== undefined
  const hasAreaMetrics = areaValues !== undefined

  const milestoneGroups = [
    {
      id: 'timeline',
      title: 'Global Timeline',
      icon: <CalendarDays className="h-5 w-5" />,
      gradient: 'from-indigo-500/10 to-blue-500/5',
      accent: 'indigo',
      items: [
        { label: 'Current Week', value: formatWeek(overview?.currentWeek) },
        { label: 'Start Week', value: formatWeek(overview?.jobStartWeek) },
        { label: 'End Week', value: formatWeek(overview?.jobEndWeek) },
        { label: 'Total Duration', value: formatNumber(overview?.completeJobDuration, ' weeks') },
      ],
    },
    {
      id: 'sim',
      title: 'First Stage Sim',
      icon: <Play className="h-5 w-5" />,
      gradient: 'from-emerald-500/10 to-teal-500/5',
      accent: 'emerald',
      items: [
        { label: 'Target Completion', value: formatWeek(overview?.firstStageSimComplete) },
        {
          label: 'Planned Duration',
          value: formatNumber(overview?.firstStageSimDuration, ' weeks'),
        },
        { label: 'Progress Goal', value: formatPercent(overview?.firstStageSimRequired) },
        { label: 'Actual per Week', value: formatPercent(overview?.firstStageSimPerWeek) },
      ],
    },
    {
      id: 'vc',
      title: 'VC Readiness',
      icon: <Monitor className="h-5 w-5" />,
      gradient: 'from-amber-500/10 to-orange-500/5',
      accent: 'amber',
      items: [
        { label: 'Commissioning Start', value: formatWeek(overview?.vcStartWeek) },
        {
          label: 'Duration to Start',
          value: formatNumber(overview?.jobDurationToVcStart, ' weeks'),
        },
        { label: 'Readiness Goal', value: formatPercent(overview?.vcReadyRequired) },
        { label: 'Readiness Actual', value: formatPercent(overview?.vcReadyPerWeek) },
      ],
    },
    {
      id: 'final',
      title: 'Final Deliverables',
      icon: <PackageCheck className="h-5 w-5" />,
      gradient: 'from-blue-500/10 to-cyan-500/5',
      accent: 'blue',
      items: [
        { label: 'Project Handover', value: formatWeek(overview?.finalDeliverablesEndWeek) },
        {
          label: 'Final Phase',
          value: formatNumber(overview?.finalDeliverablesDuration, ' weeks'),
        },
        { label: 'Phase Goal', value: formatPercent(overview?.finalDeliverablesRequired) },
        { label: 'Actual Output', value: formatPercent(overview?.finalDeliverablesPerWeek) },
      ],
    },
  ]

  const readinessMetrics = [
    {
      label: 'Robot Simulation',
      value: areaValues?.['ROBOT SIMULATION'],
      icon: <Sparkles className="h-3 w-3" />,
    },
    { label: 'Joining', value: areaValues?.['JOINING'], icon: <Target className="h-3 w-3" /> },
    { label: 'Gripper', value: areaValues?.['GRIPPER'], icon: <Layers className="h-3 w-3" /> },
    { label: 'Fixture', value: areaValues?.['FIXTURE'], icon: <DatabaseZap className="h-3 w-3" /> },
    {
      label: 'Documentation',
      value: areaValues?.['DOCUMENTATION'],
      icon: <ArrowRight className="h-3 w-3" />,
    },
    { label: 'MRS', value: areaValues?.['MRS'], icon: <ClipboardCheck className="h-3 w-3" /> },
    { label: 'OLP/Download', value: areaValues?.['OLP'], icon: <Monitor className="h-3 w-3" /> },
    { label: 'Safety', value: areaValues?.['SAFETY'], icon: <ChevronRight className="h-3 w-3" /> },
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* Premium Header / Breadcrumbs */}
      <div className="flex flex-col gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 dark:text-gray-200">{title}</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-1">
              Area Overview
            </h2>
            <h1 className="text-4xl md:text-7xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
              {title}
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed pt-2">
              Performance metrics, schedule integrity, and discipline readiness for project node{' '}
              <span className="text-gray-900 dark:text-white font-bold border-b-2 border-indigo-500/50">
                {title}
              </span>
              .
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  Master Clock
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white">
                  {formatWeek(overview?.currentWeek)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {!hasData && !hasAreaMetrics && (
        <EmptyState
          title="No Data Traceable"
          message="No performance metrics found for this area. Ensure your simulation status files are loaded correctly."
          icon={<AlertTriangle className="h-8 w-8 text-amber-500" />}
          ctaLabel="Consult Data Loader"
          onCtaClick={() => navigate('/data-loader')}
        />
      )}

      {(hasData || hasAreaMetrics) && (
        <>
          {/* Key Indicators Overlay */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative group cursor-default">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200" />
              <StatCard
                title="Simulation Sync"
                value={formatPercent(overview?.firstStageSimRequired)}
                subtitle={`Target: ${formatWeek(overview?.firstStageSimComplete)}`}
                icon={<Play className="h-6 w-6" />}
                variant={getVariant(overview?.firstStageSimRequired)}
                className="relative border-none bg-white dark:bg-[rgb(31,41,55)] shadow-md"
              />
            </div>
            <div className="relative group cursor-default">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200" />
              <StatCard
                title="VC Readiness"
                value={formatPercent(overview?.vcReadyRequired)}
                subtitle={`Start: ${formatWeek(overview?.vcStartWeek)}`}
                icon={<Monitor className="h-6 w-6" />}
                variant={getVariant(overview?.vcReadyRequired)}
                className="relative border-none bg-white dark:bg-[rgb(31,41,55)] shadow-md"
              />
            </div>
            <div className="relative group cursor-default">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200" />
              <StatCard
                title="Final Output"
                value={formatPercent(overview?.finalDeliverablesRequired)}
                subtitle={`End: ${formatWeek(overview?.finalDeliverablesEndWeek)}`}
                icon={<PackageCheck className="h-6 w-6" />}
                variant={getVariant(overview?.finalDeliverablesRequired)}
                className="relative border-none bg-white dark:bg-[rgb(31,41,55)] shadow-md"
              />
            </div>
            <div className="relative group cursor-default">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-500 to-slate-500 rounded-2xl blur opacity-10 group-hover:opacity-25 transition duration-1000 group-hover:duration-200" />
              <StatCard
                title="Project Window"
                value={formatNumber(overview?.completeJobDuration, ' Weeks')}
                subtitle={`${formatWeek(overview?.jobStartWeek)} → ${formatWeek(overview?.jobEndWeek)}`}
                icon={<TrendingUp className="h-6 w-6" />}
                className="relative border-none bg-white dark:bg-[rgb(31,41,55)] shadow-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Detailed Milestones Section */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Milestone Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {milestoneGroups.map((group) => (
                  <div
                    key={group.id}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] p-5 transition-all duration-300',
                      'hover:shadow-xl hover:border-gray-300 dark:hover:border-indigo-500/50',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0 right-0 w-32 h-32 bg-gradient-to-br -mr-16 -mt-16 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
                        group.gradient,
                      )}
                    />

                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex items-center justify-center h-10 w-10 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors',
                            `group-hover:bg-${group.accent}-500/10 group-hover:text-${group.accent}-500`,
                          )}
                        >
                          {group.icon}
                        </div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                          {group.title}
                        </h3>
                      </div>

                      <div className="space-y-3">
                        {group.items.map((item) => (
                          <div
                            key={item.label}
                            className="flex justify-between items-center text-[11px]"
                          >
                            <span className="font-bold text-gray-400 uppercase tracking-tighter">
                              {item.label}
                            </span>
                            <span
                              className={cn(
                                'font-black tabular-nums',
                                item.value === '—'
                                  ? 'text-gray-300 dark:text-gray-700'
                                  : 'text-gray-900 dark:text-gray-100',
                              )}
                            >
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discipline Readiness Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Discipline Health
                </h2>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-white/10">
                {readinessMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-4"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                      {metric.icon}
                    </div>
                    <ProgressBar value={metric.value} label={metric.label} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AreaOverviewPage
