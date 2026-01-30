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
  className?: string
}

export function FocusSummaryCards({ items, className }: FocusSummaryCardsProps) {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        "flex flex-wrap gap-3 w-full",
        className
      )}
    >
      {items.map(item => (
        <div
          key={item.id}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm flex items-center justify-between gap-3 flex-1 min-w-[200px]"
        >
          <div className="space-y-0.5 leading-tight">
            <div className={cn('typography-metric', severityAccent[item.severity])}>
              {item.count}
            </div>
            <div className="typography-body-strong">
              {item.title}
            </div>
            <div className="typography-caption line-clamp-2">
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
