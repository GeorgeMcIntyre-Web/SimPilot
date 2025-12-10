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
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-xs text-gray-400">—</span>
      </div>
    )
  }

  const isGood = value >= threshold

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all',
              isGood ? 'bg-emerald-500' : 'bg-amber-500'
            )}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={cn(
          'text-xs font-medium min-w-[2.5rem] text-right',
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
    <div className="flex items-center gap-2 py-1.5 px-2 bg-gray-50 dark:bg-gray-700/50 rounded">
      <span className={cn(color, "scale-90")}>{icon}</span>
      <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
      <span className="ml-auto font-semibold text-sm text-gray-900 dark:text-white">{count}</span>
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
          'fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50',
          'transform transition-transform duration-300 ease-out',
          'overflow-y-auto flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        data-testid="simulation-detail-drawer"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="px-4 py-2.5">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 id="drawer-title" className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {station.station}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  <Layers className="h-3 w-3" />
                  <span>{station.line}</span>
                  <span>•</span>
                  <span>{station.unit}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ml-2"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2',
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('assets')}
              className={cn(
                'flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2',
                activeTab === 'assets'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Assets ({station.assetCounts.total})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('simulation')}
              className={cn(
                'flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2',
                activeTab === 'simulation'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Simulation
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3 space-y-3">
            {/* Context Breadcrumb */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded p-2 border border-blue-100 dark:border-blue-800">
              <div className="flex flex-wrap items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                <span className="font-medium text-blue-900 dark:text-blue-100">{station.program}</span>
                <ChevronRight className="h-3 w-3 text-blue-400" />
                <span className="text-blue-800 dark:text-blue-200">{station.plant}</span>
                <ChevronRight className="h-3 w-3 text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">{station.unit}</span>
                <ChevronRight className="h-3 w-3 text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">{station.line}</span>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                {/* Asset Summary Cards - Compact Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-200 dark:border-purple-800">
                    <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1" />
                    <div className="text-xl font-bold text-purple-900 dark:text-purple-100">{station.assetCounts.robots}</div>
                    <div className="text-[10px] text-purple-700 dark:text-purple-300">Robots</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                    <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mb-1" />
                    <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">{station.assetCounts.guns}</div>
                    <div className="text-[10px] text-yellow-700 dark:text-yellow-300">Guns</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                    <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
                    <div className="text-xl font-bold text-blue-900 dark:text-blue-100">{station.assetCounts.tools}</div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300">Tools</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/20 p-2 rounded border border-gray-200 dark:border-gray-600">
                    <Package className="h-5 w-5 text-gray-600 dark:text-gray-400 mb-1" />
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{station.assetCounts.total}</div>
                    <div className="text-[10px] text-gray-700 dark:text-gray-300">Total</div>
                  </div>
                </div>

                {/* Sourcing Breakdown - Compact */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShoppingCart className="h-3.5 w-3.5 text-gray-500" />
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Sourcing</h3>
                  </div>
                  <div className="space-y-1.5">
                    <AssetCountRow
                      icon={<RefreshCw className="h-3.5 w-3.5" />}
                      label="Reuse"
                      count={station.sourcingCounts.reuse}
                      color="text-emerald-600 dark:text-emerald-400"
                    />
                    <AssetCountRow
                      icon={<ShoppingCart className="h-3.5 w-3.5" />}
                      label="New Buy"
                      count={station.sourcingCounts.newBuy}
                      color="text-blue-600 dark:text-blue-400"
                    />
                    <AssetCountRow
                      icon={<HelpCircle className="h-3.5 w-3.5" />}
                      label="Free Issue"
                      count={station.sourcingCounts.freeIssue}
                      color="text-purple-600 dark:text-purple-400"
                    />
                    <AssetCountRow
                      icon={<HelpCircle className="h-3.5 w-3.5" />}
                      label="Unknown"
                      count={station.sourcingCounts.unknown}
                      color="text-gray-500 dark:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'assets' && (
              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Asset List ({station.assets.length})
                </h3>
                {station.assets.length === 0 ? (
                  <div className="text-center py-6">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No assets linked to this station</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {station.assets.map((asset, idx) => (
                      <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            {asset.kind === 'ROBOT' && <Bot className="h-4 w-4 text-purple-500" />}
                            {asset.kind === 'GUN' && <Zap className="h-4 w-4 text-yellow-500" />}
                            {asset.kind === 'TOOL' && <Wrench className="h-4 w-4 text-blue-500" />}
                            {asset.kind !== 'ROBOT' && asset.kind !== 'GUN' && asset.kind !== 'TOOL' && <Box className="h-4 w-4 text-gray-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-xs text-gray-900 dark:text-white truncate">{asset.name}</div>
                            {asset.oemModel && (
                              <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">Model: {asset.oemModel}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              {asset.sourcing && (
                                <span className={cn(
                                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                  asset.sourcing === 'REUSE' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                                  asset.sourcing === 'NEW_BUY' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                                  asset.sourcing === 'UNKNOWN' && "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300"
                                )}>
                                  {asset.sourcing === 'REUSE' && <RefreshCw className="h-2.5 w-2.5" />}
                                  {asset.sourcing === 'NEW_BUY' && <ShoppingCart className="h-2.5 w-2.5" />}
                                  {asset.sourcing}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">{asset.kind}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'simulation' && (
              <div className="space-y-3">
                {simStatus === undefined ? (
                  <div className="text-center py-6">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <h3 className="text-sm font-medium mb-1">No Simulation Data</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">No simulation status data available for this station.</p>
                  </div>
                ) : (
                  <>
                    {/* Completion Metrics */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
                        <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Completion Progress</h3>
                      </div>
                      <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <MetricRow
                          label="1st Stage"
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
                    <div className="space-y-2">
                      {simStatus.engineer && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <User className="h-3.5 w-3.5 text-gray-500" />
                            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Assignment</h3>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <User className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">{simStatus.engineer}</span>
                          </div>
                        </div>
                      )}
                      {simStatus.dcsConfigured !== undefined && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-gray-500" />
                            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Configuration</h3>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                            {simStatus.dcsConfigured ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">DCS Configured</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-4 w-4 text-amber-500" />
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">DCS Not Configured</span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {simStatus.sourceFile && (
                        <details className="group">
                          <summary className="flex items-center gap-1.5 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-1 px-1 py-1 rounded transition-colors">
                            <ChevronRight className="h-3 w-3 text-gray-400 transition-transform group-open:rotate-90" />
                            <FileSpreadsheet className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Data Source</span>
                          </summary>
                          <div className="pl-5 pt-2 space-y-1 text-[10px]">
                            <div className="flex justify-between py-0.5">
                              <span className="text-gray-500 dark:text-gray-400">File:</span>
                              <span className="text-gray-900 dark:text-white font-mono truncate ml-2">{simStatus.sourceFile}</span>
                            </div>
                            {simStatus.sheetName && (
                              <div className="flex justify-between py-0.5">
                                <span className="text-gray-500 dark:text-gray-400">Sheet:</span>
                                <span className="text-gray-900 dark:text-white font-mono">{simStatus.sheetName}</span>
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {hasToolingBottlenecks && (
                <button
                  onClick={() => setIsToolingDrawerOpen(true)}
                  className={cn(
                    'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-xs font-medium',
                    'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
                    'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors'
                  )}
                  data-testid="view-tooling-bottlenecks"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  View Tooling Bottlenecks
                </button>
              )}
              <button
                onClick={handleOpenGeneralAssets}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View All Assets
              </button>
            </div>
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

