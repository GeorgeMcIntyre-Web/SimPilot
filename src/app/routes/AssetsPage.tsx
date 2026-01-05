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

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable } from '../../ui/components/DataTable';
import { EmptyState } from '../../ui/components/EmptyState';
import { useCoreStore } from '../../domain/coreStore';
import {
  useAssetsFilters,
  type AssetWithMetadata,
  summarizeAssetsForCounts,
} from '../../features/assets';
import { AssetDetailPanel } from '../../features/assets/AssetDetailPanel';
import type { ReuseAllocationStatus } from '../../ingestion/excelIngestionTypes';
import type { EquipmentSourcing } from '../../domain/UnifiedModel';
import { Filter } from 'lucide-react';
import { AssetsFilterBar, AssetsSummaryStrip } from '../../features/assets/AssetsFilters';
import { useAssetBottlenecks } from '../hooks/assets/useAssetBottlenecks';
import { useAssetsSorting } from '../hooks/assets/useAssetsSorting';
import { createAssetsTableColumns } from '../components/assets/AssetsTableColumns';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractMetadata<T>(asset: AssetWithMetadata, key: string): T | undefined {
  const value = asset.metadata?.[key];
  if (value === null || value === undefined) {
    return undefined;
  }
  return value as T;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AssetsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useCoreStore();
  const allAssets = state.assets;

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
  } = useAssetsFilters(allAssets);

  const [onlyBottleneckAssets, setOnlyBottleneckAssets] = useState(false);
  const [linkedContextLabel, setLinkedContextLabel] = useState<string | null>(null);
  const appliedLinkKeyRef = useRef<string | null>(null);

  // Bottleneck integration
  const { assetBottleneckMap } = useAssetBottlenecks(allAssets);

  // Filter by bottleneck
  const filteredByBottleneck = useMemo(() => {
    if (!onlyBottleneckAssets) {
      return filteredAssets;
    }
    return filteredAssets.filter((asset) => assetBottleneckMap.has(asset.id));
  }, [filteredAssets, onlyBottleneckAssets, assetBottleneckMap]);

  // Sorting
  const { handleSort, sortedAssets } = useAssetsSorting(filteredByBottleneck);

  // Display counts
  const displayCounts = useMemo(
    () => summarizeAssetsForCounts(filteredByBottleneck),
    [filteredByBottleneck]
  );

  // Detail panel state
  const [selectedAsset, setSelectedAsset] = useState<AssetWithMetadata | null>(null);

  // Row click handler
  const handleRowClick = useCallback((asset: AssetWithMetadata) => {
    setSelectedAsset(asset);
  }, []);

  // Close detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedAsset(null);
  }, []);

  // Open in Simulation Status
  const handleOpenInSimulation = useCallback((asset: AssetWithMetadata) => {
    const params = new URLSearchParams();

    const areaName = asset.areaName ?? extractMetadata<string>(asset, 'areaName');
    const lineCode = extractMetadata<string>(asset, 'lineCode') ?? extractMetadata<string>(asset, 'assemblyLine');
    const station = asset.stationNumber ?? extractMetadata<string>(asset, 'station');

    if (areaName !== undefined) {
      params.set('area', areaName);
    }
    if (lineCode !== undefined) {
      params.set('line', lineCode);
    }
    if (station !== undefined) {
      params.set('station', station);
    }

    const queryString = params.toString();
    const path = queryString.length > 0 ? `/dashboard?${queryString}` : '/dashboard';
    navigate(path);

    setSelectedAsset(null);
  }, [navigate]);

  // Summary strip filter click handler
  const handleSummaryFilterClick = useCallback(
    (filter: { sourcing?: EquipmentSourcing; reuseStatus?: ReuseAllocationStatus }) => {
      if (filter.sourcing !== undefined) {
        setSourcingFilter(filter.sourcing);
      }
      if (filter.reuseStatus !== undefined) {
        setReuseStatusFilter(filter.reuseStatus);
      }
    },
    [setSourcingFilter, setReuseStatusFilter]
  );

  // Table columns
  const columns = useMemo(
    () => createAssetsTableColumns(handleSort, assetBottleneckMap),
    [handleSort, assetBottleneckMap]
  );

  // Empty state
  if (allAssets.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Assets" subtitle="View all robots, guns, and tools across projects" />
        <EmptyState
          title="No Assets Found"
          message="Please go to the Data Loader to import your equipment lists."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
        />
      </div>
    );
  }

  const showActiveFilters = hasActiveFilters || onlyBottleneckAssets;

  const handleClearAllFilters = useCallback(() => {
    clearFilters();
    setOnlyBottleneckAssets(false);
  }, [clearFilters]);

  // Apply deep-link filters coming from Simulation/Station views
  useEffect(() => {
    const stationParam = searchParams.get('station');
    const lineParam = searchParams.get('line');
    const programParam = searchParams.get('program');
    const areaParam = searchParams.get('area');

    const linkKey = [stationParam, lineParam, programParam, areaParam].filter(Boolean).join('|');
    if (!linkKey) {
      return;
    }
    if (appliedLinkKeyRef.current === linkKey) {
      return;
    }

    if (stationParam) {
      setStationFilter(stationParam);
      setSearchTerm(stationParam);
    }
    if (lineParam) {
      setLineFilter(lineParam);
    }
    if (programParam) {
      setProgramFilter(programParam);
    }
    if (areaParam) {
      setAreaFilter(areaParam);
    }
    setOnlyBottleneckAssets(false);
    setLinkedContextLabel(
      ['Station', stationParam, lineParam ? `Line ${lineParam}` : null, programParam]
        .filter(Boolean)
        .join(' · ')
    );
    appliedLinkKeyRef.current = linkKey;
  }, [
    searchParams,
    setStationFilter,
    setSearchTerm,
    setLineFilter,
    setProgramFilter,
    setAreaFilter,
  ]);

  const handleClearLinkedContext = () => {
    setLinkedContextLabel(null);
    setSearchParams(new URLSearchParams());
    handleClearAllFilters();
  };

  return (
    <div className="space-y-6" data-testid="assets-page">
      <PageHeader
        title="Assets"
        subtitle={`${displayCounts.total} of ${allAssets.length} assets${
          showActiveFilters ? ' (filtered)' : ''
        }`}
      />

      {linkedContextLabel && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
          <div className="text-sm text-blue-900 dark:text-blue-100">
            Linked from Simulation: {linkedContextLabel}
          </div>
          <button
            onClick={handleClearLinkedContext}
            className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
          >
            Clear link
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
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Filter className="w-4 h-4" />
          <span>
            Showing {displayCounts.total} of {allAssets.length} assets
          </span>
          <button
            onClick={handleClearAllFilters}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 items-start min-w-0">
        {/* Assets Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden min-w-0">
          <div className="overflow-x-auto custom-scrollbar">
            <DataTable
              data={sortedAssets}
              columns={columns}
              onRowClick={handleRowClick}
              emptyMessage="No assets match the current filters."
              maxHeight={520}
            />
          </div>
        </div>
      </div>

      <AssetDetailPanel
        asset={selectedAsset}
        isOpen={selectedAsset !== null}
        onClose={handleCloseDetail}
        onOpenInSimulation={handleOpenInSimulation}
      />
    </div>
  );
}
