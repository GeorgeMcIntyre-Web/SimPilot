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

const variantStyles: Record<SummaryVariant, { container: string; value: string; icon: string }> = {
  default: {
    container: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    value: 'text-gray-900 dark:text-white',
    icon: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
  },
  success: {
    container: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    value: 'text-emerald-700 dark:text-emerald-300',
    icon: 'bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300'
  },
  warning: {
    container: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    value: 'text-amber-700 dark:text-amber-300',
    icon: 'bg-amber-100 dark:bg-amber-800 text-amber-600 dark:text-amber-300'
  },
  danger: {
    container: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
    value: 'text-rose-700 dark:text-rose-300',
    icon: 'bg-rose-100 dark:bg-rose-800 text-rose-600 dark:text-rose-300'
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    value: 'text-blue-700 dark:text-blue-300',
    icon: 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300'
  }
}

const trendStyles = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-gray-500 dark:text-gray-400'
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
  trend,
  onClick,
  className,
  'data-testid': testId
}: SummaryCardProps) {
  const styles = variantStyles[variant]
  const isClickable = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      data-testid={testId}
      className={cn(
        'rounded-xl border p-5 transition-all duration-200',
        styles.container,
        isClickable && 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className={cn('flex-shrink-0 p-2.5 rounded-lg', styles.icon)}>
            {icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>
          
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold tracking-tight', styles.value)}>
              {value}
            </span>
            
            {trend && (
              <span className={cn('text-sm font-medium', trendStyles[trend.direction])}>
                {trend.direction === 'up' && '↑'}
                {trend.direction === 'down' && '↓'}
                {trend.value}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
