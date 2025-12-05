// Simulation Detail Drawer
// Side panel showing full station context and related assets
// Provides action to view assets in Assets tab

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  ChevronRight,
  Bot,
  Zap,
  Wrench,
  Box,
  ExternalLink,
  RefreshCw,
  ShoppingCart,
  HelpCircle,
  FileSpreadsheet,
  User,
  Layers,
  AlertTriangle,
  BarChart3,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import type { StationContext } from '../simulationStore'

// ============================================================================
// TAB TYPES
// ============================================================================

type TabView = 'overview' | 'assets' | 'simulation'
// TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
// import {
//   useToolingBottleneckState,
//   type ToolingWorkflowStatus
// } from '../../../domain/toolingBottleneckStore'
// import { selectBottlenecksByStationKey } from '../../../domain/simPilotSelectors'
// import { getBottleneckReasonLabel } from '../../../domain/toolingBottleneckLabels'

// ============================================================================
// TYPES
// ============================================================================

interface SimulationDetailDrawerProps {
  station: StationContext | null
  isOpen: boolean
  onClose: () => void
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

interface MetricRowProps {
  label: string
  value: number | undefined | null
  threshold?: number
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center gap-2 py-3 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-4 px-4 rounded-lg transition-colors">
        <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
        <span className="text-gray-500">{icon}</span>
        <span className="font-medium text-gray-900 dark:text-white">{title}</span>
      </summary>
      <div className="pl-6 pb-4">
        {children}
      </div>
    </details>
  )
}

function MetricRow({ label, value, threshold = 80 }: MetricRowProps) {
  if (value === undefined || value === null) {
    return (
      <div className="flex items-center justify-between py-1.5">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm text-gray-400">—</span>
      </div>
    )
  }

  const isGood = value >= threshold

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              isGood ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={cn(
          'text-sm font-medium min-w-[3rem] text-right',
          isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
        )}>
          {value}%
        </span>
      </div>
    </div>
  )
}

interface AssetCountRowProps {
  icon: React.ReactNode
  label: string
  count: number
  color: string
}

function AssetCountRow({ icon, label, count, color }: AssetCountRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <span className={color}>{icon}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <span className="ml-auto font-semibold text-gray-900 dark:text-white">{count}</span>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SimulationDetailDrawer({
  station,
  isOpen,
  onClose
}: SimulationDetailDrawerProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabView>('overview')
  const [isToolingDrawerOpen, setIsToolingDrawerOpen] = useState(false)

  if (station === null) return null

  const handleViewAssets = () => {
    // Navigate to assets page with station filter in query params
    const params = new URLSearchParams()
    params.set('station', station.station)
    params.set('line', station.line)
    navigate(`/assets?${params.toString()}`)
    onClose()
  }

  const simStatus = station.simulationStatus
  // TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
  // const toolingBottlenecks = useMemo(
  //   () => selectBottlenecksByStationKey(bottleneckState, station.contextKey),
  //   [bottleneckState, station.contextKey]
  // )
  const toolingBottlenecks: any[] = [] // Placeholder
  const hasToolingBottlenecks = toolingBottlenecks.length > 0

  const handleOpenToolingPage = (toolingNumber: string) => {
    const params = new URLSearchParams()
    params.set('tooling', toolingNumber)
    navigate(`/tooling?${params.toString()}`)
    onClose()
    setIsToolingDrawerOpen(false)
  }

  const handleOpenAssetsForTooling = (toolingNumber: string) => {
    const params = new URLSearchParams()
    params.set('station', station.station)
    params.set('line', station.line)
    params.set('tooling', toolingNumber)
    navigate(`/assets?${params.toString()}`)
    onClose()
    setIsToolingDrawerOpen(false)
  }

  const handleOpenGeneralAssets = () => {
    handleViewAssets()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl z-50',
          'transform transition-transform duration-300 ease-out',
          'overflow-y-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        data-testid="simulation-detail-drawer"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="drawer-title" className="text-2xl font-bold text-gray-900 dark:text-white">
                  {station.station}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <Layers className="h-4 w-4" />
                  <span>{station.line}</span>
                  <span>•</span>
                  <span>{station.unit}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === 'assets'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Package className="h-4 w-4" />
                Assets ({station.assetCounts.total})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2',
                activeTab === 'simulation'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Simulation
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Context Breadcrumb */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-blue-900 dark:text-blue-100">{station.program}</span>
              <ChevronRight className="h-4 w-4 text-blue-400" />
              <span className="font-medium">{station.plant}</span>
              <ChevronRight className="h-4 w-4 text-blue-400" />
              <span>{station.unit}</span>
              <ChevronRight className="h-4 w-4 text-blue-400" />
              <span>{station.line}</span>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Asset Summary Cards */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Asset Summary
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <AssetCountRow
                    icon={<Bot className="h-5 w-5" />}
                    label="Robots"
                    count={station.assetCounts.robots}
                    color="text-purple-500"
                  />
                  <AssetCountRow
                    icon={<Zap className="h-5 w-5" />}
                    label="Guns"
                    count={station.assetCounts.guns}
                    color="text-yellow-500"
                  />
                  <AssetCountRow
                    icon={<Wrench className="h-5 w-5" />}
                    label="Tools"
                    count={station.assetCounts.tools}
                    color="text-blue-500"
                  />
                  <AssetCountRow
                    icon={<Box className="h-5 w-5" />}
                    label="Other"
                    count={station.assetCounts.other}
                    color="text-gray-500"
                  />
                </div>
              </div>

              {/* Sourcing Breakdown */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Sourcing Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3 px-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-lg">
                        <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Reuse / Free Issue</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      {station.sourcingCounts.reuse + station.sourcingCounts.freeIssue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 px-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-lg">
                        <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">New Buy</span>
                    </div>
                    <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {station.sourcingCounts.newBuy}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 px-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
                        <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Unknown</span>
                    </div>
                    <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {station.sourcingCounts.unknown}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Asset List ({station.assets.length})
              </h3>
              {station.assets.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No assets linked to this station</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {station.assets.map((asset, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {asset.kind === 'ROBOT' && <Bot className="h-4 w-4 text-purple-500" />}
                            {asset.kind === 'GUN' && <Zap className="h-4 w-4 text-yellow-500" />}
                            {asset.kind === 'TOOL' && <Wrench className="h-4 w-4 text-blue-500" />}
                            {asset.kind !== 'ROBOT' && asset.kind !== 'GUN' && asset.kind !== 'TOOL' && <Box className="h-4 w-4 text-gray-500" />}
                            <span className="font-medium text-gray-900 dark:text-white text-sm">{asset.name}</span>
                          </div>
                          {asset.oemModel && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">Model: {asset.oemModel}</p>
                          )}
                          {asset.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{asset.description}</p>
                          )}
                        </div>
                        {asset.sourcing && (
                          <span className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            asset.sourcing === 'REUSE' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                            asset.sourcing === 'NEW_BUY' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                            asset.sourcing === 'UNKNOWN' && "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
                          )}>
                            {asset.sourcing}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'simulation' && (
            <div className="space-y-6">
              {simStatus === undefined ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">No Simulation Data</h3>
                  <p className="text-sm">No simulation status data available for this station.</p>
                </div>
              ) : (
                <>
                  {/* Completion Metrics */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Completion Progress
                    </h3>
                    <div className="space-y-4">
                      <MetricRow
                        label="1st Stage Completion"
                        value={simStatus.firstStageCompletion}
                        threshold={80}
                      />
                      <MetricRow
                        label="Final Deliverables"
                        value={simStatus.finalDeliverablesCompletion}
                        threshold={80}
                      />
                    </div>
                  </div>

                  {/* Engineer & Metadata */}
                  <div className="space-y-3">
                    {simStatus.engineer && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Assigned Engineer</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{simStatus.engineer}</p>
                        </div>
                      </div>
                    )}
                    {simStatus.dcsConfigured !== undefined && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        {simStatus.dcsConfigured ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                        )}
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">DCS Configuration</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {simStatus.dcsConfigured ? 'Configured' : 'Not Configured'}
                          </p>
                        </div>
                      </div>
                    )}
                    {simStatus.sourceFile && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source File</p>
                        <p className="text-xs font-mono text-gray-700 dark:text-gray-300">{simStatus.sourceFile}</p>
                        {simStatus.sheetName && (
                          <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mt-1">Sheet: {simStatus.sheetName}</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {hasToolingBottlenecks && (
              <button
                onClick={() => setIsToolingDrawerOpen(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border',
                  'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
                  'bg-amber-50 dark:bg-amber-900/20 font-medium'
                )}
                data-testid="view-tooling-bottlenecks"
              >
                <AlertTriangle className="h-4 w-4" />
                View Tooling Bottlenecks
              </button>
            )}
            <button
              onClick={handleOpenGeneralAssets}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg',
                'bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm',
                'shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40',
                'transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              )}
            >
              <ExternalLink className="h-5 w-5" />
              View All Assets in Assets Tab
            </button>
          </div>
        </div>
      </div>

      {/* TODO(George): Re-enable bottleneck integration after migrating to generic workflow system */}
      {/* <ToolingBottleneckDrawer
        isOpen={isToolingDrawerOpen}
        onClose={() => setIsToolingDrawerOpen(false)}
        statuses={toolingBottlenecks}
        onOpenTooling={handleOpenToolingPage}
        onOpenAssets={handleOpenAssetsForTooling}
      /> */}
    </>
  )
}

// TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
// interface ToolingBottleneckDrawerProps {
//   isOpen: boolean
//   statuses: ToolingWorkflowStatus[]
//   onClose: () => void
//   onOpenTooling: (toolingNumber: string) => void
//   onOpenAssets: (toolingNumber: string) => void
// }

/*
function ToolingBottleneckDrawer({
  isOpen,
  statuses,
  onClose,
  onOpenTooling,
  onOpenAssets
}: ToolingBottleneckDrawerProps) {
  if (!isOpen) return null
  if (statuses.length === 0) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl z-70',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Tooling bottlenecks"
        data-testid="tooling-bottleneck-drawer"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tooling Bottlenecks</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {statuses.length} impacted {statuses.length === 1 ? 'tool' : 'tools'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            aria-label="Close tooling drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto h-full">
          <div className="grid grid-cols-[120px_110px_120px_120px_110px_1fr] gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Tooling #</span>
            <span>Tool Type</span>
            <span>Design Stage</span>
            <span>Sim Stage</span>
            <span>Dominant</span>
            <span>Reason & Actions</span>
          </div>

          {statuses.map(status => (
            <div
              key={status.toolingNumber}
              className="grid grid-cols-[120px_110px_120px_120px_110px_1fr] gap-3 items-center py-3 px-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/50"
            >
              <span className="font-mono text-sm text-gray-900 dark:text-white">{status.toolingNumber}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{status.toolType}</span>
              <StagePill snapshot={status.designStage} />
              <StagePill snapshot={status.simulationStage} />
              <DominantStageTag stage={status.dominantStage} severity={status.severity} />
              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {getBottleneckReasonLabel(status.bottleneckReason).label}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => onOpenTooling(status.toolingNumber)}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-300 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in Tooling
                  </button>
                  <button
                    onClick={() => onOpenAssets(status.toolingNumber)}
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-300 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open Assets
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
*/

// TODO(George): StagePill and DominantStageTag also reference old ToolingWorkflowStatus types
/*
interface StagePillProps {
  snapshot: ToolingWorkflowStatus['designStage']
}

function StagePill({ snapshot }: StagePillProps) {
  const tone =
    snapshot.status === 'BLOCKED'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      : snapshot.status === 'AT_RISK'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'

  return (
    <div className={cn('rounded-full px-2 py-1 text-[11px] font-semibold text-center', tone)}>
      {snapshot.stage}
      <span className="block text-[10px] font-normal capitalize">{snapshot.status.toLowerCase()}</span>
    </div>
  )
}

interface DominantStageTagProps {
  stage: ToolingWorkflowStatus['dominantStage']
  severity: ToolingWorkflowStatus['severity']
}

function DominantStageTag({ stage, severity }: DominantStageTagProps) {
  const tone =
    severity === 'critical'
      ? 'bg-red-600 text-white'
      : severity === 'warning'
        ? 'bg-amber-500 text-white'
        : 'bg-gray-500 text-white'

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-semibold text-center', tone)}>
      {stage}
    </span>
  )
}
*/

