// Dale's Today Panel
// Shows shortlist of stations needing attention
// Uses selectors to find stations with issues

import { AlertCircle, AlertTriangle, Info, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import { useStationsNeedingAttention, type StationAttentionItem, getCompletionBarClass } from '../simulationSelectors'
import type { StationContext } from '../simulationStore'

// ============================================================================
// TYPES
// ============================================================================

interface DaleTodayPanelProps {
  onStationClick?: (station: StationContext) => void
  maxItems?: number
}

interface AttentionItemRowProps {
  item: StationAttentionItem
  onClick?: () => void
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function SeverityIcon({ severity }: { severity: 'error' | 'warning' | 'info' }) {
  if (severity === 'error') {
    return <AlertCircle className="h-4 w-4 text-red-500" />
  }

  if (severity === 'warning') {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />
  }

  return <Info className="h-4 w-4 text-blue-500" />
}

function AttentionItemRow({ item, onClick }: AttentionItemRowProps) {
  const { station } = item
  const completion = station.simulationStatus?.firstStageCompletion

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 px-3 py-2 rounded-lg text-left transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-700/50',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
      )}
      data-testid={`attention-item-${item.station.contextKey}`}
    >
      {/* Severity Icon - fixed width */}
      <div className="flex-shrink-0 w-4 flex items-center justify-center pt-0.5">
        <SeverityIcon severity={item.severity} />
      </div>

      {/* Station info & reason */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white leading-snug">
          <span className="truncate">{station.station}</span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span className="text-gray-500 dark:text-gray-400 truncate">{station.unit}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
            {item.reason}
          </div>
          <div className="flex items-center gap-2 text-[10px] shrink-0">
            <div className="flex items-center gap-1 w-24">
              <div className="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    'bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400',
                    getCompletionBarClass(completion)
                  )}
                  style={{ width: `${completion ?? 0}%` }}
                />
              </div>
              <span className="min-w-[26px] text-right text-[10px] text-gray-700 dark:text-gray-200">
                {completion !== undefined ? `${completion}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chevron - fixed width */}
      <div className="flex-shrink-0 w-4 flex items-center justify-center pt-0.5">
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
      </div>
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DaleTodayPanel({
  onStationClick,
  maxItems
}: DaleTodayPanelProps) {
  const allAttentionItems = useStationsNeedingAttention()
  const attentionItems = maxItems ? allAttentionItems.slice(0, maxItems) : allAttentionItems

  if (attentionItems.length === 0) {
    return (
      <div
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5"
        data-testid="dale-today-panel-empty"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              All clear
            </h3>
            <p className="text-[13px] text-gray-600 dark:text-gray-300 truncate">
              No stations need attention right now.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const errorCount = attentionItems.filter(i => i.severity === 'error').length
  const warningCount = attentionItems.filter(i => i.severity === 'warning').length

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col"
      data-testid="dale-today-panel"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/25 dark:to-orange-900/25 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-white/80 dark:bg-amber-900/40 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
                Today's Focus
              </h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-tight">
                Stations needing immediate attention
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 px-2 py-0.5 rounded-full">
              {attentionItems.length} total
            </span>
            {errorCount > 0 && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 px-2 py-0.5 rounded-full">
                {errorCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 px-2 py-0.5 rounded-full">
                {warningCount} warning
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div
        className="divide-y divide-gray-100 dark:divide-gray-700 overflow-y-auto max-h-64 custom-scrollbar"
        aria-label="Today's focus station list"
      >
        {attentionItems.map(item => (
          <AttentionItemRow
            key={item.station.contextKey}
            item={item}
            onClick={() => onStationClick?.(item.station)}
          />
        ))}
      </div>
    </div>
  )
}
