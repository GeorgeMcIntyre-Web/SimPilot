import { cn } from '../../ui/lib/utils'
import { FocusItem } from './dashboardUtils'

const severityAccent: Record<FocusItem['severity'], string> = {
  info: 'text-indigo-600 dark:text-indigo-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
}

const severityGlow: Record<FocusItem['severity'], string> = {
  info: 'bg-indigo-500/10',
  warning: 'bg-amber-500/10',
  danger: 'bg-rose-500/10',
}

interface FocusSummaryCardsProps {
  items: FocusItem[]
  className?: string
}

export function FocusSummaryCards({ items, className }: FocusSummaryCardsProps) {
  if (items.length === 0) return null

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full', className)}>
      {items.slice(0, 4).map((item) => (
        <div
          key={item.id}
          className="group relative bg-white dark:bg-[rgb(31,41,55)] rounded-2xl border border-gray-200 dark:border-white/10 p-4 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-gray-300 dark:hover:border-indigo-500/20 overflow-hidden"
        >
          {/* Accent Glow */}
          <div
            className={cn(
              'absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500',
              severityGlow[item.severity],
            )}
          />

          <div className="relative z-10 flex flex-col gap-1">
            <span
              className={cn(
                'text-2xl font-black tabular-nums tracking-tighter leading-none',
                severityAccent[item.severity],
              )}
            >
              {item.count}
            </span>

            <div className="space-y-1 mt-1">
              <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight">
                {item.title}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-300 opacity-0 group-hover:opacity-100',
              item.severity === 'info'
                ? 'bg-indigo-500'
                : item.severity === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-rose-500',
            )}
          />
        </div>
      ))}
    </div>
  )
}
