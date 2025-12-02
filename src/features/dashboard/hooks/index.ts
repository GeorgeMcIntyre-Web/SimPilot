// Dashboard Hooks
// Consolidated hooks for dashboard data access

export {
  useBottleneckOverview,
  useWorkflowBottleneckStats,
  deriveSeverityFromReason
} from './useBottleneckOverview'
export type {
  BottleneckOverviewResult,
  BottleneckSummary,
  UseBottleneckOverviewOptions
} from './useBottleneckOverview'
