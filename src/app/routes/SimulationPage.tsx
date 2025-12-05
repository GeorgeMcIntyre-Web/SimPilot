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
  type StationContext
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
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalStations}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Stations</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalRobots}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Robots</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalGuns}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Weld Guns</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalReuse}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Reuse Items</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {avgCompletion !== null ? `${avgCompletion}%` : '—'}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Avg Completion</div>
      </div>
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

      {/* Summary Stats */}
      <SummaryStats
        totalStations={summary.totalStations}
        totalRobots={summary.totalRobots}
        totalGuns={summary.totalGuns}
        totalReuse={summary.totalReuse}
        avgCompletion={summary.avgCompletion}
      />

      {/* Filters */}
      <SimulationFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Split View Layout - Desktop */}
      <div className="hidden lg:flex lg:flex-row gap-6">
        {/* Left Side - Station List (Master) */}
        <div className="flex-1 lg:max-w-[60%] space-y-6">
          <SimulationBoardGrid
            stations={stations}
            onStationClick={handleStationClick}
            selectedStationKey={selectedStation?.contextKey}
          />
        </div>

        {/* Right Side - Detail Panel (Detail) */}
        <div className="lg:w-[40%] space-y-6">
          <div className="sticky top-4 space-y-6">
            {/* Dale's Today Panel */}
            <DaleTodayPanel onStationClick={handleStationClick} />

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
