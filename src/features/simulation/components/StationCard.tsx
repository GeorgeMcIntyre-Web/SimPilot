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
  if (count === 0) return null

  const colorClasses = {
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
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
    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={cn('h-full transition-all duration-300', getCompletionBarClass(percent))}
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

  return (
    <button
      onClick={() => onClick?.(station)}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-200',
        'hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 shadow-md'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      )}
      data-testid={`station-card-${station.contextKey}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
            {station.station}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {station.line}
          </p>
        </div>
        {completion !== undefined && (
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded-full',
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
      <div className="flex flex-wrap gap-1.5 mb-2">
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
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]" title={engineer}>
            {engineer}
          </span>
        )}
      </div>
    </button>
  )
}