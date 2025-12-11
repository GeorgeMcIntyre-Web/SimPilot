// Dashboard Page
// Main dashboard view for Dale (Simulation Manager)
// Shows Today for Dale strip, Area overview cards, and Stations table

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowUpDown } from 'lucide-react'
import { PageHeader } from '../../ui/components/PageHeader'
import { PageHint } from '../../ui/components/PageHint'
import { EmptyState } from '../../ui/components/EmptyState'
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

type AreaSort = 'total-desc' | 'alpha' | 'risk-desc'
type AreaFilter = 'all' | 'with-risk' | 'critical-only' | 'healthy-only'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DashboardPage() {
  const navigate = useNavigate()
  const { themeMode } = useTheme()
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [areaSearch, setAreaSearch] = useState<string>('')
  const [areaSort, setAreaSort] = useState<AreaSort>('total-desc')
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')

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

  const filteredAreas = useMemo(() => {
    const term = areaSearch.trim().toLowerCase()
    let list = term
      ? areaData.filter(({ areaKey }) => areaKey.toLowerCase().includes(term))
      : areaData

    if (areaFilter === 'with-risk') {
      list = list.filter(({ counts }) => counts.atRisk + counts.critical > 0)
    } else if (areaFilter === 'critical-only') {
      list = list.filter(({ counts }) => counts.critical > 0)
    } else if (areaFilter === 'healthy-only') {
      list = list.filter(({ counts }) => counts.critical === 0 && counts.atRisk === 0)
    }

    const sorted = [...list].sort((a, b) => {
      if (areaSort === 'alpha') return a.areaKey.localeCompare(b.areaKey)
      if (areaSort === 'risk-desc') {
        const score = (counts: ReturnType<typeof countByRisk>) =>
          counts.critical * 1000 + counts.atRisk * 10 + counts.total
        return score(b.counts) - score(a.counts)
      }
      // default total-desc
      return b.counts.total - a.counts.total
    })

    return sorted
  }, [areaData, areaSearch, areaSort, areaFilter])
  const hasAreas = filteredAreas.length > 0

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
      navigate(`/cells/${encodeURIComponent(matchingCell.id)}`)
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

        <EmptyState
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title={
            'Dashboard'
          }
          subtitle={
            <PageHint
              standardText="Overview of simulation progress"
              flowerText="Your daily mission control for station health and focus areas."
            />
          }
        />
      </div>

      {/* Today for Dale Strip */}
      <TodayForDaleStrip
        focusItems={focusItems}
        stationsWithFlags={stats.withFlags}
        stationsHealthy={stats.healthy}
        totalStations={stats.total}
      />

      {/* Area Overview Cards */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Areas Overview
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filteredAreas.length} {filteredAreas.length === 1 ? 'area' : 'areas'}
            </p>
          </div>
        </div>

        {hasAreas && (
          <div className="px-4 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 w-full md:flex-1 min-w-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={areaSearch}
                  onChange={(e) => setAreaSearch(e.target.value)}
                  placeholder="Search areas..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                />
              </div>
              {areaSearch && (
                <button
                  onClick={() => setAreaSearch('')}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-gray-400" />
                <select
                  value={areaSort}
                  onChange={(e) => setAreaSort(e.target.value as AreaSort)}
                  className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="total-desc">Sort by Total</option>
                  <option value="risk-desc">Sort by Risk</option>
                  <option value="alpha">Sort A → Z</option>
                </select>
              </div>

              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value as AreaFilter)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Areas</option>
                <option value="with-risk">With Risk</option>
                <option value="critical-only">Critical Only</option>
                <option value="healthy-only">Healthy Only</option>
              </select>
            </div>
          </div>
        )}

        <div className="px-4 pb-4">
          <AreaCardsGrid
            areas={filteredAreas}
            selectedArea={selectedArea}
            onSelectArea={setSelectedArea}
            density="comfortable"
          />
        </div>
      </section>

      {/* Stations Table */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedArea ? `Stations in ${selectedArea}` : 'All Stations'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {cells.length} {cells.length === 1 ? 'station' : 'stations'}
            </p>
          </div>
        </div>
        <div className="px-4 pb-4">
          <StationsTable
            variant="plain"
            cells={cells}
            selectedArea={selectedArea}
            onSelectStation={handleSelectStation}
            onClearAreaFilter={handleClearAreaFilter}
          />
        </div>
      </section>

      {/* Tooling bottlenecks */}
      <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tooling Bottlenecks Overview
            </h3>
          </div>
        </div>
        <div className="px-4 pb-4">
          <DashboardBottlenecksPanel variant="embedded" />
        </div>
      </section>
    </div>
  )
}
