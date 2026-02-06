// Simulation Board Grid
// Displays stations in a grid grouped by line
// Shows hierarchy navigation and station cards

import { ChevronDown, ChevronRight, Layers, Bot, Zap } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import { StationCard } from './StationCard'
import { useLineAggregations, getCompletionTextClass } from '../simulationSelectors'
import type { StationContext } from '../simulationStore'

// ============================================================================
// TYPES
// ============================================================================

type SortOption = 'line-asc' | 'line-desc' | 'stations-asc' | 'stations-desc' | 'robots-asc' | 'robots-desc'

interface SimulationBoardGridProps {
  stations: StationContext[]
  onStationClick: (station: StationContext) => void
  selectedStationKey?: string | null
  sortBy: SortOption
  expandedLines: Set<string>
  onToggleLine: (lineKey: string) => void
}

interface LineGroupProps {
  unit: string
  line: string
  stations: StationContext[]
  robotCount: number
  gunCount: number
  avgCompletion: number | null
  onStationClick: (station: StationContext) => void
  selectedStationKey?: string | null
  isExpanded: boolean
  onToggle: () => void
}

// ============================================================================
// LINE GROUP
// ============================================================================

function LineGroup({
  unit,
  line,
  stations,
  robotCount,
  gunCount,
  avgCompletion,
  onStationClick,
  selectedStationKey,
  isExpanded,
  onToggle
}: LineGroupProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm shadow-sm">
      {/* Line Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3',
          'bg-slate-50 dark:bg-gray-800/70 hover:bg-slate-100 dark:hover:bg-gray-700/70',
          'transition-colors'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="h-4 w-4 text-blue-500" />
            <span className={cn('typography-caption truncate', 'text-gray-500 dark:text-gray-400')}>
              {unit}
            </span>
          </div>
          <span
            className={cn(
              'ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0',
              'typography-caption font-semibold',
              getCompletionTextClass(avgCompletion),
              'bg-white text-gray-900 dark:bg-gray-900/70 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
            )}
          >
            {avgCompletion !== null ? `${avgCompletion}% complete` : 'No data'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Station count */}
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-full">
            {stations.length} station{stations.length !== 1 ? 's' : ''}
          </span>

          {/* Asset counts */}
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border border-purple-100 dark:border-purple-800">
              <Bot className="h-3.5 w-3.5" />
              {robotCount} robots
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border border-amber-100 dark:border-amber-800">
              <Zap className="h-3.5 w-3.5" />
              {gunCount} guns
            </span>
          </div>
        </div>
      </button>

      {/* Stations Grid */}
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-800/80 max-h-[560px] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stations.map(station => (
              <StationCard
                key={station.contextKey}
                station={station}
                onClick={onStationClick}
                isSelected={selectedStationKey === station.contextKey}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SimulationBoardGrid({
  stations,
  onStationClick,
  selectedStationKey,
  sortBy,
  expandedLines,
  onToggleLine
}: SimulationBoardGridProps) {
  const lineAggregations = useLineAggregations(stations)

  // Sort lines based on selected option
  const sortedLines = [...lineAggregations].sort((a, b) => {
    switch (sortBy) {
      case 'line-asc':
        return a.lineKey.localeCompare(b.lineKey)
      case 'line-desc':
        return b.lineKey.localeCompare(a.lineKey)
      case 'stations-asc':
        return a.stationCount - b.stationCount
      case 'stations-desc':
        return b.stationCount - a.stationCount
      case 'robots-asc':
        return a.assetCounts.robots - b.assetCounts.robots
      case 'robots-desc':
        return b.assetCounts.robots - a.assetCounts.robots
      default:
        return a.lineKey.localeCompare(b.lineKey)
    }
  })

  if (stations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Layers className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <h3 className="typography-title-sm mb-1">
          No Stations Found
        </h3>
        <p className="typography-subtitle">
          Try adjusting your filters or load data from the Data Loader.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', 'typography-body')}>
      {/* Line Groups - Max 10 visible with scroll */}
      <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
        {sortedLines.map(aggregation => (
          <LineGroup
            key={aggregation.lineKey}
            unit={aggregation.unit}
            line={aggregation.line}
            stations={aggregation.stations}
            robotCount={aggregation.assetCounts.robots}
            gunCount={aggregation.assetCounts.guns}
            avgCompletion={aggregation.avgCompletion}
            onStationClick={onStationClick}
            selectedStationKey={selectedStationKey}
            isExpanded={expandedLines.has(aggregation.lineKey)}
            onToggle={() => onToggleLine(aggregation.lineKey)}
          />
        ))}
      </div>
    </div>
  )
}
