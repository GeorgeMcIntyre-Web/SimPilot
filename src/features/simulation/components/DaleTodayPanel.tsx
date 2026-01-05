// Dale's Today Panel
// Shows shortlist of stations needing attention
// Uses selectors to find stations with issues

import { AlertCircle, AlertTriangle, Info, ChevronRight, Sparkles, Bot, Zap, Package } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import { useStationsNeedingAttention, type StationAttentionItem } from '../simulationSelectors'
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

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full grid grid-cols-[auto,1fr,auto,1fr,auto] items-center gap-3 px-3 py-2 rounded-lg',
        'text-left transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-700/50',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
      )}
      data-testid={`attention-item-${item.station.contextKey}`}
    >
      {/* Severity Icon - fixed width */}
      <div className="flex-shrink-0 w-4 flex items-center justify-center">
        <SeverityIcon severity={item.severity} />
      </div>

      {/* Station info */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white leading-snug">
          <span className="truncate">{station.station}</span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span className="text-gray-600 dark:text-gray-400 truncate">{station.line}</span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span className="text-gray-500 dark:text-gray-400 truncate">{station.unit}</span>
        </div>
      </div>

      {/* Asset badges */}
      <div className="flex items-center justify-end gap-1 text-[10px]">
        {station.assetCounts.robots > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-medium">
            <Bot className="h-2 w-2" />
            {station.assetCounts.robots}
          </span>
        )}
        {station.assetCounts.guns > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-medium">
            <Zap className="h-2 w-2" />
            {station.assetCounts.guns}
          </span>
        )}
        {station.assetCounts.total > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-medium">
            <Package className="h-2 w-2" />
            {station.assetCounts.total}
          </span>
        )}
      </div>

      {/* Reason */}
      <div className="text-[11px] text-gray-600 dark:text-gray-400 text-right truncate min-w-0">
        {item.reason}
      </div>

      {/* Chevron - fixed width */}
      <div className="flex-shrink-0 w-4 flex items-center justify-center">
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
        className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-6"
        data-testid="dale-today-panel-empty"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
            All Clear!
          </h3>
        </div>
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          No stations need immediate attention. Everything is on track.
        </p>
      </div>
    )
  }

  const errorCount = attentionItems.filter(i => i.severity === 'error').length
  const warningCount = attentionItems.filter(i => i.severity === 'warning').length

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
      data-testid="dale-today-panel"
    >
      {/* Header */}
      <div className="px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              Today's Focus
            </h3>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              ({attentionItems.length})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {errorCount > 0 && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">
                {errorCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                {warningCount}
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
