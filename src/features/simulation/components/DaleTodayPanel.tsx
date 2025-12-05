// Dale's Today Panel
// Shows shortlist of stations needing attention
// Uses selectors to find stations with issues

import { AlertCircle, AlertTriangle, Info, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import { useStationsNeedingAttention, type StationAttentionItem } from '../simulationSelectors'
import type { StationContext } from '../simulationStore'

// ============================================================================
// TYPES
// ============================================================================

interface DaleTodayPanelProps {
  onStationClick?: (station: StationContext) => void
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
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 rounded-lg',
        'text-left transition-colors',
        'hover:bg-gray-100 dark:hover:bg-gray-700/50',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
      )}
      data-testid={`attention-item-${item.station.contextKey}`}
    >
      <SeverityIcon severity={item.severity} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
            {item.station.station}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {item.station.line}
          </span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
          {item.reason}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DaleTodayPanel({
  onStationClick
}: DaleTodayPanelProps) {
  const attentionItems = useStationsNeedingAttention()

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
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              Today's Focus
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                {errorCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                {warningCount} warning
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          {attentionItems.length} station{attentionItems.length !== 1 ? 's' : ''} need attention
        </p>
      </div>

      {/* Items */}
      <div
        className="divide-y divide-gray-100 dark:divide-gray-700 overflow-y-auto max-h-48"
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
