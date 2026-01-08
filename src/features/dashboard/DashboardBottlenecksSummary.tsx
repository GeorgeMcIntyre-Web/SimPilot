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
  const stageLabel = activeStage === 'ALL' ? 'All stages' : activeStage
  const formattedUpdatedAt = updatedAt
    ? new Date(updatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2">
      <div className="flex items-baseline gap-3">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {total} open
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {stageLabel}
          {formattedUpdatedAt && <span className="text-xs ml-2">• {formattedUpdatedAt}</span>}
        </span>
      </div>

      <div className="flex gap-2 text-sm">
        <SeverityPill label="High" value={highCount} tone="high" />
        <SeverityPill label="Med" value={mediumCount} tone="medium" />
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
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${toneClass}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  )
}
