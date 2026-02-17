// Simulation Page
// Main simulation manager board for Dale
// Shows hierarchy: Program → Plant → Unit → Line → Station

import { useNavigate } from 'react-router-dom'
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
} from '../../features/simulation'
import { useSimulationPageState } from './useSimulationPageState'

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
            {errors.slice(0, 3).map((error) => (
              <li key={error}>• {error}</li>
            ))}
            {errors.length > 3 && (
              <li className="text-red-500 dark:text-red-400">... and {errors.length - 3} more</li>
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
  const state = useSimulationPageState()

  // Loading state
  if (state.isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Simulation Board"
          subtitle={
            <PageHint
              standardText="Manage simulations across all programs"
              flowerText="Loading your simulation data..."
            />
          }
        />
        <LoadingState />
      </div>
    )
  }

  // Empty state
  if (state.summary.totalStations === 0 && state.filters.program === null) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Simulation Board"
          subtitle={
            <PageHint
              standardText="Manage simulations across all programs"
              flowerText="Plant some data to see your simulation garden"
            />
          }
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
          subtitle={<PageHint standardText="" flowerText="" />}
        />
      </div>

      {/* Error Banner */}
      <ErrorBanner errors={state.errors} />

      {/* Themed Wrapper */}
      <div style={{ backgroundColor: 'rgb(32, 41, 55)' }} className="p-4 rounded-3xl space-y-4">
        <div
          className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl"
          style={{ backgroundColor: 'rgb(18, 24, 39)' }}
        >
          <div className="p-4 space-y-6">
            {/* Top Section - Stats and Today's Focus Side by Side (Desktop) */}
            <div className="hidden lg:grid lg:grid-cols-5 gap-6 items-start">
              <div className="col-span-3">
                <DaleTodayPanel onStationClick={state.handleStationClick} />
              </div>
              <div className="col-span-2 max-h-64 overflow-y-auto">
                <SummaryStats
                  totalStations={state.summary.totalStations}
                  totalRobots={state.summary.totalRobots}
                  totalGuns={state.summary.totalGuns}
                  totalReuse={state.summary.totalReuse}
                  avgCompletion={state.summary.avgCompletion}
                />
              </div>
            </div>

            {/* Mobile - Stacked Layout */}
            <div className="lg:hidden space-y-6">
              <SummaryStats
                totalStations={state.summary.totalStations}
                totalRobots={state.summary.totalRobots}
                totalGuns={state.summary.totalGuns}
                totalReuse={state.summary.totalReuse}
                avgCompletion={state.summary.avgCompletion}
              />
            </div>

            {/* Filters */}
            <SimulationFiltersBar
              filters={state.filters}
              onFiltersChange={state.setFilters}
              sortBy={state.sortBy}
              onSortChange={state.setSortBy}
              onExpandAll={state.handleExpandAll}
              onCollapseAll={state.handleCollapseAll}
              allExpanded={state.allExpanded}
              allCollapsed={state.allCollapsed}
            />

            {/* Split View Layout - Desktop */}
            <div className="hidden lg:flex lg:flex-row gap-6">
              <div className="flex-1 lg:max-w-[60%] space-y-6">
                <SimulationBoardGrid
                  stations={state.stations}
                  onStationClick={state.handleStationClick}
                  selectedStationKey={state.selectedStation?.contextKey}
                  sortBy={state.sortBy}
                  expandedLines={state.expandedLines}
                  onToggleLine={state.handleToggleLine}
                />
              </div>
              <div className="lg:w-[40%]">
                <div className="sticky top-4">
                  <SimulationDetailPanel
                    station={state.selectedStation}
                    onClose={state.clearSelectedStation}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Layout - Drawer */}
            <div className="lg:hidden space-y-6">
              <DaleTodayPanel onStationClick={state.handleStationClick} />
              <SimulationBoardGrid
                stations={state.stations}
                onStationClick={state.handleStationClick}
                selectedStationKey={state.selectedStation?.contextKey}
                sortBy={state.sortBy}
                expandedLines={state.expandedLines}
                onToggleLine={state.handleToggleLine}
              />
              <SimulationDetailDrawer
                station={state.selectedStation}
                isOpen={state.selectedStation !== null}
                onClose={state.clearSelectedStation}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimulationPage
