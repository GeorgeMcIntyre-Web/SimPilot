// BadgePill Component
// Status pill with semantic colors for risk/status indication

import { cn } from '../lib/utils'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

interface BadgePillProps {
  label: string
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
}

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-gray-500',
  info: 'bg-blue-500'
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm'
}

export function BadgePill({
  label,
  variant = 'neutral',
  size = 'sm',
  className,
  dot = false
}: BadgePillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            dotStyles[variant]
          )}
        />
      )}
      {label}
    </span>
  )
}

// ============================================================================
// HELPER: Map risk level to badge variant
// ============================================================================

export type RiskLevel = 'OK' | 'AT_RISK' | 'CRITICAL'

export const riskToVariant = (riskLevel: RiskLevel): BadgeVariant => {
  if (riskLevel === 'CRITICAL') return 'danger'
  if (riskLevel === 'AT_RISK') return 'warning'
  return 'success'
}

export const riskToLabel = (riskLevel: RiskLevel): string => {
  if (riskLevel === 'CRITICAL') return 'Blocked'
  if (riskLevel === 'AT_RISK') return 'At Risk'
  return 'On Track'
}

/**
 * Convenience component for risk-based badges
 */
export function RiskBadge({
  riskLevel,
  className
}: {
  riskLevel: RiskLevel
  className?: string
}) {
  return (
    <BadgePill
      label={riskToLabel(riskLevel)}
      variant={riskToVariant(riskLevel)}
      dot
      className={className}
    />
  )
}
