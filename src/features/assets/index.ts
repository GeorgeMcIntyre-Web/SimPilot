/**
 * Assets Feature Module
 * 
 * Exports all assets-related components and hooks for the Assets Tab.
 */

export { useAssetsFilters, type UseAssetsFiltersReturn, type AssetsFilterState, type AssetWithMetadata, type FilterCounts } from './useAssetsFilters';
export { SourcingBadge, ReuseStatusBadge, AssetKindBadge, getSourcingInfo, getReuseStatusInfo } from './AssetBadges';
export { AssetDetailPanel } from './AssetDetailPanel';
