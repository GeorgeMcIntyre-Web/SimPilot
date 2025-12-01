// Dashboard Page
// Main dashboard view for Dale (Simulation Manager)
// Shows Today for Dale strip, Area overview cards, and Stations table

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Table2 } from 'lucide-react'
import { PageHeader } from '../../ui/components/PageHeader'
import { PageHint } from '../../ui/components/PageHint'
import { FlowerAccent } from '../../ui/components/FlowerAccent'
import { FlowerEmptyState } from '../../ui/components/FlowerEmptyState'
import { FirstRunBanner } from '../../ui/components/FirstRunBanner'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { useHasSimulationData } from '../../ui/hooks/useDomainData'
import { cn } from '../../ui/lib/utils'
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'

import {
  TodayForDaleStrip,
  AreaCardsGrid,
  StationsTable,
  generateFocusItems,
  countByRisk,
  getRiskLevel
} from '../../features/dashboard'

// ============================================================================
// VIEW MODE TOGGLE
// ============================================================================

type ViewMode = 'overview' | 'table'

interface ViewModeToggleProps {
  mode: ViewMode
  onModeChange: (mode: ViewMode) => void
}

function ViewModeToggle({ mode, onModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
      <button
        onClick={() => onModeChange('overview')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          mode === 'overview'
            ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Overview</span>
      </button>
      <button
        onClick={() => onModeChange('table')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          mode === 'table'
            ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        )}
      >
        <Table2 className="h-4 w-4" />
        <span className="hidden sm:inline">Table</span>
      </button>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DashboardPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedArea, setSelectedArea] = useState<string | null>(null)

  // Data from CrossRef
  const { cells, byArea, hasData: hasCrossRefData } = useCrossRefData()

  // Fallback to check if simulation data exists (legacy)
  const hasLegacyData = useHasSimulationData()
  const hasData = hasCrossRefData || hasLegacyData

  // Derived data
  const focusItems = useMemo(() => generateFocusItems(cells), [cells])

  const areaData = useMemo(() => {
    return Object.entries(byArea).map(([areaKey, areaCells]) => ({
      areaKey,
      counts: countByRisk(areaCells)
    }))
  }, [byArea])

  const stats = useMemo(() => {
    const withFlags = cells.filter(c => c.flags.length > 0).length
    const healthy = cells.filter(c => getRiskLevel(c.flags) === 'OK').length
    return { withFlags, healthy, total: cells.length }
  }, [cells])

  // Handlers
  const handleSelectStation = (cell: CellSnapshot) => {
    // Navigate to cell detail page
    // For now, just log - Agent 2 will implement the detail view
    console.log('Selected station:', cell.stationKey)
    // TODO: navigate to station detail when Agent 2 implements it
  }

  const handleClearAreaFilter = () => {
    setSelectedArea(null)
  }

  // Empty state
  if (!hasData) {
    return (
      <div className="space-y-8" data-testid="dashboard-empty">
        <PageHeader
          title="Dashboard"
          subtitle={
            <PageHint
              standardText="Overview of simulation progress"
              flowerText="Load the demo from Data Loader to see a full, realistic example."
            />
          }
        />

        <FirstRunBanner />

        <FlowerEmptyState
          title="Welcome to SimPilot"
          message="No data loaded yet. Plant some data by loading files in the Data Loader."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8" data-testid="dashboard-root">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title={
            <span className="flex items-center">
              Dashboard <FlowerAccent className="ml-2 h-6 w-6 text-rose-400" />
            </span>
          }
          subtitle={
            <PageHint
              standardText="Overview of simulation progress"
              flowerText="Your daily mission control for station health and focus areas."
            />
          }
        />
        <ViewModeToggle mode={viewMode} onModeChange={setViewMode} />
      </div>

      {/* Today for Dale Strip */}
      <TodayForDaleStrip
        focusItems={focusItems}
        stationsWithFlags={stats.withFlags}
        stationsHealthy={stats.healthy}
        totalStations={stats.total}
      />

      {viewMode === 'overview' ? (
        <>
          {/* Area Overview Cards */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Areas Overview
            </h3>
            <AreaCardsGrid
              areas={areaData}
              selectedArea={selectedArea}
              onSelectArea={setSelectedArea}
            />
          </section>

          {/* Stations Table */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {selectedArea ? `Stations in ${selectedArea}` : 'All Stations'}
            </h3>
            <StationsTable
              cells={cells}
              selectedArea={selectedArea}
              onSelectStation={handleSelectStation}
              onClearAreaFilter={handleClearAreaFilter}
            />
          </section>
        </>
      ) : (
        /* Full table view */
        <section>
          <StationsTable
            cells={cells}
            selectedArea={selectedArea}
            onSelectStation={handleSelectStation}
            onClearAreaFilter={handleClearAreaFilter}
          />
        </section>
      )}
    </div>
  )
}
