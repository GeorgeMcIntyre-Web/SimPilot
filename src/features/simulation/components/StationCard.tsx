// Station Card
// Compact card showing station summary for the simulation board
// Displays asset counts, sourcing breakdown, and simulation status

import { RefreshCw, ShoppingCart, HelpCircle, Wrench } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import type { StationContext } from '../simulationStore'
import { getCompletionBarClass } from '../simulationSelectors'

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
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            'bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400',
            getCompletionBarClass(percent)
          )}
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200 min-w-[32px] text-right">
        {percent !== undefined ? `${percent}%` : '—'}
      </span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StationCard({ station, onClick, isSelected = false }: StationCardProps) {
  const completion = station.simulationStatus?.firstStageCompletion
  const engineer = station.simulationStatus?.engineer
  const toolCount = station.assetCounts.tools
  const otherCount = station.assetCounts.other

  return (
    <button
      onClick={() => onClick?.(station)}
      aria-label={`Station ${station.station} on ${station.line}${completion !== undefined ? `, ${completion}% complete` : ''}`}
      aria-pressed={isSelected}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-200 overflow-hidden',
        'hover:shadow-md hover:-translate-y-[1px]',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-gray-900',
        isSelected
          ? 'bg-blue-50/60 dark:bg-blue-900/15 border-blue-300 dark:border-blue-600 shadow-md'
          : 'bg-white/85 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
      )}
      data-testid={`station-card-${station.contextKey}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 space-y-0.5">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">
            {station.station}
          </h4>
        </div>
      </div>

      {/* Completion bar */}
      <div className="mb-3">
        <CompletionBar percent={completion} />
      </div>

      {/* Slim asset summary */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-700 dark:text-gray-300 mb-3">
        {toolCount + otherCount > 0 && (
          <span className="flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-medium">{toolCount + otherCount}</span>
            <span className="text-gray-500">other</span>
          </span>
        )}
      </div>

      {/* Sourcing + owner */}
      <div className="flex items-center justify-between gap-2">
        <SourcingIndicator
          reuse={station.sourcingCounts.reuse + station.sourcingCounts.freeIssue}
          newBuy={station.sourcingCounts.newBuy}
          unknown={station.sourcingCounts.unknown}
        />
        {engineer && (
          <span
            className="text-[11px] text-gray-700 dark:text-gray-200 truncate max-w-[140px] px-2 py-1 bg-gray-100/70 dark:bg-gray-700/70 rounded-full"
            title={engineer}
          >
            {engineer}
          </span>
        )}
      </div>
    </button>
  )
}
