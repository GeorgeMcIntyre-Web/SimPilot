// Simulation Page
// Main simulation manager board for Dale
// Shows hierarchy: Program → Plant → Unit → Line → Station

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle, LayoutGrid, RefreshCw } from 'lucide-react'
import { PageHeader } from '../../ui/components/PageHeader'
import { PageHint } from '../../ui/components/PageHint'
import { FlowerEmptyState } from '../../ui/components/FlowerEmptyState'
import {
  SimulationFiltersBar,
  SimulationBoardGrid,
  DaleTodayPanel,
  SimulationDetailPanel,
  SimulationDetailDrawer,
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
// SUMMARY STATS
// ============================================================================

interface SummaryStatsProps {
  totalStations: number
  totalRobots: number
  totalGuns: number
  totalReuse: number
  avgCompletion: number | null
}

function SummaryStats({
  totalStations,
  totalRobots,
  totalGuns,
  totalReuse,
  avgCompletion
}: SummaryStatsProps) {
  const renderCard = (stat: { label: string; value: number | string; accent: string }) => (
    <div
      key={stat.label}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 h-full flex items-center justify-between shadow-sm"
    >
      <div>
        <div className={`text-xl font-bold ${stat.accent}`}>{stat.value}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
      </div>
      <div className="h-10 w-1 rounded-full bg-gradient-to-b from-blue-200 via-purple-200 to-emerald-200 dark:from-blue-900/40 dark:via-purple-900/40 dark:to-emerald-900/40" />
    </div>
  )

  const stats = [
    { label: 'Stations', value: totalStations, accent: 'text-sky-600 dark:text-sky-400' },
    { label: 'Robots', value: totalRobots, accent: 'text-purple-600 dark:text-purple-400' },
    { label: 'Weld Guns', value: totalGuns, accent: 'text-amber-600 dark:text-amber-400' },
    { label: 'Reuse Items', value: totalReuse, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Avg Completion', value: avgCompletion !== null ? `${avgCompletion}%` : '—', accent: 'text-blue-600 dark:text-blue-400' }
  ]

  return (
    <div className="grid grid-cols-1 gap-3 h-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderCard(stats[0])}
        {renderCard(stats[1])}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {renderCard(stats[2])}
        {renderCard(stats[3])}
      </div>
      {renderCard(stats[4])}
    </div>
  )
}

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
      const lineKey = `${station.program}|${station.plant}|${station.unit}|${station.line}`
      lineKeys.add(lineKey)
    })
    setExpandedLines(lineKeys)
  }

  const handleCollapseAll = () => {
    setExpandedLines(new Set())
  }

  // Calculate if all lines are expanded or collapsed
  const totalLineCount = new Set(
    stations.map(station => `${station.program}|${station.plant}|${station.unit}|${station.line}`)
  ).size
  const allExpanded = expandedLines.size === totalLineCount && totalLineCount > 0
  const allCollapsed = expandedLines.size === 0

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
        <FlowerEmptyState
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
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      <ErrorBanner errors={errors} />

      {/* Top Section - Stats and Today's Focus Side by Side (Desktop) */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-6 items-start">
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

        {/* Dale's Today Panel - Takes 3 columns, full height */}
        <div className="col-span-3">
          <DaleTodayPanel onStationClick={handleStationClick} />
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
