// Station Card
// Compact card showing station summary for the simulation board
// Displays asset counts, sourcing breakdown, and simulation status

import { Bot, Zap, Wrench, Box, RefreshCw, ShoppingCart, HelpCircle } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import type { StationContext } from '../simulationStore'
import { getCompletionBadgeClass, getCompletionBarClass } from '../simulationSelectors'

// ============================================================================
// TYPES
// ============================================================================

interface StationCardProps {
  station: StationContext
  onClick?: (station: StationContext) => void
  isSelected?: boolean
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface CountBadgeProps {
  icon: React.ReactNode
  count: number
  label: string
  color: 'purple' | 'yellow' | 'blue' | 'gray'
}

function CountBadge({ icon, count, label, color }: CountBadgeProps) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200 border border-purple-100 dark:border-purple-800',
    yellow: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200 border border-amber-100 dark:border-amber-800',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-100 dark:border-blue-800',
    gray: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        colorClasses[color]
      )}
      title={label}
    >
      {icon}
      <span>{count}</span>
    </div>
  )
}

interface SourcingIndicatorProps {
  reuse: number
  newBuy: number
  unknown: number
}

function SourcingIndicator({ reuse, newBuy, unknown }: SourcingIndicatorProps) {
  const total = reuse + newBuy + unknown
  if (total === 0) return null

  const reusePercent = Math.round((reuse / total) * 100)
  const newBuyPercent = Math.round((newBuy / total) * 100)

  return (
    <div className="flex items-center gap-2">
      {reuse > 0 && (
        <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
          <RefreshCw className="h-3 w-3" />
          <span>{reusePercent}%</span>
        </div>
      )}
      {newBuy > 0 && (
        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
          <ShoppingCart className="h-3 w-3" />
          <span>{newBuyPercent}%</span>
        </div>
      )}
      {unknown > 0 && (
        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <HelpCircle className="h-3 w-3" />
          <span>{unknown}</span>
        </div>
      )}
    </div>
  )
}

interface CompletionBarProps {
  percent: number | undefined
}

function CompletionBar({ percent }: CompletionBarProps) {
  return (
    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div
        className={cn(
          'h-full transition-all duration-300',
          'bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400',
          getCompletionBarClass(percent)
        )}
        style={{ width: `${percent ?? 0}%` }}
      />
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StationCard({ station, onClick, isSelected = false }: StationCardProps) {
  const completion = station.simulationStatus?.firstStageCompletion
  const engineer = station.simulationStatus?.engineer
  const unitLabel = station.unit || station.plant || '—'
  const lineLabel = station.line || '—'

  return (
    <button
      onClick={() => onClick?.(station)}
      aria-label={`Station ${station.station} on ${station.line}${completion !== undefined ? `, ${completion}% complete` : ''}`}
      aria-pressed={isSelected}
      className={cn(
        'w-full text-left p-4 rounded-2xl border transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-[1px]',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-gray-900',
        isSelected
          ? 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 shadow-md'
          : 'bg-white/90 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
      )}
      data-testid={`station-card-${station.contextKey}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
            {station.station}
          </h4>
          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            <span className="uppercase tracking-wide">{lineLabel}</span>
            <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span className="capitalize">{unitLabel}</span>
          </div>
        </div>
        {completion !== undefined && (
          <span className={cn(
            'text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm',
            getCompletionBadgeClass(completion)
          )}>
            {completion}%
          </span>
        )}
      </div>

      {/* Completion bar */}
      <div className="mb-3">
        <CompletionBar percent={completion} />
      </div>

      {/* Asset counts */}
      <div className="flex flex-wrap gap-2 mb-3">
        <CountBadge
          icon={<Bot className="h-3 w-3" />}
          count={station.assetCounts.robots}
          label="Robots"
          color="purple"
        />
        <CountBadge
          icon={<Zap className="h-3 w-3" />}
          count={station.assetCounts.guns}
          label="Weld Guns"
          color="yellow"
        />
        <CountBadge
          icon={<Wrench className="h-3 w-3" />}
          count={station.assetCounts.tools}
          label="Tools"
          color="blue"
        />
        <CountBadge
          icon={<Box className="h-3 w-3" />}
          count={station.assetCounts.other}
          label="Other"
          color="gray"
        />
      </div>

      {/* Sourcing breakdown */}
      <div className="flex items-center justify-between">
        <SourcingIndicator
          reuse={station.sourcingCounts.reuse + station.sourcingCounts.freeIssue}
          newBuy={station.sourcingCounts.newBuy}
          unknown={station.sourcingCounts.unknown}
        />
        {engineer && (
          <span className="text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[140px] px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full" title={engineer}>
            {engineer}
          </span>
        )}
      </div>
    </button>
  )
}
