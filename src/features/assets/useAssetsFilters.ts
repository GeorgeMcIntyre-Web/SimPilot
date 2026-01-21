/**
 * Assets Filter Hook
 *
 * Centralized filter state management for the Assets page.
 * Supports filtering by SimulationContext, asset kind, sourcing, and reuse allocation status.
 *
 * Follows coding style:
 * - Guard clauses
 * - No else/elseif
 * - Max nesting depth 2
 * - No any types
 */

import { useState, useMemo, useCallback } from 'react';
import { EquipmentSourcing, UnifiedAsset } from '../../domain/UnifiedModel';
import type { ReuseAllocationStatus, DetailedAssetKind } from '../../ingestion/excelIngestionTypes';

// ============================================================================
// FILTER TYPES
// ============================================================================

export type AssetsFilterState = {
  // SimulationContext hierarchy filters
  program: string | null;
  plant: string | null;
  unit: string | null;
  area: string | null;
  line: string | null;
  station: string | null;

  // Asset classification filters
  assetKind: 'ALL' | 'ROBOT' | 'GUN' | 'TOOL' | 'OTHER';
  detailedKind: DetailedAssetKind | 'ALL';

  // Sourcing and reuse filters
  sourcing: EquipmentSourcing | 'ALL';
  reuseStatus: ReuseAllocationStatus | 'ALL';

  // Search
  searchTerm: string;
};

export type AssetWithMetadata = UnifiedAsset & {
  // Extended fields that may be present in metadata
  detailedKind?: DetailedAssetKind;
  reuseAllocationStatus?: ReuseAllocationStatus;
  projectCode?: string;
  assemblyLine?: string;
  station?: string;
  robotNumber?: string;
  gunId?: string;
  oldProject?: string;
  oldLine?: string;
  oldStation?: string;
  targetProject?: string;
  targetLine?: string;
  targetStation?: string;
  sourceWorkbookIds?: string[];
};

export type FilterCounts = {
  total: number;
  byKind: Record<string, number>;
  bySourcing: Record<EquipmentSourcing | 'UNKNOWN', number>;
  byReuseStatus: Record<ReuseAllocationStatus, number>;
  unknownSourcingCount: number;
};

// ============================================================================
// INITIAL STATE
// ============================================================================

const INITIAL_FILTER_STATE: AssetsFilterState = {
  program: null,
  plant: null,
  unit: null,
  area: null,
  line: null,
  station: null,
  assetKind: 'ALL',
  detailedKind: 'ALL',
  sourcing: 'ALL',
  reuseStatus: 'ALL',
  searchTerm: '',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractMetadataField<T>(asset: UnifiedAsset, key: string): T | undefined {
  const value = asset.metadata?.[key];
  if (value === null || value === undefined) {
    return undefined;
  }
  return value as T;
}

function normalizeForSearch(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return value.toLowerCase().trim();
}

function matchesSearchTerm(asset: AssetWithMetadata, term: string): boolean {
  if (term.length === 0) {
    return true;
  }

  const searchLower = term.toLowerCase();

  // Check id (for deep links)
  if (asset.id.toLowerCase().includes(searchLower)) {
    return true;
  }

  // Check name
  if (normalizeForSearch(asset.name).includes(searchLower)) {
    return true;
  }

  // Check station
  if (normalizeForSearch(asset.stationNumber).includes(searchLower)) {
    return true;
  }

  // Check area
  if (normalizeForSearch(asset.areaName).includes(searchLower)) {
    return true;
  }

  // Check model
  if (normalizeForSearch(asset.oemModel).includes(searchLower)) {
    return true;
  }

  // Check line from metadata
  const lineCode = extractMetadataField<string>(asset, 'lineCode');
  if (lineCode !== undefined && normalizeForSearch(lineCode).includes(searchLower)) {
    return true;
  }

  // Check robot number
  const robotNumber =
    extractMetadataField<string>(asset, 'robotNumber') ||
    extractMetadataField<string>(asset, 'Robo No. New') ||
    extractMetadataField<string>(asset, 'ROBO NO. NEW');
  if (robotNumber !== undefined && normalizeForSearch(robotNumber).includes(searchLower)) {
    return true;
  }

  // Check project code
  const projectCode = extractMetadataField<string>(asset, 'projectCode');
  if (projectCode !== undefined && normalizeForSearch(projectCode).includes(searchLower)) {
    return true;
  }

  return false;
}

function matchesKindFilter(asset: AssetWithMetadata, filter: AssetsFilterState): boolean {
  if (filter.assetKind === 'ALL') {
    return true;
  }
  return asset.kind === filter.assetKind;
}

function matchesDetailedKindFilter(asset: AssetWithMetadata, filter: AssetsFilterState): boolean {
  if (filter.detailedKind === 'ALL') {
    return true;
  }
  const detailedKind = extractMetadataField<string>(asset, 'detailedKind');
  if (detailedKind === undefined) {
    return false;
  }
  return detailedKind === filter.detailedKind;
}

function matchesSourcingFilter(asset: AssetWithMetadata, filter: AssetsFilterState): boolean {
  if (filter.sourcing === 'ALL') {
    return true;
  }
  return asset.sourcing === filter.sourcing;
}

function matchesReuseStatusFilter(asset: AssetWithMetadata, filter: AssetsFilterState): boolean {
  if (filter.reuseStatus === 'ALL') {
    return true;
  }

  // Only REUSE assets have a reuse allocation status
  if (asset.sourcing !== 'REUSE') {
    return false;
  }

  const reuseStatus = extractMetadataField<ReuseAllocationStatus>(asset, 'reuseAllocationStatus');
  if (reuseStatus === undefined) {
    return filter.reuseStatus === 'UNKNOWN';
  }
  return reuseStatus === filter.reuseStatus;
}

function matchesHierarchyFilter(asset: AssetWithMetadata, filter: AssetsFilterState): boolean {
  // Area filter
  if (filter.area !== null) {
    const assetArea = asset.areaName ?? extractMetadataField<string>(asset, 'areaName');
    if (assetArea === undefined || assetArea !== filter.area) {
      return false;
    }
  }

  // Line filter
  if (filter.line !== null) {
    const assetLine = extractMetadataField<string>(asset, 'lineCode') ?? extractMetadataField<string>(asset, 'assemblyLine');
    if (assetLine === undefined || assetLine !== filter.line) {
      return false;
    }
  }

  // Station filter
  if (filter.station !== null) {
    const assetStation = asset.stationNumber ?? extractMetadataField<string>(asset, 'station');
    if (assetStation === undefined || assetStation !== filter.station) {
      return false;
    }
  }

  // Program filter
  if (filter.program !== null) {
    const projectCode = extractMetadataField<string>(asset, 'projectCode');
    if (projectCode === undefined || projectCode !== filter.program) {
      return false;
    }
  }

  return true;
}

function applyFilters(assets: AssetWithMetadata[], filter: AssetsFilterState): AssetWithMetadata[] {
  return assets.filter(asset => {
    if (!matchesSearchTerm(asset, filter.searchTerm)) {
      return false;
    }

    if (!matchesKindFilter(asset, filter)) {
      return false;
    }

    if (!matchesDetailedKindFilter(asset, filter)) {
      return false;
    }

    if (!matchesSourcingFilter(asset, filter)) {
      return false;
    }

    if (!matchesReuseStatusFilter(asset, filter)) {
      return false;
    }

    if (!matchesHierarchyFilter(asset, filter)) {
      return false;
    }

    return true;
  });
}

function calculateCounts(assets: AssetWithMetadata[]): FilterCounts {
  const byKind: Record<string, number> = {
    ROBOT: 0,
    GUN: 0,
    TOOL: 0,
    OTHER: 0,
  };

  const bySourcing: Record<EquipmentSourcing | 'UNKNOWN', number> = {
    NEW_BUY: 0,
    REUSE: 0,
    MAKE: 0,
    UNKNOWN: 0,
  };

  const byReuseStatus: Record<ReuseAllocationStatus, number> = {
    AVAILABLE: 0,
    ALLOCATED: 0,
    IN_USE: 0,
    RESERVED: 0,
    UNKNOWN: 0,
  };

  for (const asset of assets) {
    // Count by kind
    byKind[asset.kind] = (byKind[asset.kind] ?? 0) + 1;

    // Count by sourcing
    const sourcing = asset.sourcing ?? 'UNKNOWN';
    bySourcing[sourcing] = (bySourcing[sourcing] ?? 0) + 1;

    // Count reuse status (only for REUSE assets)
    if (asset.sourcing === 'REUSE') {
      const reuseStatus = extractMetadataField<ReuseAllocationStatus>(asset, 'reuseAllocationStatus') ?? 'UNKNOWN';
      byReuseStatus[reuseStatus] = (byReuseStatus[reuseStatus] ?? 0) + 1;
    }
  }

  return {
    total: assets.length,
    byKind,
    bySourcing,
    byReuseStatus,
    unknownSourcingCount: bySourcing.UNKNOWN,
  };
}

// ============================================================================
// HOOK
// ============================================================================

export type UseAssetsFiltersReturn = {
  // Current filter state
  filters: AssetsFilterState;

  // Filtered assets
  filteredAssets: AssetWithMetadata[];

  // Counts for summary strip
  counts: FilterCounts;

  // Available filter options (derived from assets)
  availableAreas: string[];
  availableLines: string[];
  availablePrograms: string[];

  // Filter actions
  setSearchTerm: (term: string) => void;
  setKindFilter: (kind: AssetsFilterState['assetKind']) => void;
  setDetailedKindFilter: (kind: AssetsFilterState['detailedKind']) => void;
  setSourcingFilter: (sourcing: AssetsFilterState['sourcing']) => void;
  setReuseStatusFilter: (status: AssetsFilterState['reuseStatus']) => void;
  setAreaFilter: (area: string | null) => void;
  setLineFilter: (line: string | null) => void;
  setStationFilter: (station: string | null) => void;
  setProgramFilter: (program: string | null) => void;
  clearFilters: () => void;

  // Check if any filters are active
  hasActiveFilters: boolean;
};

export function useAssetsFilters(allAssets: UnifiedAsset[]): UseAssetsFiltersReturn {
  const [filters, setFilters] = useState<AssetsFilterState>(INITIAL_FILTER_STATE);

  // Cast assets to include extended metadata
  const assetsWithMetadata: AssetWithMetadata[] = allAssets;

  // Apply filters
  const filteredAssets = useMemo(
    () => applyFilters(assetsWithMetadata, filters),
    [assetsWithMetadata, filters]
  );

  // Calculate counts from filtered assets
  const counts = useMemo(() => calculateCounts(filteredAssets), [filteredAssets]);

  // Extract unique values for filter dropdowns
  const availableAreas = useMemo(() => {
    const areas = new Set<string>();
    for (const asset of assetsWithMetadata) {
      const areaName = asset.areaName ?? extractMetadataField<string>(asset, 'areaName');
      if (areaName !== undefined && areaName.length > 0) {
        areas.add(areaName);
      }
    }
    return Array.from(areas).sort();
  }, [assetsWithMetadata]);

  const availableLines = useMemo(() => {
    const lines = new Set<string>();
    for (const asset of assetsWithMetadata) {
      const lineCode = extractMetadataField<string>(asset, 'lineCode') ?? extractMetadataField<string>(asset, 'assemblyLine');
      if (lineCode !== undefined && lineCode.length > 0) {
        lines.add(lineCode);
      }
    }
    return Array.from(lines).sort();
  }, [assetsWithMetadata]);

  const availablePrograms = useMemo(() => {
    const programs = new Set<string>();
    for (const asset of assetsWithMetadata) {
      const projectCode = extractMetadataField<string>(asset, 'projectCode');
      if (projectCode !== undefined && projectCode.length > 0) {
        programs.add(projectCode);
      }
    }
    return Array.from(programs).sort();
  }, [assetsWithMetadata]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm.length > 0 ||
      filters.assetKind !== 'ALL' ||
      filters.detailedKind !== 'ALL' ||
      filters.sourcing !== 'ALL' ||
      filters.reuseStatus !== 'ALL' ||
      filters.area !== null ||
      filters.line !== null ||
      filters.station !== null ||
      filters.program !== null
    );
  }, [filters]);

  // Filter action handlers
  const setSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const setKindFilter = useCallback((kind: AssetsFilterState['assetKind']) => {
    setFilters(prev => ({ ...prev, assetKind: kind }));
  }, []);

  const setDetailedKindFilter = useCallback((kind: AssetsFilterState['detailedKind']) => {
    setFilters(prev => ({ ...prev, detailedKind: kind }));
  }, []);

  const setSourcingFilter = useCallback((sourcing: AssetsFilterState['sourcing']) => {
    setFilters(prev => ({ ...prev, sourcing }));
  }, []);

  const setReuseStatusFilter = useCallback((status: AssetsFilterState['reuseStatus']) => {
    setFilters(prev => ({ ...prev, reuseStatus: status }));
  }, []);

  const setAreaFilter = useCallback((area: string | null) => {
    setFilters(prev => ({ ...prev, area }));
  }, []);

  const setLineFilter = useCallback((line: string | null) => {
    setFilters(prev => ({ ...prev, line }));
  }, []);

  const setStationFilter = useCallback((station: string | null) => {
    setFilters(prev => ({ ...prev, station }));
  }, []);

  const setProgramFilter = useCallback((program: string | null) => {
    setFilters(prev => ({ ...prev, program }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE);
  }, []);

  return {
    filters,
    filteredAssets,
    counts,
    availableAreas,
    availableLines,
    availablePrograms,
    setSearchTerm,
    setKindFilter,
    setDetailedKindFilter,
    setSourcingFilter,
    setReuseStatusFilter,
    setAreaFilter,
    setLineFilter,
    setStationFilter,
    setProgramFilter,
    clearFilters,
    hasActiveFilters,
  };
}

export function summarizeAssetsForCounts(assets: AssetWithMetadata[]): FilterCounts {
  return calculateCounts(assets);
}
