/**
 * Assets Page
 *
 * Complete asset browser with:
 * - Filter bar (SimulationContext, AssetKind, Sourcing, ReuseAllocationStatus)
 * - Summary strip (counts by sourcing, reuse status)
 * - Main table with all asset details
 * - Detail panel for individual asset inspection
 * - "Open in Simulation Status" navigation
 *
 * Follows coding style:
 * - Guard clauses
 * - No else/elseif
 * - Max nesting depth 2
 * - No any types
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { DataTable } from '../../ui/components/DataTable'
import { EmptyState } from '../../ui/components/EmptyState'
import { useCoreStore } from '../../domain/coreStore'
import {
  useAssetsFilters,
  type AssetWithMetadata,
  summarizeAssetsForCounts,
} from '../../features/assets'
import type { ReuseAllocationStatus } from '../../ingestion/excelIngestionTypes'
import type { EquipmentSourcing } from '../../domain/UnifiedModel'
import { Filter, ChevronRight, Package } from 'lucide-react'
import { AssetsFilterBar, AssetsSummaryStrip } from '../../features/assets/AssetsFilters'
import { useAssetBottlenecks } from '../hooks/assets/useAssetBottlenecks'
import { useAssetsSorting } from '../hooks/assets/useAssetsSorting'
import { createAssetsTableColumns } from '../components/assets/AssetsTableColumns'

import { getMetadataValue } from '../../utils/metadata'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractMetadata<T>(asset: AssetWithMetadata, key: string): T | undefined {
  return getMetadataValue<T>(asset, key)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AssetsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useCoreStore()
  const allAssets = state.assets

  // Filter state
  const {
    filters,
    filteredAssets,
    availableAreas,
    availableLines,
    availablePrograms,
    hasActiveFilters,
    setSearchTerm,
    setKindFilter,
    setSourcingFilter,
    setReuseStatusFilter,
    setAreaFilter,
    setLineFilter,
    setStationFilter,
    setProgramFilter,
    clearFilters,
  } = useAssetsFilters(allAssets)

  const [onlyBottleneckAssets, setOnlyBottleneckAssets] = useState(false)
  const [linkedContextLabel, setLinkedContextLabel] = useState<string | null>(null)
  const appliedLinkKeyRef = useRef<string | null>(null)
  const appliedAssetIdRef = useRef<string | null>(null)

  // Bottleneck integration
  const { assetBottleneckMap } = useAssetBottlenecks(allAssets)

  // Filter by bottleneck
  const filteredByBottleneck = useMemo(() => {
    if (!onlyBottleneckAssets) {
      return filteredAssets
    }
    return filteredAssets.filter((asset) => assetBottleneckMap.has(asset.id))
  }, [filteredAssets, onlyBottleneckAssets, assetBottleneckMap])

  // Sorting
  const { handleSort, sortedAssets } = useAssetsSorting(filteredByBottleneck)

  // Display counts
  const displayCounts = useMemo(
    () => summarizeAssetsForCounts(filteredByBottleneck),
    [filteredByBottleneck],
  )

  // Summary strip filter click handler
  const handleSummaryFilterClick = useCallback(
    (filter: { sourcing?: EquipmentSourcing; reuseStatus?: ReuseAllocationStatus }) => {
      if (filter.sourcing !== undefined) {
        setSourcingFilter(filter.sourcing)
      }
      if (filter.reuseStatus !== undefined) {
        setReuseStatusFilter(filter.reuseStatus)
      }
    },
    [setSourcingFilter, setReuseStatusFilter],
  )

  // Table columns
  const columns = useMemo(() => createAssetsTableColumns(handleSort), [handleSort])

  // Move hooks before early return to comply with React rules
  const showActiveFilters = hasActiveFilters || onlyBottleneckAssets

  const handleClearAllFilters = useCallback(() => {
    clearFilters()
    setOnlyBottleneckAssets(false)
  }, [clearFilters])

  // Apply deep-link filters coming from Simulation/Station views
  useEffect(() => {
    const stationParam = searchParams.get('station')
    const lineParam = searchParams.get('line')
    const programParam = searchParams.get('program')
    const areaParam = searchParams.get('area')

    const linkKey = [stationParam, lineParam, programParam, areaParam].filter(Boolean).join('|')
    if (!linkKey) {
      return
    }
    if (appliedLinkKeyRef.current === linkKey) {
      return
    }

    if (stationParam) {
      setStationFilter(stationParam)
      setSearchTerm(stationParam)
    }
    if (lineParam) {
      setLineFilter(lineParam)
    }
    if (programParam) {
      setProgramFilter(programParam)
    }
    if (areaParam) {
      setAreaFilter(areaParam)
    }
    setOnlyBottleneckAssets(false)
    setLinkedContextLabel(
      ['Station', stationParam, lineParam ? `Line ${lineParam}` : null, programParam]
        .filter(Boolean)
        .join(' · '),
    )
    appliedLinkKeyRef.current = linkKey
  }, [
    searchParams,
    setStationFilter,
    setSearchTerm,
    setLineFilter,
    setProgramFilter,
    setAreaFilter,
  ])

  // Handle assetId deep-link - auto-select and open asset detail panel
  useEffect(() => {
    const assetIdParam = searchParams.get('assetId')
    const robotNumberParam = searchParams.get('robotNumber')
    if (!assetIdParam) {
      return
    }
    if (appliedAssetIdRef.current === assetIdParam) {
      return
    }

    // Find the asset by ID
    const targetAsset = allAssets.find((a) => a.id === assetIdParam)
    if (!targetAsset) {
      return
    }

    // Clear existing filters and focus on the targeted asset
    clearFilters()
    setOnlyBottleneckAssets(false)
    const robotNumber =
      robotNumberParam ||
      extractMetadata<string>(targetAsset, 'robotNumber') ||
      extractMetadata<string>(targetAsset, 'Robo No. New') ||
      extractMetadata<string>(targetAsset, 'ROBO NO. NEW') ||
      targetAsset.name ||
      assetIdParam
    setSearchTerm(robotNumber)

    // Auto-select the asset to open detail panel
    setLinkedContextLabel(`Asset: ${robotNumber}`)
    appliedAssetIdRef.current = assetIdParam
  }, [searchParams, allAssets, clearFilters, setSearchTerm])

  const handleClearLinkedContext = () => {
    setLinkedContextLabel(null)
    setSearchParams(new URLSearchParams())
    handleClearAllFilters()
  }

  // Empty state - moved after all hooks to comply with React rules
  if (allAssets.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              SimPilot
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 dark:text-gray-200">Assets</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
                Asset <span className="text-indigo-600 dark:text-indigo-400">Inventory</span>
              </h1>
            </div>
          </div>
        </div>
        <EmptyState
          title="No Assets Found"
          message="Please go to the Data Loader to import your equipment lists."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
          icon={<Package className="h-7 w-7" />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8" data-testid="assets-page">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
            SimPilot
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 dark:text-gray-200">Assets</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
              Asset <span className="text-indigo-600 dark:text-indigo-400">Inventory</span>
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {displayCounts.total} of {allAssets.length} assets
              {showActiveFilters && (
                <span className="text-indigo-600 dark:text-indigo-400"> (filtered)</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {linkedContextLabel && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900 dark:text-indigo-100">
              Linked from Simulation
            </span>
          </div>
          <button
            onClick={handleClearLinkedContext}
            className="text-[9px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
          >
            Clear Link
          </button>
        </div>
      )}

      {/* Filter Bar + Metrics */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-3 items-stretch">
        <div className="h-full">
          <AssetsFilterBar
            filters={filters}
            availableAreas={availableAreas}
            availableLines={availableLines}
            availablePrograms={availablePrograms}
            hasActiveFilters={hasActiveFilters}
            onlyBottlenecks={onlyBottleneckAssets}
            onSearchChange={setSearchTerm}
            onKindChange={setKindFilter}
            onSourcingChange={setSourcingFilter}
            onReuseStatusChange={setReuseStatusFilter}
            onAreaChange={setAreaFilter}
            onLineChange={setLineFilter}
            onProgramChange={setProgramFilter}
            onOnlyBottlenecksChange={setOnlyBottleneckAssets}
            onClearFilters={handleClearAllFilters}
          />
        </div>

        <div className="h-full flex">
          <AssetsSummaryStrip counts={displayCounts} onFilterClick={handleSummaryFilterClick} />
        </div>
      </div>

      {/* Active Filters Indicator */}
      {showActiveFilters && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-xl shadow-sm">
          <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">
            Showing {displayCounts.total} of {allAssets.length} assets
          </span>
          <button
            onClick={handleClearAllFilters}
            className="ml-auto text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Assets Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-auto max-h-[540px]">
          <DataTable
            data={sortedAssets}
            columns={columns}
            onRowDoubleClick={(asset) => navigate(`/assets/${encodeURIComponent(asset.id)}`)}
            emptyMessage="No assets match the current filters."
            keyExtractor={(asset) => asset.id}
          />
        </div>
      </div>
    </div>
  )
}

export default AssetsPage
