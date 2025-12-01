// MetricRow Component
// Display simulation metrics in a consistent row format

import { cn } from '../lib/utils'
import { CheckCircle, XCircle, Minus, TrendingUp } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface MetricRowProps {
  label: string
  value: number | null
  threshold?: number
  showProgress?: boolean
  className?: string
}

interface MetricGridProps {
  metrics: Array<{
    key: string
    label: string
    value: number | null
  }>
  threshold?: number
  columns?: 2 | 3 | 4
  className?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (value: number | null, threshold: number): string => {
  if (value === null) return 'text-gray-400'
  if (value >= threshold) return 'text-emerald-600 dark:text-emerald-400'
  if (value >= threshold * 0.5) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

const getProgressColor = (value: number | null, threshold: number): string => {
  if (value === null) return 'bg-gray-200 dark:bg-gray-700'
  if (value >= threshold) return 'bg-emerald-500'
  if (value >= threshold * 0.5) return 'bg-amber-500'
  return 'bg-rose-500'
}

const StatusIcon = ({ value, threshold }: { value: number | null; threshold: number }) => {
  if (value === null) {
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  if (value >= threshold) {
    return <CheckCircle className="h-4 w-4 text-emerald-500" />
  }

  if (value >= threshold * 0.5) {
    return <TrendingUp className="h-4 w-4 text-amber-500" />
  }

  return <XCircle className="h-4 w-4 text-rose-500" />
}

// ============================================================================
// METRIC ROW COMPONENT
// ============================================================================

/**
 * MetricRow - Single metric display with optional progress bar
 */
export function MetricRow({
  label,
  value,
  threshold = 90,
  showProgress = true,
  className
}: MetricRowProps) {
  const displayValue = value !== null ? `${value}%` : 'N/A'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <StatusIcon value={value} threshold={threshold} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {label}
          </span>
          <span className={cn('text-sm font-medium ml-2', getStatusColor(value, threshold))}>
            {displayValue}
          </span>
        </div>

        {showProgress && value !== null && (
          <div className="mt-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', getProgressColor(value, threshold))}
              style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// METRIC GRID COMPONENT
// ============================================================================

const columnClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
}

/**
 * MetricGrid - Grid of metrics with consistent styling
 */
export function MetricGrid({
  metrics,
  threshold = 90,
  columns = 2,
  className
}: MetricGridProps) {
  if (metrics.length === 0) {
    return (
      <div className={cn('text-center py-4 text-gray-500 dark:text-gray-400 text-sm', className)}>
        No metrics available
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {metrics.map(metric => (
        <MetricRow
          key={metric.key}
          label={metric.label}
          value={metric.value}
          threshold={threshold}
        />
      ))}
    </div>
  )
}

// ============================================================================
// METRIC PILL COMPONENT (Compact inline display)
// ============================================================================

interface MetricPillProps {
  label: string
  value: number | null
  className?: string
}

/**
 * MetricPill - Compact inline metric display
 */
export function MetricPill({ label, value, className }: MetricPillProps) {
  const displayValue = value !== null ? `${value}%` : '-'
  const colorClass = value === null
    ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    : value >= 90
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : value >= 50
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', colorClass, className)}>
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>
      <span>{displayValue}</span>
    </span>
  )
}
