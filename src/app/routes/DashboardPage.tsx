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
import { useTheme } from '../../ui/ThemeContext'
import { cn } from '../../ui/lib/utils'
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'
import { normalizeStationId } from '../../domain/crossRef/CrossRefUtils'
import { useCells } from '../../domain/coreStore'

import {
  TodayForDaleStrip,
  AreaCardsGrid,
  StationsTable,
  DashboardBottlenecksPanel,
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
  const { themeMode } = useTheme()
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedArea, setSelectedArea] = useState<string | null>(null)

  // Data from CrossRef
  const { cells, byArea, hasData: hasCrossRefData } = useCrossRefData()

  // Legacy cells for navigation mapping
  const legacyCells = useCells()

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
    // Find matching Cell in legacy store by stationKey
    const normalizedStationKey = normalizeStationId(cell.stationKey)
    
    if (!normalizedStationKey) {
      console.warn('Cannot navigate: invalid stationKey', cell.stationKey)
      return
    }

    // Try to find matching cell by normalized station code
    const matchingCell = legacyCells.find(c => {
      const normalizedCode = normalizeStationId(c.code)
      return normalizedCode === normalizedStationKey
    })

    if (matchingCell) {
      navigate(`/cells/${matchingCell.id}`)
    } else {
      // If no legacy cell found, try to navigate using stationKey directly
      // This might work if there's a route that accepts stationKey
      console.warn('No matching Cell found for stationKey:', cell.stationKey, 'Available cells:', legacyCells.length)
      // For now, we could show a drawer or modal with station details
      // But since StationDetailDrawer might be on origin/main, we'll just log
    }
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
    <div className="space-y-8 relative" data-testid="dashboard-root">
      {/* Large background flower decorations - both sides, only in flower mode */}
      {themeMode === 'flower' && (
        <>
          {/* Right side - Purple/Violet flower */}
          <div className="fixed top-1/2 right-0 -translate-y-1/2 translate-x-1/4 pointer-events-none z-0 opacity-20 dark:opacity-15">
            <svg
              viewBox="0 0 400 400"
              className="w-[600px] h-[600px]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* HUGE beautiful purple/violet flower */}
              <g transform="translate(200, 150)">
                {/* Outer petals - massive - purple shades */}
                <ellipse cx="0" cy="-40" rx="35" ry="50" fill="#A855F7" opacity="0.9" transform="rotate(-20 0 -40)" />
                <ellipse cx="35" cy="-20" rx="35" ry="50" fill="#A855F7" opacity="0.9" transform="rotate(20 35 -20)" />
                <ellipse cx="35" cy="20" rx="35" ry="50" fill="#A855F7" opacity="0.9" transform="rotate(70 35 20)" />
                <ellipse cx="0" cy="40" rx="35" ry="50" fill="#A855F7" opacity="0.9" transform="rotate(110 0 40)" />
                <ellipse cx="-35" cy="20" rx="35" ry="50" fill="#9333EA" opacity="0.85" transform="rotate(160 -35 20)" />
                <ellipse cx="-35" cy="-20" rx="35" ry="50" fill="#9333EA" opacity="0.85" transform="rotate(200 -35 -20)" />
                <ellipse cx="-20" cy="-30" rx="35" ry="50" fill="#9333EA" opacity="0.85" transform="rotate(50 -20 -30)" />
                <ellipse cx="20" cy="-30" rx="35" ry="50" fill="#9333EA" opacity="0.85" transform="rotate(-50 20 -30)" />
                <ellipse cx="20" cy="30" rx="35" ry="50" fill="#9333EA" opacity="0.85" transform="rotate(130 20 30)" />
                <ellipse cx="-20" cy="30" rx="35" ry="50" fill="#9333EA" opacity="0.85" transform="rotate(160 -20 30)" />
                
                {/* Middle layer petals */}
                <ellipse cx="0" cy="-25" rx="25" ry="35" fill="#C084FC" opacity="0.9" transform="rotate(-15 0 -25)" />
                <ellipse cx="25" cy="-10" rx="25" ry="35" fill="#C084FC" opacity="0.9" transform="rotate(15 25 -10)" />
                <ellipse cx="25" cy="10" rx="25" ry="35" fill="#C084FC" opacity="0.9" transform="rotate(75 25 10)" />
                <ellipse cx="0" cy="25" rx="25" ry="35" fill="#C084FC" opacity="0.9" transform="rotate(105 0 25)" />
                <ellipse cx="-25" cy="10" rx="25" ry="35" fill="#C084FC" opacity="0.9" transform="rotate(165 -25 10)" />
                <ellipse cx="-25" cy="-10" rx="25" ry="35" fill="#C084FC" opacity="0.9" transform="rotate(195 -25 -10)" />
                
                {/* Inner petals */}
                <ellipse cx="0" cy="0" rx="18" ry="25" fill="#DDD6FE" opacity="0.95" transform="rotate(45 0 0)" />
                <ellipse cx="0" cy="0" rx="18" ry="25" fill="#DDD6FE" opacity="0.95" transform="rotate(-45 0 0)" />
                <ellipse cx="0" cy="0" rx="18" ry="25" fill="#DDD6FE" opacity="0.95" transform="rotate(90 0 0)" />
                <ellipse cx="0" cy="0" rx="18" ry="25" fill="#DDD6FE" opacity="0.95" transform="rotate(-90 0 0)" />
                
                {/* Center */}
                <circle cx="0" cy="0" r="15" fill="#9333EA" />
                <circle cx="0" cy="0" r="8" fill="#7E22CE" />
              </g>
              
              {/* Stem - long and elegant */}
              <path d="M 200 200 L 200 350" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
              
              {/* Large leaves */}
              <ellipse cx="160" cy="280" rx="20" ry="15" fill="#10B981" opacity="0.7" transform="rotate(-30 160 280)" />
              <ellipse cx="240" cy="300" rx="20" ry="15" fill="#10B981" opacity="0.7" transform="rotate(30 240 300)" />
              <ellipse cx="170" cy="320" rx="18" ry="14" fill="#10B981" opacity="0.6" transform="rotate(-45 170 320)" />
            </svg>
          </div>
          
          {/* Left side - Blue/Indigo flower */}
          <div className="fixed top-1/2 left-0 -translate-y-1/2 -translate-x-1/4 pointer-events-none z-0 opacity-20 dark:opacity-15">
            <svg
              viewBox="0 0 400 400"
              className="w-[600px] h-[600px]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* HUGE beautiful blue/indigo flower */}
              <g transform="translate(200, 150)">
                {/* Outer petals - massive - blue shades */}
                <ellipse cx="0" cy="-40" rx="35" ry="50" fill="#6366F1" opacity="0.9" transform="rotate(-20 0 -40)" />
                <ellipse cx="35" cy="-20" rx="35" ry="50" fill="#6366F1" opacity="0.9" transform="rotate(20 35 -20)" />
                <ellipse cx="35" cy="20" rx="35" ry="50" fill="#6366F1" opacity="0.9" transform="rotate(70 35 20)" />
                <ellipse cx="0" cy="40" rx="35" ry="50" fill="#6366F1" opacity="0.9" transform="rotate(110 0 40)" />
                <ellipse cx="-35" cy="20" rx="35" ry="50" fill="#4F46E5" opacity="0.85" transform="rotate(160 -35 20)" />
                <ellipse cx="-35" cy="-20" rx="35" ry="50" fill="#4F46E5" opacity="0.85" transform="rotate(200 -35 -20)" />
                <ellipse cx="-20" cy="-30" rx="35" ry="50" fill="#4F46E5" opacity="0.85" transform="rotate(50 -20 -30)" />
                <ellipse cx="20" cy="-30" rx="35" ry="50" fill="#4F46E5" opacity="0.85" transform="rotate(-50 20 -30)" />
                <ellipse cx="20" cy="30" rx="35" ry="50" fill="#4F46E5" opacity="0.85" transform="rotate(130 20 30)" />
                <ellipse cx="-20" cy="30" rx="35" ry="50" fill="#4F46E5" opacity="0.85" transform="rotate(160 -20 30)" />
                
                {/* Middle layer petals */}
                <ellipse cx="0" cy="-25" rx="25" ry="35" fill="#818CF8" opacity="0.9" transform="rotate(-15 0 -25)" />
                <ellipse cx="25" cy="-10" rx="25" ry="35" fill="#818CF8" opacity="0.9" transform="rotate(15 25 -10)" />
                <ellipse cx="25" cy="10" rx="25" ry="35" fill="#818CF8" opacity="0.9" transform="rotate(75 25 10)" />
                <ellipse cx="0" cy="25" rx="25" ry="35" fill="#818CF8" opacity="0.9" transform="rotate(105 0 25)" />
                <ellipse cx="-25" cy="10" rx="25" ry="35" fill="#818CF8" opacity="0.9" transform="rotate(165 -25 10)" />
                <ellipse cx="-25" cy="-10" rx="25" ry="35" fill="#818CF8" opacity="0.9" transform="rotate(195 -25 -10)" />
                
                {/* Inner petals */}
                <ellipse cx="0" cy="0" rx="18" ry="25" fill="#C7D2FE" opacity="0.95" transform="rotate(45 0 0)" />
                <ellipse cx="0" cy="0" rx="18" ry="25" fill="#C7D2FE" opacity="0.95" transform="rotate(-45 0 0)" />
                <ellipse cx="0" cy="0" rx="18" ry="25" fill="#C7D2FE" opacity="0.95" transform="rotate(90 0 0)" />
                <ellipse cx="0" cy="0" rx="18" ry="25" fill="#C7D2FE" opacity="0.95" transform="rotate(-90 0 0)" />
                
                {/* Center */}
                <circle cx="0" cy="0" r="15" fill="#4F46E5" />
                <circle cx="0" cy="0" r="8" fill="#4338CA" />
              </g>
              
              {/* Stem - long and elegant */}
              <path d="M 200 200 L 200 350" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
              
              {/* Large leaves */}
              <ellipse cx="160" cy="280" rx="20" ry="15" fill="#10B981" opacity="0.7" transform="rotate(-30 160 280)" />
              <ellipse cx="240" cy="300" rx="20" ry="15" fill="#10B981" opacity="0.7" transform="rotate(30 240 300)" />
              <ellipse cx="170" cy="320" rx="18" ry="14" fill="#10B981" opacity="0.6" transform="rotate(-45 170 320)" />
            </svg>
          </div>
        </>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title={
            <span className="flex items-center">
              Dashboard <FlowerAccent className="ml-3 h-12 w-12 text-rose-400" />
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

      {/* Tooling bottlenecks */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Tooling Bottlenecks Overview
        </h3>
        <DashboardBottlenecksPanel />
      </section>

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
