// Simulation Page
// Main simulation manager board for Dale
// Shows hierarchy: Program → Plant → Unit → Line → Station

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle, LayoutGrid } from 'lucide-react'
import { PageHeader } from '../../ui/components/PageHeader'
import { PageHint } from '../../ui/components/PageHint'
import { EmptyState } from '../../ui/components/EmptyState'
import {
  SimulationFiltersBar,
  SimulationBoardGrid,
  DaleTodayPanel,
  SimulationDetailPanel,
  SimulationDetailDrawer,
  SummaryStats,
  useSimulationSync,
  useSimulationLoading,
  useSimulationErrors,
  useSimulationBoardStations,
  useFilteredStationsSummary,
  type SimulationFilters,
  type StationContext,
  type SortOption
} from '../../features/simulation'

// ============================================================================
// LOADING STATE
// ============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Loader2 className="h-12 w-12 mx-auto text-blue-500 animate-spin mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Loading Simulation Data...
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Preparing your simulation board
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// ERROR BANNER
// ============================================================================

interface ErrorBannerProps {
  errors: string[]
  onDismiss?: () => void
}

function ErrorBanner({ errors, onDismiss }: ErrorBannerProps) {
  if (errors.length === 0) return null

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-800 dark:text-red-200">
            {errors.length === 1 ? 'Error' : `${errors.length} Errors`}
          </h4>
          <ul className="mt-1 text-sm text-red-700 dark:text-red-300 space-y-1">
            {errors.slice(0, 3).map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
            {errors.length > 3 && (
              <li className="text-red-500 dark:text-red-400">
                ... and {errors.length - 3} more
              </li>
            )}
          </ul>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SimulationPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Sync simulation store with core store
  useSimulationSync()

  // Store state
  const isLoading = useSimulationLoading()
  const errors = useSimulationErrors()

  // Local state
  const [filters, setFilters] = useState<SimulationFilters>({
    program: searchParams.get('program'),
    plant: searchParams.get('plant'),
    unit: searchParams.get('unit'),
    searchTerm: searchParams.get('search') ?? ''
  })
  const [selectedStation, setSelectedStation] = useState<StationContext | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('line-asc')
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set())

  // Filtered stations
  const stations = useSimulationBoardStations(filters)
  const summary = useFilteredStationsSummary({
    program: filters.program,
    plant: filters.plant,
    unit: filters.unit
  })

  // Keep expanded lines in sync with current station set
  useEffect(() => {
    const validKeys = new Set(stations.map(station => `${station.unit}|${station.line}`))
    setExpandedLines(prev => {
      const next = new Set<string>()
      prev.forEach(key => {
        if (validKeys.has(key)) next.add(key)
      })
      return next
    })
  }, [stations])

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.program !== null) params.set('program', filters.program)
    if (filters.plant !== null) params.set('plant', filters.plant)
    if (filters.unit !== null) params.set('unit', filters.unit)
    if (filters.searchTerm !== '') params.set('search', filters.searchTerm)
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams])

  const handleStationClick = (station: StationContext) => {
    setSelectedStation(station)
  }

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
    // Get all line keys from the filtered stations
    const lineKeys = new Set<string>()
    stations.forEach(station => {
      const lineKey = `${station.unit}|${station.line}`
      lineKeys.add(lineKey)
    })
    setExpandedLines(lineKeys)
  }

  const handleCollapseAll = () => {
    setExpandedLines(new Set())
  }

  // Calculate if all lines are expanded or collapsed
  const totalLineCount = new Set(
    stations.map(station => `${station.unit}|${station.line}`)
  ).size
  const allExpanded = expandedLines.size === totalLineCount && totalLineCount > 0
  const allCollapsed = expandedLines.size === 0

  // Auto-select station when navigated with line/station params
  useEffect(() => {
    if (selectedStation !== null) return
    if (stations.length === 0) return

    const targetLine = searchParams.get('line')
    const targetStation = searchParams.get('station')
    const targetStationId = searchParams.get('stationId')

    let match: StationContext | undefined

    if (targetStationId) {
      match = stations.find(
        s => s.contextKey === targetStationId || s.station === targetStationId
      )
    }

    if (!match && (targetLine || targetStation)) {
      match = stations.find(s => {
        const stationMatch = targetStation
          ? s.station.toLowerCase() === targetStation.toLowerCase()
          : true
        const lineMatch = targetLine
          ? s.line.toLowerCase() === targetLine.toLowerCase()
          : true
        return stationMatch && lineMatch
      })
    }

    if (!match && targetStation) {
      match = stations.find(
        s => s.station.toLowerCase() === targetStation.toLowerCase()
      )
    }

    if (match) {
      setSelectedStation(match)
      setExpandedLines(prev => {
        const next = new Set(prev)
        next.add(`${match.unit}|${match.line}`)
        return next
      })
    }
  }, [stations, selectedStation, searchParams, setExpandedLines])

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Simulation Board"
          subtitle={<PageHint standardText="Manage simulations across all programs" flowerText="Loading your simulation data..." />}
        />
        <LoadingState />
      </div>
    )
  }

  // Empty state
  if (summary.totalStations === 0 && filters.program === null) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Simulation Board"
          subtitle={<PageHint standardText="Manage simulations across all programs" flowerText="Plant some data to see your simulation garden" />}
        />
        <EmptyState
          title="No Simulation Data"
          message="Load simulation data from the Data Loader to see your simulation board."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="simulation-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-7 w-7 text-blue-500" />
              Simulation Board
            </span>
          }
          subtitle={
            <PageHint
              standardText="Manage simulations across all programs"
              flowerText="Dale's mission control for simulation tracking"
            />
          }
        />
      </div>

      {/* Error Banner */}
      <ErrorBanner errors={errors} />

      {/* Top Section - Stats and Today's Focus Side by Side (Desktop) */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-6 items-start">
        {/* Dale's Today Panel - Takes 3 columns, full height */}
        <div className="col-span-3">
          <DaleTodayPanel onStationClick={handleStationClick} />
        </div>

        {/* Summary Stats - Takes 2 columns, full height */}
        <div className="col-span-2 max-h-64 overflow-y-auto">
          <SummaryStats
            totalStations={summary.totalStations}
            totalRobots={summary.totalRobots}
            totalGuns={summary.totalGuns}
            totalReuse={summary.totalReuse}
            avgCompletion={summary.avgCompletion}
          />
        </div>
      </div>

      {/* Mobile - Stacked Layout */}
      <div className="lg:hidden space-y-6">
        <SummaryStats
          totalStations={summary.totalStations}
          totalRobots={summary.totalRobots}
          totalGuns={summary.totalGuns}
          totalReuse={summary.totalReuse}
          avgCompletion={summary.avgCompletion}
        />
      </div>

      {/* Filters */}
      <SimulationFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        allExpanded={allExpanded}
        allCollapsed={allCollapsed}
      />

      {/* Split View Layout - Desktop */}
      <div className="hidden lg:flex lg:flex-row gap-6">
        {/* Left Side - Station List (Master) */}
        <div className="flex-1 lg:max-w-[60%] space-y-6">
          <SimulationBoardGrid
            stations={stations}
            onStationClick={handleStationClick}
            selectedStationKey={selectedStation?.contextKey}
            sortBy={sortBy}
            expandedLines={expandedLines}
            onToggleLine={handleToggleLine}
          />
        </div>

        {/* Right Side - Detail Panel (Detail) */}
        <div className="lg:w-[40%]">
          <div className="sticky top-4">
            {/* Station Detail Panel */}
            <SimulationDetailPanel
              station={selectedStation}
              onClose={() => setSelectedStation(null)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Layout - Drawer */}
      <div className="lg:hidden space-y-6">
        {/* Dale's Today Panel */}
        <DaleTodayPanel onStationClick={handleStationClick} />

        {/* Station List */}
        <SimulationBoardGrid
          stations={stations}
          onStationClick={handleStationClick}
          selectedStationKey={selectedStation?.contextKey}
          sortBy={sortBy}
          expandedLines={expandedLines}
          onToggleLine={handleToggleLine}
        />

        {/* Detail Drawer for Mobile */}
        <SimulationDetailDrawer
          station={selectedStation}
          isOpen={selectedStation !== null}
          onClose={() => setSelectedStation(null)}
        />
      </div>
    </div>
  )
}

export default SimulationPage
