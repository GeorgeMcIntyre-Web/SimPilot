// SummaryCard Component
// Dashboard summary card with icon, value, title, and optional click action

import { ReactNode } from 'react'
import { cn } from '../lib/utils'

// ============================================================================
// TYPES
// ============================================================================

type SummaryVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface SummaryCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  variant?: SummaryVariant
  density?: 'standard' | 'compact'
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: string
  }
  onClick?: () => void
  className?: string
  'data-testid'?: string
}

// ============================================================================
// STYLES
// ============================================================================

const variantStyles: Record<SummaryVariant, { border: string; value: string; iconContainer: string; accentBar: string }> = {
  default: {
    border: 'border-gray-200 dark:border-gray-700',
    value: 'text-gray-900 dark:text-white',
    iconContainer: 'bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300',
    accentBar: 'from-gray-100 via-gray-50 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600'
  },
  success: {
    border: 'border-emerald-200/80 dark:border-emerald-800/80',
    value: 'text-emerald-700 dark:text-emerald-300',
    iconContainer: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
    accentBar: 'from-emerald-100 via-teal-100 to-blue-100 dark:from-emerald-900/50 dark:via-teal-900/40 dark:to-blue-900/40'
  },
  warning: {
    border: 'border-amber-200/80 dark:border-amber-800/80',
    value: 'text-amber-700 dark:text-amber-300',
    iconContainer: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300',
    accentBar: 'from-amber-100 via-amber-50 to-orange-100 dark:from-amber-900/40 dark:via-amber-900/30 dark:to-orange-900/40'
  },
  danger: {
    border: 'border-rose-200/80 dark:border-rose-800/80',
    value: 'text-rose-700 dark:text-rose-300',
    iconContainer: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300',
    accentBar: 'from-rose-100 via-rose-50 to-amber-100 dark:from-rose-900/40 dark:via-rose-900/30 dark:to-amber-900/40'
  },
  info: {
    border: 'border-blue-200/80 dark:border-blue-800/80',
    value: 'text-blue-700 dark:text-blue-300',
    iconContainer: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
    accentBar: 'from-blue-100 via-sky-100 to-indigo-100 dark:from-blue-900/40 dark:via-sky-900/40 dark:to-indigo-900/40'
  }
}

const trendStyles = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-gray-500 dark:text-gray-400'
}

const densityStyles = {
  standard: {
    padding: 'p-4 md:p-5',
    gap: 'gap-4',
    icon: 'p-2.5',
    title: 'text-sm',
    value: 'text-2xl',
    subtitle: 'text-xs',
    trend: 'text-sm'
  },
  compact: {
    padding: 'p-3',
    gap: 'gap-3',
    icon: 'p-2',
    title: 'text-xs',
    value: 'text-xl',
    subtitle: 'text-[11px]',
    trend: 'text-xs'
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * SummaryCard - Dashboard summary card for KPIs and key metrics
 */
export function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  density = 'standard',
  trend,
  onClick,
  className,
  'data-testid': testId
}: SummaryCardProps) {
  const styles = variantStyles[variant]
  const densityStyle = densityStyles[density]
  const isClickable = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'relative overflow-hidden rounded-xl border bg-white dark:bg-gray-800 shadow-sm transition-all duration-200',
        densityStyle.padding,
        styles.border,
        isClickable && 'cursor-pointer hover:shadow-md hover:-translate-y-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className={cn('absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b', styles.accentBar)} />

      <div className={cn('flex items-start', densityStyle.gap)}>
        {icon && (
          <div className={cn('flex-shrink-0 rounded-lg', densityStyle.icon, styles.iconContainer)}>
            {icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className={cn('font-medium text-gray-500 dark:text-gray-400 mb-1', densityStyle.title)}>
            {title}
          </p>

          <div className="flex items-baseline gap-2">
            <span className={cn('font-bold tracking-tight leading-tight', styles.value, densityStyle.value)}>
              {value}
            </span>

            {trend && (
              <span className={cn('font-medium', densityStyle.trend, trendStyles[trend.direction])}>
                {trend.direction === 'up' && '↑'}
                {trend.direction === 'down' && '↓'}
                {trend.value}
              </span>
            )}
          </div>

          {subtitle && (
            <p className={cn('text-gray-500 dark:text-gray-400 mt-1', densityStyle.subtitle)}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SUMMARY CARDS GRID
// ============================================================================

interface SummaryCardsGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4 | 5
  className?: string
}

const gridColumnClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
}

/**
 * SummaryCardsGrid - Grid wrapper for summary cards
 */
export function SummaryCardsGrid({ children, columns = 4, className }: SummaryCardsGridProps) {
  return (
    <div className={cn('grid gap-4', gridColumnClasses[columns], className)}>
      {children}
    </div>
  )
}
