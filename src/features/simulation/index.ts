// Simulation Feature Module
// Barrel exports for the simulation feature

// Store and hooks
export {
  simulationStore,
  useSimulationStore,
  useAllStations,
  useSimulationLoading,
  useSimulationErrors,
  usePrograms,
  usePlants,
  useUnits,
  useLines,
  useFilteredStations,
  useStationByKey,
  useHierarchyTree,
  generateContextKey,
  parseContextKey,
} from './simulationStore'

export type {
  SimulationContext,
  StationContext,
  SimulationStatusInfo,
  AssetCounts,
  SourcingCounts,
  HierarchyNode,
  SimulationStoreState,
} from './simulationStore'

// Selectors
export {
  useStationsWithUnknownSourcing,
  useStationsExpectingReuse,
  useStationsLowCompletion,
  useStationsNeedingAttention,
  useAllStationsSummary,
  useFilteredStationsSummary,
  useSearchedStations,
  useSimulationBoardStations,
  useLineAggregations,
  getCompletionTier,
  getCompletionTextClass,
  getCompletionBadgeClass,
  getCompletionBarClass,
  COMPLETION_HIGH,
  COMPLETION_MID,
  COMPLETION_LOW,
} from './simulationSelectors'

export type {
  StationAttentionItem,
  StationsSummary,
  SimulationFilters,
  LineAggregation,
  CompletionTier,
} from './simulationSelectors'

// Adapter
export {
  useSimulationSync,
  transformToStationContexts,
  syncSimulationStore,
} from './simulationAdapter'

// Components
export { SimulationFiltersBar } from './components/SimulationFiltersBar'
export { SimulationBoardGrid } from './components/SimulationBoardGrid'
export { StationCard } from './components/StationCard'
export { SimulationTodayPanel as DaleTodayPanel } from './components/SimulationTodayPanel'
export { SimulationDetailDrawer } from './components/SimulationDetailDrawer'
export { SimulationDetailPanel } from './components/SimulationDetailPanel'
export { SummaryStats } from './components/SummaryStats'

// Component types
export type { SortOption } from './components/SimulationFiltersBar'
