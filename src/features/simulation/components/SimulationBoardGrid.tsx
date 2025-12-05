// Simulation Board Grid
// Displays stations in a grid grouped by line
// Shows hierarchy navigation and station cards

import { useState } from 'react'
import { ChevronDown, ChevronRight, Layers, Bot, Zap, Maximize2, Minimize2, ArrowUpDown } from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import { StationCard } from './StationCard'
import { useLineAggregations } from '../simulationSelectors'
import { useStationsGroupedByLine } from '../simulationSelectors'
import type { StationContext } from '../simulationStore'

// ============================================================================
// SORTING TYPES
// ============================================================================

type SortOption = 'line-asc' | 'line-desc' | 'stations-asc' | 'stations-desc' | 'robots-asc' | 'robots-desc'

interface SortConfig {
  value: SortOption
  label: string
}

// ============================================================================
// TYPES
// ============================================================================

interface SimulationBoardGridProps {
  stations: StationContext[]
  onStationClick: (station: StationContext) => void
  selectedStationKey?: string | null
}

interface LineGroupProps {
  lineKey: string
  unit: string
  line: string
  stations: StationContext[]
  robotCount: number
  gunCount: number
  onStationClick: (station: StationContext) => void
  selectedStationKey?: string | null
  isExpanded: boolean
  onToggle: () => void
}

// ============================================================================
// LINE GROUP
// ============================================================================

function LineGroup({
  lineKey: _lineKey,
  unit,
  line,
  stations,
  robotCount,
  gunCount,
  onStationClick,
  selectedStationKey,
  isExpanded,
  onToggle
}: LineGroupProps) {
  // _lineKey is for identification but not displayed directly

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
          <div className="text-left">
            <span className="font-semibold text-gray-900 dark:text-white">{line}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              in {unit}
            </span>
          </div>
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

const SORT_OPTIONS: SortConfig[] = [
  { value: 'line-asc', label: 'Line (A-Z)' },
  { value: 'line-desc', label: 'Line (Z-A)' },
  { value: 'stations-asc', label: 'Stations (Low-High)' },
  { value: 'stations-desc', label: 'Stations (High-Low)' },
  { value: 'robots-asc', label: 'Robots (Low-High)' },
  { value: 'robots-desc', label: 'Robots (High-Low)' }
]

export function SimulationBoardGrid({
  stations,
  onStationClick,
  selectedStationKey
}: SimulationBoardGridProps) {
  const groupedByLine = useStationsGroupedByLine(stations)
  const lineAggregations = useLineAggregations(stations)

  // Track expanded state for each line
  const [expandedLines, setExpandedLines] = useState<Set<string>>(() => {
    // Initialize with all lines collapsed by default
    return new Set()
  })

  // Track sorting preference
  const [sortBy, setSortBy] = useState<SortOption>('line-asc')

  // Sort lines based on selected option
  const sortedLines = Array.from(groupedByLine.entries()).sort((a, b) => {
    const [keyA, stationsA] = a
    const [keyB, stationsB] = b
    const aggA = lineAggregations.find(agg => agg.lineKey === keyA)
    const aggB = lineAggregations.find(agg => agg.lineKey === keyB)

    switch (sortBy) {
      case 'line-asc':
        return keyA.localeCompare(keyB)
      case 'line-desc':
        return keyB.localeCompare(keyA)
      case 'stations-asc':
        return stationsA.length - stationsB.length
      case 'stations-desc':
        return stationsB.length - stationsA.length
      case 'robots-asc':
        return (aggA?.assetCounts.robots ?? 0) - (aggB?.assetCounts.robots ?? 0)
      case 'robots-desc':
        return (aggB?.assetCounts.robots ?? 0) - (aggA?.assetCounts.robots ?? 0)
      default:
        return keyA.localeCompare(keyB)
    }
  })

  const handleToggleLine = (lineKey: string) => {
    setExpandedLines(prev => {
      const next = new Set(prev)
      if (next.has(lineKey)) {
        next.delete(lineKey)
      } else {
        next.add(lineKey)
      }
      return next
    })
  }

  const handleExpandAll = () => {
    setExpandedLines(new Set(sortedLines.map(([lineKey]) => lineKey)))
  }

  const handleCollapseAll = () => {
    setExpandedLines(new Set())
  }

  const allExpanded = expandedLines.size === sortedLines.length
  const allCollapsed = expandedLines.size === 0

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
      {/* Controls Bar */}
      {sortedLines.length > 1 && (
        <div className="flex items-center justify-between gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className={cn(
                "text-sm rounded-md border-gray-300 dark:border-gray-600",
                "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                "focus:ring-blue-500 focus:border-blue-500",
                "px-3 py-1.5"
              )}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Expand/Collapse All Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExpandAll}
              disabled={allExpanded}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                allExpanded
                  ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              )}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              disabled={allCollapsed}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                allCollapsed
                  ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              )}
            >
              <Minimize2 className="h-3.5 w-3.5" />
              Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Line Groups - Max 10 visible with scroll */}
      <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
        {sortedLines.map(([lineKey, lineStations]) => {
          const aggregation = lineAggregations.find(a => a.lineKey === lineKey)
          if (aggregation === undefined) return null

          return (
            <LineGroup
              key={lineKey}
              lineKey={lineKey}
              unit={aggregation.unit}
              line={aggregation.line}
              stations={lineStations}
              robotCount={aggregation.assetCounts.robots}
              gunCount={aggregation.assetCounts.guns}
              onStationClick={onStationClick}
              selectedStationKey={selectedStationKey}
              isExpanded={expandedLines.has(lineKey)}
              onToggle={() => handleToggleLine(lineKey)}
            />
          )
        })}
      </div>
    </div>
  )
}
