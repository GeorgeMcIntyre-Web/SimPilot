// StatCard Component
// Simple card for displaying a metric with title, value, and optional subtitle

import { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
  onClick?: () => void
}

const variantStyles = {
  default: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  danger: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
}

const valueStyles = {
  default: 'text-gray-900 dark:text-white',
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300'
}

const iconStyles = {
  default: 'text-gray-400 dark:text-gray-500',
  success: 'text-emerald-500 dark:text-emerald-400',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-rose-500 dark:text-rose-400'
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  className,
  onClick
}: StatCardProps) {
  const isClickable = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border p-5 transition-all duration-200',
        variantStyles[variant],
        isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
        className
      )}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className={cn('text-2xl font-bold tracking-tight', valueStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('flex-shrink-0', iconStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
