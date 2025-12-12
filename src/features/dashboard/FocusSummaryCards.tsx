import React from 'react'
import { cn } from '../../ui/lib/utils'
import { FocusItem } from './dashboardUtils'

const severityAccent: Record<FocusItem['severity'], string> = {
  info: 'text-blue-600 dark:text-blue-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400'
}

const gradient: Record<FocusItem['severity'], string> = {
  info: 'from-blue-200 via-blue-100 to-sky-200 dark:from-blue-900/40 dark:via-blue-800/40 dark:to-sky-900/40',
  warning: 'from-amber-200 via-amber-100 to-yellow-200 dark:from-amber-900/40 dark:via-amber-800/40 dark:to-yellow-900/40',
  danger: 'from-rose-200 via-rose-100 to-red-200 dark:from-rose-900/40 dark:via-rose-800/40 dark:to-red-900/40'
}

interface FocusSummaryCardsProps {
  items: FocusItem[]
}

export function FocusSummaryCards({ items }: FocusSummaryCardsProps) {
  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {items.map(item => (
        <div
          key={item.id}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 h-full shadow-sm flex items-center justify-between gap-3"
        >
          <div className="space-y-0.5 leading-tight">
            <div className={cn('text-2xl font-bold', severityAccent[item.severity])}>
              {item.count}
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {item.title}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
              {item.description}
            </div>
          </div>
          <div
            className={cn(
              'h-12 w-1 rounded-full bg-gradient-to-b',
              gradient[item.severity]
            )}
          />
        </div>
      ))}
    </div>
  )
}
