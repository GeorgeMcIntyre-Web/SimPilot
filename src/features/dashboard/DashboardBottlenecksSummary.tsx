import type { WorkflowStage } from '../../domain/workflowTypes'

interface DashboardBottlenecksSummaryProps {
  total: number
  highCount: number
  mediumCount: number
  lowCount: number
  activeStage: WorkflowStage | 'ALL'
  updatedAt?: string
}

export function DashboardBottlenecksSummary({
  total,
  highCount,
  mediumCount,
  lowCount,
  activeStage,
  updatedAt
}: DashboardBottlenecksSummaryProps) {
  const stageLabel = activeStage === 'ALL' ? 'All workflow stages' : `${activeStage} focus`
  const formattedUpdatedAt = updatedAt
    ? new Date(updatedAt).toLocaleString()
    : null

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-indigo-500 uppercase tracking-wide">
          Bottleneck Overview
        </p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {total} open blockers
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {stageLabel}
          {formattedUpdatedAt ? ` • Updated ${formattedUpdatedAt}` : ''}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 text-sm">
        <SeverityPill label="High" value={highCount} tone="high" />
        <SeverityPill label="Medium" value={mediumCount} tone="medium" />
        <SeverityPill label="Low" value={lowCount} tone="low" />
      </div>
    </div>
  )
}

interface SeverityPillProps {
  label: string
  value: number
  tone: 'high' | 'medium' | 'low'
}

function SeverityPill({ label, value, tone }: SeverityPillProps) {
  const toneClass =
    tone === 'high'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'
      : tone === 'medium'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'

  return (
    <div className={`flex items-center gap-1 px-4 py-2 rounded-full ${toneClass}`}>
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  )
}
