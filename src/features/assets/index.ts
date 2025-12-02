/**
 * Assets Feature Module
 * 
 * Exports all assets-related components and hooks for the Assets Tab.
 */

export {
  useAssetsFilters,
  summarizeAssetsForCounts,
  type UseAssetsFiltersReturn,
  type AssetsFilterState,
  type AssetWithMetadata,
  type FilterCounts,
} from './useAssetsFilters';
export { SourcingBadge, ReuseStatusBadge, AssetKindBadge, BottleneckBadge, getSourcingInfo, getReuseStatusInfo } from './AssetBadges';
export { AssetDetailPanel } from './AssetDetailPanel';
