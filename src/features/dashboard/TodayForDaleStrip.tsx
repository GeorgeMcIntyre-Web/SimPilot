// Today s Overview Strip
// Top section showing curated focus items for the day

import { AlertTriangle, Target, Zap, CheckCircle2 } from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import { FocusItem } from './dashboardUtils'

interface TodayForDaleStripProps {
  focusItems: FocusItem[]
  stationsWithFlags: number
  stationsHealthy: number
  totalStations: number
}

const severityStyles = {
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  danger: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'
}

const severityIconStyles = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  danger: 'text-rose-500'
}

const severityTextStyles = {
  info: 'text-blue-700 dark:text-blue-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300'
}

function FocusCard({ item }: { item: FocusItem }) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all hover:shadow-md',
        severityStyles[item.severity]
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', severityIconStyles[item.severity])}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', severityTextStyles[item.severity])}>
              {item.count}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
              {item.title}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {item.description}
          </p>
        </div>
      </div>
    </div>
  )
}

export function TodayForDaleStrip({
  focusItems,
  stationsWithFlags,
  stationsHealthy,
  totalStations
}: TodayForDaleStripProps) {
  const healthyPercent = totalStations > 0
    ? Math.round((stationsHealthy / totalStations) * 100)
    : 0

  if (totalStations === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Today s Overview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Quick overview of what needs attention
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="hidden sm:flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{stationsWithFlags}</span> need attention
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-semibold">{healthyPercent}%</span> on track
            </span>
          </div>
        </div>
      </div>

      {/* Focus cards grid */}
      {focusItems.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-emerald-700 dark:text-emerald-300 font-medium">
            All clear! No issues requiring immediate attention.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {focusItems.map(item => (
            <FocusCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
