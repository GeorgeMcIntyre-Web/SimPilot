// Station Card
// Compact card showing station summary for the simulation board
// Displays asset counts, sourcing breakdown, and simulation status

import { Bot, Zap, Wrench, Box, RefreshCw, ShoppingCart, HelpCircle, AlertTriangle } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import type { StationContext } from '../simulationStore'
// TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
// import { useToolingBottleneckState, type WorkflowStage } from '../../../domain/toolingBottleneckStore'
// import { selectBottlenecksByStationKey } from '../../../domain/simPilotSelectors'

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
  if (percent === undefined) {
    return (
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full w-0 bg-gray-400" />
      </div>
    )
  }

  const colorClass = percent >= 80 ? 'bg-emerald-500' :
    percent >= 50 ? 'bg-blue-500' :
    percent >= 25 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={cn('h-full transition-all duration-300', colorClass)}
        style={{ width: `${percent}%` }}
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
            completion >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
            completion >= 50 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            completion >= 25 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
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

      <StationBottleneckSummary stationKey={station.contextKey} />
    </button>
  )
}

interface StationBottleneckSummaryProps {
  stationKey: string
}

function StationBottleneckSummary({ stationKey: _stationKey }: StationBottleneckSummaryProps) {
  // TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
  // const bottleneckState = useToolingBottleneckState()
  // const matches = useMemo(
  //   () => selectBottlenecksByStationKey(bottleneckState, stationKey),
  //   [bottleneckState, stationKey]
  // )
  const matches: any[] = [] // Placeholder until bottleneck integration is re-enabled

  if (matches.length === 0) return null

  const summary = formatBottleneckSummary(matches)
  const hasCritical = matches.some(match => match.severity === 'critical')
  const chipClass = hasCritical
    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'

  return (
    <div className="mt-3 flex items-center justify-between">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold',
          chipClass
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        {summary}
      </div>
      <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
        Tooling bottleneck
      </span>
    </div>
  )
}

// TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
// function formatBottleneckSummary(matches: { dominantStage: WorkflowStage }[]): string {
//   const counts: Record<WorkflowStage, number> = {
//     DESIGN: 0,
//     SIMULATION: 0
//   }
//
//   for (const match of matches) {
//     counts[match.dominantStage] += 1
//   }
//
//   const parts: string[] = []
//   if (counts.DESIGN > 0) {
//     parts.push(`${counts.DESIGN} DESIGN`)
//   }
//   if (counts.SIMULATION > 0) {
//     parts.push(`${counts.SIMULATION} SIMULATION`)
//   }
//
//   if (parts.length === 0) return 'Tooling bottleneck'
//
//   const noun = matches.length === 1 ? 'bottleneck' : 'bottlenecks'
//   return `${parts.join(', ')} ${noun}`
// }

function formatBottleneckSummary(_matches: any[]): string {
  return 'Tooling bottleneck' // Placeholder until bottleneck integration is re-enabled
}
