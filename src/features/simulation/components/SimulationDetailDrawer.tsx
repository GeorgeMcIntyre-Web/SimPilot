// Simulation Detail Drawer
// Side panel showing full station context and related assets
// Provides action to view assets in Assets tab

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
  Layers
} from 'lucide-react'
import { cn } from '../../../ui/lib/utils'
import type { StationContext } from '../simulationStore'

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
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="drawer-title" className="text-xl font-bold text-gray-900 dark:text-white">
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

        {/* Content */}
        <div className="px-6 py-4 space-y-2">
          {/* Context Breadcrumb */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">{station.program}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span>{station.plant}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span>{station.unit}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span>{station.line}</span>
            </div>
          </div>

          {/* Asset Summary */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <AssetCountRow
              icon={<Bot className="h-4 w-4" />}
              label="Robots"
              count={station.assetCounts.robots}
              color="text-purple-500"
            />
            <AssetCountRow
              icon={<Zap className="h-4 w-4" />}
              label="Guns"
              count={station.assetCounts.guns}
              color="text-yellow-500"
            />
            <AssetCountRow
              icon={<Wrench className="h-4 w-4" />}
              label="Tools"
              count={station.assetCounts.tools}
              color="text-blue-500"
            />
            <AssetCountRow
              icon={<Box className="h-4 w-4" />}
              label="Other"
              count={station.assetCounts.other}
              color="text-gray-500"
            />
          </div>

          {/* Sourcing Breakdown */}
          <Section title="Sourcing" icon={<RefreshCw className="h-4 w-4" />}>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300">Reuse / Free Issue</span>
                </div>
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {station.sourcingCounts.reuse + station.sourcingCounts.freeIssue}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">New Buy</span>
                </div>
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {station.sourcingCounts.newBuy}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm text-amber-700 dark:text-amber-300">Unknown</span>
                </div>
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {station.sourcingCounts.unknown}
                </span>
              </div>
            </div>
          </Section>

          {/* Simulation Status */}
          <Section title="Simulation Status" icon={<FileSpreadsheet className="h-4 w-4" />}>
            {simStatus === undefined ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No simulation status data for this station.</p>
              </div>
            ) : (
              <div className="space-y-1">
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
                {simStatus.engineer && (
                  <div className="flex items-center gap-2 py-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {simStatus.engineer}
                    </span>
                  </div>
                )}
                {simStatus.sourceFile && (
                  <div className="text-xs text-gray-400 mt-2">
                    Source: {simStatus.sourceFile}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleViewAssets}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
                'bg-blue-600 hover:bg-blue-700 text-white font-medium',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              )}
            >
              <ExternalLink className="h-4 w-4" />
              View Related Assets in Assets Tab
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
