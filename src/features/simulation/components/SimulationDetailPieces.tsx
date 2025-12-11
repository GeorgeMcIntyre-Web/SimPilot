import { ChevronRight } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import type React from 'react'

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

export function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center gap-2 py-3 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-4 px-4 rounded-lg transition-colors">
        <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
        <span className="text-gray-500">{icon}</span>
        <span className="font-medium text-gray-900 dark:text-white">{title}</span>
      </summary>
      <div className="pl-6 pb-4">
        {children}
      </div>
    </details>
  )
}

interface MetricRowProps {
  label: string
  value: number | undefined | null
  threshold?: number
}

export function MetricRow({ label, value, threshold = 80 }: MetricRowProps) {
  if (value === undefined || value === null) {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-xs text-gray-400">—</span>
      </div>
    )
  }

  const isGood = value >= threshold

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              isGood ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={cn(
          'text-xs font-medium min-w-[2.5rem] text-right',
          isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
        )}>
          {value}%
        </span>
      </div>
    </div>
  )
}

interface AssetCountRowProps {
  icon: React.ReactNode
  label: string
  count: number
  color: string
}

export function AssetCountRow({ icon, label, count, color }: AssetCountRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded">
      <span className={cn(color, 'scale-90')}>{icon}</span>
      <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
      <span className="ml-auto font-semibold text-sm text-gray-900 dark:text-white">{count}</span>
    </div>
  )
}
