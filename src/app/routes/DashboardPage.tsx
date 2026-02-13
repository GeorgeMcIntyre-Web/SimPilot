// Dashboard Page
// Main dashboard view for Dale (Simulation Manager)
// Shows Today s Overview strip, Area overview cards, and Stations table

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageHeader } from '../../ui/components/PageHeader'
import { PageHint } from '../../ui/components/PageHint'
import { EmptyState } from '../../ui/components/EmptyState'
import { FirstRunBanner } from '../../ui/components/FirstRunBanner'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { useHasSimulationData } from '../../ui/hooks/useDomainData'
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'
import { normalizeStationId } from '../../domain/crossRef/CrossRefUtils'
import { useCells } from '../../domain/coreStore'
import { log } from '../../lib/log'

import {
  AreaCardsGrid,
  StationsTable,
  FocusSummaryCards,
  generateFocusItems,
  countByRisk,
} from '../../features/dashboard'

type AreaSort = 'total-desc' | 'alpha' | 'risk-desc'
type AreaFilter = 'all' | 'with-risk' | 'critical-only' | 'healthy-only'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DashboardPage() {
  const navigate = useNavigate()
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [areaSearch, setAreaSearch] = useState<string>('')
  const [areaSort, setAreaSort] = useState<AreaSort>('total-desc')
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all')

  // Data from CrossRef
  const { cells, hasData: hasCrossRefData } = useCrossRefData()

  // Legacy cells for navigation mapping
  const legacyCells = useCells()

  // Fallback to check if simulation data exists (legacy)
  const hasLegacyData = useHasSimulationData()
  const visibleCells = useMemo(() => cells.filter((c) => c.simulationStatus && c.areaKey), [cells])
  const hasData = (hasCrossRefData && visibleCells.length > 0) || hasLegacyData

  // Derived data
  const focusItems = useMemo(() => generateFocusItems(visibleCells), [visibleCells])

  const areaData = useMemo(() => {
    const grouped: Record<string, typeof visibleCells> = {}
    for (const cell of visibleCells) {
      const key = cell.areaKey || 'Unknown'
      grouped[key] = grouped[key] ? [...grouped[key], cell] : [cell]
    }

    return Object.entries(grouped).map(([areaKey, areaCells]) => {
      const displayTitle = areaKey

      return {
        areaKey,
        displayTitle,
        counts: countByRisk(areaCells),
      }
    })
  }, [visibleCells])

  const filteredAreas = useMemo(() => {
    const term = areaSearch.trim().toLowerCase()
    let list = term
      ? areaData.filter(
          ({ areaKey, displayTitle }) =>
            areaKey.toLowerCase().includes(term) ||
            (displayTitle && displayTitle.toLowerCase().includes(term)),
        )
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

  // Handlers
  const handleSelectStation = (cell: CellSnapshot) => {
    // Find matching Cell in legacy store by stationKey
    const normalizedStationKey = normalizeStationId(cell.stationKey)

    if (!normalizedStationKey) {
      log.warn('Cannot navigate: invalid stationKey', cell.stationKey)
      return
    }

    // Try to find matching cell by normalized station code
    const matchingCell = legacyCells.find((c) => {
      const normalizedCode = normalizeStationId(c.code)
      return normalizedCode === normalizedStationKey
    })

    if (matchingCell) {
      navigate(`/cells/${encodeURIComponent(matchingCell.id)}`)
    } else {
      // If no legacy cell found, try to navigate using stationKey directly
      // This might work if there's a route that accepts stationKey
      log.warn(
        'No matching Cell found for stationKey:',
        cell.stationKey,
        'Available cells:',
        legacyCells.length,
      )
      // For now, we could show a drawer or modal with station details
      // But since StationDetailDrawer might be on origin/main, we'll just log
    }
  }

  const handleViewAreaOverview = (areaKey: string) => {
    navigate(`/areas/${encodeURIComponent(areaKey)}/overview`)
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
          title={'Dashboard'}
          subtitle={
            <PageHint
              standardText="Overview of simulation progress"
              flowerText="Your daily mission control for station health and focus areas."
            />
          }
        />
      </div>

      {/* Area Overview Cards Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Areas <span className="text-indigo-600 dark:text-indigo-400">Overview</span>
            </h2>
          </div>

          {hasAreas && (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative group w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  value={areaSearch}
                  onChange={(e) => setAreaSearch(e.target.value)}
                  placeholder="Filter areas..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={areaSort}
                  onChange={(e) => setAreaSort(e.target.value as AreaSort)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                >
                  <option value="total-desc">By Volume</option>
                  <option value="risk-desc">By Risk</option>
                  <option value="alpha">A-Z Name</option>
                </select>

                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value as AreaFilter)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                >
                  <option value="all">All Status</option>
                  <option value="with-risk">At Risk</option>
                  <option value="critical-only">Critical</option>
                  <option value="healthy-only">Stable</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <AreaCardsGrid
            areas={filteredAreas}
            selectedArea={selectedArea}
            onSelectArea={setSelectedArea}
            onViewOverview={handleViewAreaOverview}
            density="comfortable"
          />
        </div>
      </section>

      {/* Stations Table */}
      <section className="bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between gap-3 px-6 pt-6 pb-2 relative z-10">
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {selectedArea ? `Nodes in ${selectedArea}` : 'Project Stations'}
            </h3>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
              {visibleCells.length} Active Stations
            </p>
          </div>
        </div>
        <div className="px-6 pb-6 relative z-10">
          <StationsTable
            variant="plain"
            cells={visibleCells}
            selectedArea={selectedArea}
            onSelectStation={handleSelectStation}
            onClearAreaFilter={handleClearAreaFilter}
          />
        </div>
      </section>

      {/* Focus Summary */}
      <FocusSummaryCards items={focusItems} className="w-full" />
    </div>
  )
}

export default DashboardPage
