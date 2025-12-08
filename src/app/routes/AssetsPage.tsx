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

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../ui/components/PageHeader';
import { DataTable, Column } from '../../ui/components/DataTable';
import { SummaryCard, SummaryCardsGrid } from '../../ui/components/SummaryCard';
import { FlowerEmptyState } from '../../ui/components/FlowerEmptyState';
import { cn } from '../../ui/lib/utils';
import { useCoreStore } from '../../domain/coreStore';
import {
  useAssetsFilters,
  type AssetWithMetadata,
  summarizeAssetsForCounts,
} from '../../features/assets';
import {
  SourcingBadge,
  ReuseStatusBadge,
  AssetKindBadge,
  BottleneckBadge,
} from '../../features/assets/AssetBadges';
import { AssetDetailPanel } from '../../features/assets/AssetDetailPanel';
import type { ReuseAllocationStatus, DetailedAssetKind } from '../../ingestion/excelIngestionTypes';
import type { EquipmentSourcing } from '../../domain/UnifiedModel';
// TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
// import { useToolingBottleneckState } from '../../domain/toolingBottleneckStore';
// import {
//   selectBottleneckStageForAsset,
//   type SimPilotSelectorState,
//   type AssetBottleneckSummary,
// } from '../../domain/simPilotSelectors';
import {
  Search,
  X,
  Package,
  ShoppingCart,
  Recycle,
  Hammer,
  HelpCircle,
  CheckCircle,
  Clock,
  Lock,
  Filter,
  ArrowUpDown,
  AlertTriangle,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type SortKey = 'name' | 'kind' | 'station' | 'area' | 'sourcing';
type SortDirection = 'asc' | 'desc';

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
// FILTER BAR COMPONENT
// ============================================================================

type FilterBarProps = {
  filters: ReturnType<typeof useAssetsFilters>['filters'];
  availableAreas: string[];
  availableLines: string[];
  availablePrograms: string[];
  hasActiveFilters: boolean;
  onlyBottlenecks: boolean;
  onSearchChange: (term: string) => void;
  onKindChange: (kind: 'ALL' | 'ROBOT' | 'GUN' | 'TOOL' | 'OTHER') => void;
  onSourcingChange: (sourcing: EquipmentSourcing | 'ALL') => void;
  onReuseStatusChange: (status: ReuseAllocationStatus | 'ALL') => void;
  onAreaChange: (area: string | null) => void;
  onLineChange: (line: string | null) => void;
  onProgramChange: (program: string | null) => void;
  onOnlyBottlenecksChange: (isActive: boolean) => void;
  onClearFilters: () => void;
};

function FilterBar({
  filters,
  availableAreas,
  availableLines,
  availablePrograms,
  hasActiveFilters,
  onlyBottlenecks,
  onSearchChange,
  onKindChange,
  onSourcingChange,
  onReuseStatusChange,
  onAreaChange,
  onLineChange,
  onProgramChange,
  onOnlyBottlenecksChange,
  onClearFilters,
}: FilterBarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 space-y-2">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <Search className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <input
          type="text"
          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-7 py-1 text-xs border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Search by name, station, area, model..."
          value={filters.searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {filters.searchTerm.length > 0 && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Left Column: Asset Filters */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            {/* Asset Type */}
            <div>
              <label htmlFor="asset-type-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                Type
              </label>
              <select
                id="asset-type-filter"
                data-testid="asset-type-filter"
                value={filters.assetKind}
                onChange={(e) => onKindChange(e.target.value as 'ALL' | 'ROBOT' | 'GUN' | 'TOOL' | 'OTHER')}
                className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value="ALL">All Types</option>
                <option value="ROBOT">Robots</option>
                <option value="GUN">Guns</option>
                <option value="TOOL">Tools</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Sourcing */}
            <div>
              <label htmlFor="sourcing-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                Sourcing
              </label>
              <select
                id="sourcing-filter"
                data-testid="sourcing-filter"
                value={filters.sourcing}
                onChange={(e) => onSourcingChange(e.target.value as EquipmentSourcing | 'ALL')}
                className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value="ALL">All Sourcing</option>
                <option value="NEW_BUY">New Buy</option>
                <option value="REUSE">Reuse</option>
                <option value="MAKE">Make</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>

            {/* Reuse Status */}
            <div className="col-span-2">
              <label htmlFor="reuse-status-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                Reuse Status
              </label>
              <select
                id="reuse-status-filter"
                data-testid="reuse-status-filter"
                value={filters.reuseStatus}
                onChange={(e) => onReuseStatusChange(e.target.value as ReuseAllocationStatus | 'ALL')}
                className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ALLOCATED">Allocated</option>
                <option value="IN_USE">In Use</option>
                <option value="RESERVED">Reserved</option>
                <option value="UNKNOWN">Unknown</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Location Filters */}
        <div className="space-y-1.5">
          <div className="space-y-1.5">
            {/* Program/Project Filter */}
            {availablePrograms.length > 0 && (
              <div>
                <label htmlFor="program-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                  Program / Project
                </label>
                <select
                  id="program-filter"
                  data-testid="program-filter"
                  value={filters.program ?? ''}
                  onChange={(e) => onProgramChange(e.target.value === '' ? null : e.target.value)}
                  className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="">All Programs</option>
                  {availablePrograms.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Area Filter */}
            {availableAreas.length > 0 && (
              <div>
                <label htmlFor="area-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
                  Area
                </label>
                <select
                  id="area-filter"
                  data-testid="area-filter"
                  value={filters.area ?? ''}
                  onChange={(e) => onAreaChange(e.target.value === '' ? null : e.target.value)}
                  className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="">All Areas</option>
                  {availableAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Line Filter */}
            {availableLines.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <label htmlFor="line-filter" className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                    Line
                  </label>
                  <button
                    type="button"
                    onClick={() => onOnlyBottlenecksChange(!onlyBottlenecks)}
                    aria-pressed={onlyBottlenecks}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors',
                      'text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400'
                    )}
                    data-testid="bottleneck-only-filter"
                    title="Toggle to show only bottleneck tools"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Only bottlenecks</span>
                    <span
                      className={cn(
                        'relative inline-flex h-4 w-8 items-center rounded-full border border-gray-300 dark:border-gray-600 transition-colors',
                        onlyBottlenecks ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    >
                      <span
                        className={cn(
                          'h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform',
                          onlyBottlenecks ? 'translate-x-3.5' : 'translate-x-0.5'
                        )}
                      />
                    </span>
                  </button>
                </div>
                <select
                  id="line-filter"
                  data-testid="line-filter"
                  value={filters.line ?? ''}
                  onChange={(e) => onLineChange(e.target.value === '' ? null : e.target.value)}
                  className="block w-full py-1 px-2 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs"
                >
                  <option value="">All Lines</option>
                  {availableLines.map((line) => (
                    <option key={line} value={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="pt-1.5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClearFilters}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUMMARY STRIP COMPONENT
// ============================================================================

type SummaryStripProps = {
  counts: ReturnType<typeof useAssetsFilters>['counts'];
  onFilterClick: (filter: { sourcing?: EquipmentSourcing; reuseStatus?: ReuseAllocationStatus }) => void;
};

function SummaryStrip({ counts, onFilterClick }: SummaryStripProps) {
  const reuseCount = counts.bySourcing.REUSE ?? 0;

  return (
    <div className="space-y-2">
      {/* Total and Sourcing Counts */}
      <SummaryCardsGrid columns={5} className="gap-3">
        <SummaryCard
          title="Total Filtered"
          value={counts.total}
          icon={<Package className="w-4 h-4" />}
          variant="default"
          density="compact"
          data-testid="assets-total-count"
        />
        <SummaryCard
          title="New Buy"
          value={counts.bySourcing.NEW_BUY ?? 0}
          icon={<ShoppingCart className="w-4 h-4" />}
          variant="info"
          density="compact"
          onClick={() => onFilterClick({ sourcing: 'NEW_BUY' })}
        />
        <SummaryCard
          title="Reuse"
          value={reuseCount}
          icon={<Recycle className="w-4 h-4" />}
          variant="success"
          density="compact"
          onClick={() => onFilterClick({ sourcing: 'REUSE' })}
        />
        <SummaryCard
          title="Make"
          value={counts.bySourcing.MAKE ?? 0}
          icon={<Hammer className="w-4 h-4" />}
          variant="default"
          density="compact"
          onClick={() => onFilterClick({ sourcing: 'MAKE' })}
        />
        <SummaryCard
          title="Unknown Sourcing"
          value={counts.unknownSourcingCount}
          icon={<HelpCircle className="w-4 h-4" title={counts.unknownSourcingCount > 0 ? 'Needs attention' : undefined} />}
          variant={counts.unknownSourcingCount > 0 ? 'warning' : 'default'}
          density="compact"
          onClick={() => onFilterClick({ sourcing: 'UNKNOWN' })}
          data-testid="assets-unknown-sourcing"
        />
      </SummaryCardsGrid>

      {/* Reuse Allocation Status (only show if there are reuse assets) */}
      {reuseCount > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reuse Equipment Allocation
          </h3>
          <SummaryCardsGrid columns={4} className="gap-3">
            <SummaryCard
              title="Available"
              value={counts.byReuseStatus.AVAILABLE ?? 0}
              subtitle="Ready to allocate"
              icon={<Package className="w-4 h-4" />}
              variant="success"
              density="compact"
              onClick={() => onFilterClick({ sourcing: 'REUSE', reuseStatus: 'AVAILABLE' })}
            />
            <SummaryCard
              title="Allocated"
              value={counts.byReuseStatus.ALLOCATED ?? 0}
              subtitle="Planned for new line"
              icon={<Clock className="w-4 h-4" />}
              variant="info"
              density="compact"
              onClick={() => onFilterClick({ sourcing: 'REUSE', reuseStatus: 'ALLOCATED' })}
            />
            <SummaryCard
              title="In Use"
              value={counts.byReuseStatus.IN_USE ?? 0}
              subtitle="Installed on new line"
              icon={<CheckCircle className="w-4 h-4" />}
              variant="success"
              density="compact"
              onClick={() => onFilterClick({ sourcing: 'REUSE', reuseStatus: 'IN_USE' })}
            />
            <SummaryCard
              title="Reserved"
              value={counts.byReuseStatus.RESERVED ?? 0}
              subtitle="Reserved for project"
              icon={<Lock className="w-4 h-4" />}
              variant="warning"
              density="compact"
              onClick={() => onFilterClick({ sourcing: 'REUSE', reuseStatus: 'RESERVED' })}
            />
          </SummaryCardsGrid>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AssetsPage() {
  const navigate = useNavigate();
  const state = useCoreStore();
  const allAssets = state.assets;
  // TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
  // const toolingState = useToolingBottleneckState();

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
    setProgramFilter,
    clearFilters,
  } = useAssetsFilters(allAssets);

  const [onlyBottleneckAssets, setOnlyBottleneckAssets] = useState(false);

  // TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
  // const selectorState: SimPilotSelectorState = useMemo(
  //   () => ({
  //     toolingBottlenecks: toolingState,
  //     assets: allAssets,
  //   }),
  //   [toolingState, allAssets]
  // );

  // const assetBottleneckMap = useMemo(() => {
  //   const map = new Map<string, AssetBottleneckSummary>();
  //   if (selectorState.toolingBottlenecks.statuses.length === 0) {
  //     return map;
  //   }
  //   for (const asset of allAssets) {
  //     const summary = selectBottleneckStageForAsset(selectorState, asset.id);
  //     if (summary === null) continue;
  //     map.set(asset.id, summary);
  //   }
  //   return map;
  // }, [selectorState, allAssets]);
  const assetBottleneckMap = new Map(); // Placeholder until bottleneck integration is re-enabled

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Detail panel state
  const [selectedAsset, setSelectedAsset] = useState<AssetWithMetadata | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Sort handler
  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir('asc');
  }, [sortKey]);

  const filteredByBottleneck = useMemo(() => {
    if (!onlyBottleneckAssets) {
      return filteredAssets;
    }
    return filteredAssets.filter((asset) => assetBottleneckMap.has(asset.id));
  }, [filteredAssets, onlyBottleneckAssets, assetBottleneckMap]);

  const displayCounts = useMemo(
    () => summarizeAssetsForCounts(filteredByBottleneck),
    [filteredByBottleneck]
  );

  // Sort assets
  const sortedAssets = useMemo(() => {
    return [...filteredByBottleneck].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      switch (sortKey) {
        case 'name':
          valA = a.name ?? '';
          valB = b.name ?? '';
          break;
        case 'kind':
          valA = a.kind ?? '';
          valB = b.kind ?? '';
          break;
        case 'station':
          valA = a.stationNumber ?? '';
          valB = b.stationNumber ?? '';
          break;
        case 'area':
          valA = a.areaName ?? '';
          valB = b.areaName ?? '';
          break;
        case 'sourcing':
          valA = a.sourcing ?? '';
          valB = b.sourcing ?? '';
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredByBottleneck, sortKey, sortDir]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, onlyBottleneckAssets]);

  // Pagination calculations
  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssets = sortedAssets.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Row click handler
  const handleRowClick = useCallback((asset: AssetWithMetadata) => {
    setSelectedAsset(asset);
    setIsDetailOpen(true);
  }, []);

  // Close detail panel
  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
  }, []);

  // Open in Simulation Status
  const handleOpenInSimulation = useCallback((asset: AssetWithMetadata) => {
    // Build query params for simulation navigation
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

    // Navigate to dashboard with filter params (simulation status is shown on dashboard)
    const queryString = params.toString();
    const path = queryString.length > 0 ? `/dashboard?${queryString}` : '/dashboard';
    navigate(path);

    // Close the detail panel
    setIsDetailOpen(false);
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

  // Sortable header component
  const SortHeader = ({ label, keyName }: { label: string; keyName: SortKey }) => (
    <button
      onClick={() => handleSort(keyName)}
      className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
    >
      <span>{label}</span>
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  // Table columns
  const columns: Column<AssetWithMetadata>[] = [
    {
      header: <SortHeader label="Asset" keyName="name" />,
      accessor: (asset) => {
        const detailedKind = extractMetadata<DetailedAssetKind>(asset, 'detailedKind');
        return (
          <div className="flex items-center gap-2">
            <AssetKindBadge kind={asset.kind} detailedKind={detailedKind} showIcon={false} />
            <span className="font-medium text-gray-900 dark:text-white">{asset.name || '—'}</span>
          </div>
        );
      },
    },
    {
      header: <SortHeader label="Kind" keyName="kind" />,
      accessor: (asset) => {
        const detailedKind = extractMetadata<DetailedAssetKind>(asset, 'detailedKind');
        return <AssetKindBadge kind={asset.kind} detailedKind={detailedKind} />;
      },
    },
    {
      header: 'Program',
      accessor: (asset) => {
        const projectCode = extractMetadata<string>(asset, 'projectCode');
        return projectCode ?? '—';
      },
    },
    {
      header: <SortHeader label="Area" keyName="area" />,
      accessor: (asset) => asset.areaName ?? '—',
    },
    {
      header: 'Line',
      accessor: (asset) => {
        const lineCode = extractMetadata<string>(asset, 'lineCode') ?? extractMetadata<string>(asset, 'assemblyLine');
        return lineCode ?? '—';
      },
    },
    {
      header: <SortHeader label="Station" keyName="station" />,
      accessor: (asset) => asset.stationNumber ?? '—',
    },
    {
      header: <SortHeader label="Sourcing" keyName="sourcing" />,
      accessor: (asset) => {
        const bottleneck = assetBottleneckMap.get(asset.id);
        return (
          <div className="flex flex-col gap-1">
            <SourcingBadge sourcing={asset.sourcing} />
            {bottleneck && (
              <BottleneckBadge
                stage={bottleneck.stage}
                reason={bottleneck.reason}
                severity={bottleneck.severity}
              />
            )}
          </div>
        );
      },
    },
    {
      header: 'Reuse Status',
      accessor: (asset) => {
        // Only show for REUSE assets
        if (asset.sourcing !== 'REUSE') {
          return <span className="text-gray-400 text-xs">—</span>;
        }
        const reuseStatus = extractMetadata<ReuseAllocationStatus>(asset, 'reuseAllocationStatus');
        if (reuseStatus === undefined) {
          return <ReuseStatusBadge status="UNKNOWN" />;
        }
        return <ReuseStatusBadge status={reuseStatus} />;
      },
    },
    {
      header: 'Robot #',
      accessor: (asset) => {
        const robotNumber = extractMetadata<string>(asset, 'robotNumber');
        const gunId = extractMetadata<string>(asset, 'gunId');
        if (robotNumber !== undefined) {
          return <span className="font-mono text-sm">{robotNumber}</span>;
        }
        if (gunId !== undefined) {
          return <span className="font-mono text-sm text-gray-500">{gunId}</span>;
        }
        return '—';
      },
    },
  ];

  // Empty state
  if (allAssets.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Assets" subtitle="View all robots, guns, and tools across projects" />
        <FlowerEmptyState
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

  return (
    <div className="space-y-6" data-testid="assets-page">
      <PageHeader
        title="Assets"
        subtitle={`${displayCounts.total} of ${allAssets.length} assets${
          showActiveFilters ? ' (filtered)' : ''
        }`}
      />

      {/* Filter Bar */}
      <FilterBar
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

      {/* Summary Strip */}
      <SummaryStrip counts={displayCounts} onFilterClick={handleSummaryFilterClick} />

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

      {/* Assets Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <DataTable
          data={paginatedAssets}
          columns={columns}
          onRowClick={handleRowClick}
          emptyMessage="No assets match the current filters."
        />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              {/* Results info */}
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Showing {startIndex + 1}-{Math.min(endIndex, sortedAssets.length)} of {sortedAssets.length} results
              </div>

              {/* Page controls */}
              <div className="flex items-center gap-2">
                {/* Previous button */}
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    if (!showPage) {
                      // Show ellipsis
                      if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="px-2 text-xs text-gray-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`min-w-[2rem] px-2.5 py-1.5 text-xs font-medium rounded transition-colors ${
                          page === currentPage
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                {/* Next button */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <AssetDetailPanel
        asset={selectedAsset}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onOpenInSimulation={handleOpenInSimulation}
      />
    </div>
  );
}
