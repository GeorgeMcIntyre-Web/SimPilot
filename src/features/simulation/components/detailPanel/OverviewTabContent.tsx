import { Link } from 'react-router-dom'
import { Bot, Zap, Wrench, User, CheckCircle2, Clock, AlertCircle, HelpCircle } from 'lucide-react'
import { cn } from '../../../../ui/lib/utils'
import type { StationContext } from '../../simulationStore'

interface OverviewTabContentProps {
  station: StationContext
}

// Helper to get completion status styling
function getCompletionStatus(percent: number | undefined) {
  if (percent === undefined)
    return {
      label: 'No Data',
      color: 'text-gray-500',
      bg: 'bg-gray-100 dark:bg-gray-700',
      icon: HelpCircle,
    }
  if (percent >= 80)
    return {
      label: 'On Track',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: CheckCircle2,
    }
  if (percent >= 50)
    return {
      label: 'In Progress',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: Clock,
    }
  if (percent >= 25)
    return {
      label: 'Behind',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: AlertCircle,
    }
  return {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: AlertCircle,
  }
}

export function OverviewTabContent({ station }: OverviewTabContentProps) {
  const completion = station.simulationStatus?.firstStageCompletion
  const finalCompletion = station.simulationStatus?.finalDeliverablesCompletion
  const engineer = station.simulationStatus?.engineer
  const status = getCompletionStatus(completion)
  const StatusIcon = status.icon

  // Calculate sourcing percentages
  const totalSourcing =
    station.sourcingCounts.reuse +
    station.sourcingCounts.newBuy +
    station.sourcingCounts.freeIssue +
    station.sourcingCounts.unknown
  const reusePercent =
    totalSourcing > 0 ? Math.round((station.sourcingCounts.reuse / totalSourcing) * 100) : 0
  const newBuyPercent =
    totalSourcing > 0 ? Math.round((station.sourcingCounts.newBuy / totalSourcing) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Simulation Progress Card */}
      <div
        className={cn(
          'rounded-lg border p-4',
          status.bg,
          completion !== undefined && completion >= 80
            ? 'border-emerald-200 dark:border-emerald-800'
            : completion !== undefined && completion >= 50
              ? 'border-blue-200 dark:border-blue-800'
              : completion !== undefined && completion >= 25
                ? 'border-amber-200 dark:border-amber-800'
                : completion !== undefined
                  ? 'border-red-200 dark:border-red-800'
                  : 'border-gray-200 dark:border-gray-700',
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn('h-4 w-4', status.color)} />
            <span className={cn('text-xs font-semibold uppercase tracking-wide', status.color)}>
              {status.label}
            </span>
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {completion !== undefined ? `${completion}%` : '—'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              completion !== undefined && completion >= 80
                ? 'bg-emerald-500'
                : completion !== undefined && completion >= 50
                  ? 'bg-blue-500'
                  : completion !== undefined && completion >= 25
                    ? 'bg-amber-500'
                    : completion !== undefined
                      ? 'bg-red-500'
                      : 'bg-gray-400',
            )}
            style={{ width: `${completion ?? 0}%` }}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400">First Stage</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {completion !== undefined ? `${completion}%` : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Final Deliverables</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {finalCompletion !== undefined ? `${finalCompletion}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Station Details */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Station Details
          </h3>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <User className="h-3.5 w-3.5" />
              <span className="text-xs">Engineer</span>
            </div>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              <Link
                to={`/engineers?highlightEngineer=${encodeURIComponent(engineer || 'UNASSIGNED')}`}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {engineer || 'UNASSIGNED'}
              </Link>
            </span>
          </div>
        </div>
      </div>

      {/* Asset Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Assets
            </h3>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {station.assetCounts.total} Total
            </span>
          </div>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                {station.assetCounts.robots}
              </div>
              <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                Robots
              </div>
            </div>
            <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-amber-900 dark:text-amber-100">
                {station.assetCounts.guns}
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Guns</div>
            </div>
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {station.assetCounts.tools + station.assetCounts.other}
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Tools</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sourcing Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Sourcing Breakdown
          </h3>
        </div>
        <div className="p-3 space-y-3">
          {/* Visual Bar */}
          {totalSourcing > 0 && (
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
              {station.sourcingCounts.reuse > 0 && (
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${(station.sourcingCounts.reuse / totalSourcing) * 100}%` }}
                />
              )}
              {station.sourcingCounts.freeIssue > 0 && (
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${(station.sourcingCounts.freeIssue / totalSourcing) * 100}%` }}
                />
              )}
              {station.sourcingCounts.newBuy > 0 && (
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(station.sourcingCounts.newBuy / totalSourcing) * 100}%` }}
                />
              )}
              {station.sourcingCounts.unknown > 0 && (
                <div
                  className="h-full bg-gray-400"
                  style={{ width: `${(station.sourcingCounts.unknown / totalSourcing) * 100}%` }}
                />
              )}
            </div>
          )}

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Reuse</span>
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {station.sourcingCounts.reuse}
                {totalSourcing > 0 && <span className="text-gray-500 ml-1">({reusePercent}%)</span>}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">New Buy</span>
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {station.sourcingCounts.newBuy}
                {totalSourcing > 0 && (
                  <span className="text-gray-500 ml-1">({newBuyPercent}%)</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Free Issue</span>
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {station.sourcingCounts.freeIssue}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Unknown</span>
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {station.sourcingCounts.unknown}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
