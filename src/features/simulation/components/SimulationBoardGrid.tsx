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
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Line Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50',
          'transition-colors'
        )}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <Layers className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm text-gray-900 dark:text-white">
            {line}
          </span>
          <span className={cn(
            'font-semibold w-12 text-right',
            getCompletionTextClass(avgCompletion)
          )}>
            {avgCompletion !== null ? `${avgCompletion}%` : '-'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            in {unit}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Station count */}
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {stations.length} station{stations.length !== 1 ? 's' : ''}
          </span>

          {/* Asset counts */}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Bot className="h-3.5 w-3.5 text-purple-500" />
              {robotCount}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              {gunCount}
            </span>
          </div>
        </div>
      </button>

      {/* Stations Grid */}
      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-800 max-h-[600px] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
          No Stations Found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Try adjusting your filters or load data from the Data Loader.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
