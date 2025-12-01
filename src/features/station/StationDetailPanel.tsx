// Station Detail Panel
// A drawer/side panel that shows detailed station health, simulation gates, assets, and flags

import { useState } from 'react'
import {
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Bot,
  Wrench,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react'
import { CellSnapshot, CrossRefFlag } from '../../domain/crossRef/CrossRefTypes'
import { computeStationHealth, TrafficLight } from '../../domain/health/stationHealth'
import { describeFlag } from '../../domain/health/flagMessages'
import { cn } from '../../ui/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface StationDetailPanelProps {
  cell: CellSnapshot | null
  onClose: () => void
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Traffic light badge component
 */
const TrafficLightBadge = ({ light }: { light: TrafficLight }) => {
  const colorClasses: Record<TrafficLight, string> = {
    RED: 'bg-red-500',
    AMBER: 'bg-amber-400',
    GREEN: 'bg-emerald-500'
  }

  const labelClasses: Record<TrafficLight, string> = {
    RED: 'text-red-700 dark:text-red-300',
    AMBER: 'text-amber-700 dark:text-amber-300',
    GREEN: 'text-emerald-700 dark:text-emerald-300'
  }

  return (
    <div className="flex items-center gap-2">
      <span className={cn('w-3 h-3 rounded-full animate-pulse', colorClasses[light])} />
      <span className={cn('text-sm font-medium', labelClasses[light])}>{light}</span>
    </div>
  )
}

/**
 * Score display with circular progress
 */
const ScoreDisplay = ({ score, trafficLight }: { score: number; trafficLight: TrafficLight }) => {
  const size = 96
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const progressOffset = circumference - (score / 100) * circumference

  const strokeColor: Record<TrafficLight, string> = {
    RED: 'stroke-red-500',
    AMBER: 'stroke-amber-400',
    GREEN: 'stroke-emerald-500'
  }

  return (
    <div className="relative">
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          className={cn(strokeColor[trafficLight], 'transition-all duration-700 ease-out')}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}</span>
      </div>
    </div>
  )
}

/**
 * Progress bar for simulation gates
 */
const GateProgressBar = ({ value, label }: { value: number; label: string }) => {
  const getBarColor = (val: number): string => {
    if (val >= 80) return 'bg-emerald-500'
    if (val >= 50) return 'bg-amber-400'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]" title={label}>
          {label}
        </span>
        <span className="text-gray-600 dark:text-gray-400 font-medium ml-2">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', getBarColor(value))}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Collapsible section wrapper
 */
const Section = ({
  title,
  icon,
  children,
  defaultOpen = true,
  badge
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-500 dark:text-gray-400">{icon}</span>
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-6 pb-4">{children}</div>}
    </div>
  )
}

/**
 * Flag item display
 */
const FlagItem = ({ flag }: { flag: CrossRefFlag }) => {
  const isError = flag.severity === 'ERROR'

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg',
        isError
          ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
      )}
    >
      {isError ? (
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', isError ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200')}>
          {describeFlag(flag)}
        </p>
        {flag.stationKey && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Station: {flag.stationKey}
            {flag.robotKey && ` • Robot: ${flag.robotKey}`}
            {flag.gunKey && ` • Gun: ${flag.gunKey}`}
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract simulation gate metrics from cell snapshot
 */
const extractGateMetrics = (cell: CellSnapshot): Record<string, number> => {
  const simStatus = cell.simulationStatus
  if (!simStatus) return {}

  const raw = simStatus.raw as Record<string, unknown> | undefined
  if (!raw) return {}

  // Check stageMetrics first (from ParsedSimulationRow)
  const stageMetrics = raw['stageMetrics'] as Record<string, number> | undefined
  if (stageMetrics && typeof stageMetrics === 'object') {
    return stageMetrics
  }

  // Check metrics field (from SimulationStatus on Cell)
  const metricsField = raw['metrics'] as Record<string, number | string> | undefined
  if (metricsField && typeof metricsField === 'object') {
    const result: Record<string, number> = {}
    for (const [key, value] of Object.entries(metricsField)) {
      if (typeof value !== 'number') continue
      if (Number.isNaN(value)) continue
      result[key] = value
    }
    return result
  }

  return {}
}

/**
 * Format gate name for display
 */
const formatGateName = (key: string): string => {
  return key
    .replace(/_/g, ' ')
    .replace(/ - STAGE \d+$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Separate flags by severity
 */
const separateFlagsBySeverity = (flags: CrossRefFlag[]): { errors: CrossRefFlag[]; warnings: CrossRefFlag[] } => {
  const errors: CrossRefFlag[] = []
  const warnings: CrossRefFlag[] = []

  for (const flag of flags) {
    if (flag.severity === 'ERROR') {
      errors.push(flag)
      continue
    }
    warnings.push(flag)
  }

  return { errors, warnings }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function StationDetailPanel({ cell, onClose }: StationDetailPanelProps) {
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)

  // Guard clause: render nothing if cell is null
  if (!cell) return null

  // Compute health
  const health = computeStationHealth(cell)

  // Extract gate metrics
  const gateMetrics = extractGateMetrics(cell)
  const gateEntries = Object.entries(gateMetrics).map(([key, value]) => ({
    name: formatGateName(key),
    value,
    key
  }))

  // Filter gates if showing incomplete only
  const displayedGates = showIncompleteOnly
    ? gateEntries.filter((gate) => gate.value < 100)
    : gateEntries

  // Separate flags by severity
  const { errors, warnings } = separateFlagsBySeverity(cell.flags || [])
  const totalFlags = errors.length + warnings.length

  // Asset counts
  const robotCount = cell.robots?.length || 0
  const weldGunCount = cell.weldGuns?.length || 0
  const riserCount = cell.risers?.length || 0
  const toolCount = cell.tools?.length || 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        data-testid="drawer-backdrop"
      />

      {/* Drawer Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-hidden flex flex-col animate-slide-in-right"
        data-testid="station-detail-drawer"
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black px-6 py-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-white truncate">{cell.stationKey}</h2>
                <TrafficLightBadge light={health.trafficLight} />
              </div>
              {cell.areaKey && (
                <p className="text-sm text-slate-300">
                  Area: <span className="font-medium">{cell.areaKey}</span>
                  {cell.lineCode && <span className="ml-2">• Line: {cell.lineCode}</span>}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close panel"
              data-testid="close-drawer-button"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Health Overview Section */}
          <Section
            title="Health Overview"
            icon={<Activity className="h-5 w-5" />}
            defaultOpen={true}
          >
            <div className="flex items-center gap-6 mb-4">
              <ScoreDisplay score={health.score} trafficLight={health.trafficLight} />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Overall station health based on simulation progress and identified risks.
                </p>
                {health.score >= 80 && (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">On Track</span>
                  </div>
                )}
                {health.score >= 50 && health.score < 80 && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Needs Attention</span>
                  </div>
                )}
                {health.score < 50 && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">At Risk</span>
                  </div>
                )}
              </div>
            </div>

            {health.reasons.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Health Impact Factors
                </p>
                <ul className="space-y-1">
                  {health.reasons.map((reason, idx) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-gray-400 dark:text-gray-500">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {/* Simulation Gates Section */}
          <Section
            title="Simulation Gates"
            icon={<TrendingUp className="h-5 w-5" />}
            defaultOpen={true}
            badge={
              gateEntries.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  {gateEntries.filter((g) => g.value >= 100).length}/{gateEntries.length} complete
                </span>
              )
            }
          >
            {gateEntries.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No simulation status data available for this station.
              </p>
            ) : (
              <>
                {/* Incomplete only toggle */}
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 cursor-pointer" data-testid="incomplete-only-toggle">
                    <input
                      type="checkbox"
                      checked={showIncompleteOnly}
                      onChange={(e) => setShowIncompleteOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Filter className="h-4 w-4" />
                      Show incomplete only
                    </span>
                  </label>
                </div>

                <div className="space-y-3">
                  {displayedGates.map((gate) => (
                    <GateProgressBar key={gate.key} label={gate.name} value={gate.value} />
                  ))}
                  {displayedGates.length === 0 && showIncompleteOnly && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      All gates are complete!
                    </p>
                  )}
                </div>
              </>
            )}
          </Section>

          {/* Assets Section */}
          <Section
            title="Assets"
            icon={<Bot className="h-5 w-5" />}
            defaultOpen={true}
            badge={
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {robotCount + weldGunCount + riserCount + toolCount} total
              </span>
            }
          >
            <div className="space-y-4">
              {/* Robots */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-500" />
                  Robots ({robotCount})
                </h4>
                {robotCount === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic pl-6">No robots assigned</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {cell.robots?.map((robot) => (
                      <div
                        key={robot.robotKey}
                        className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                      >
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">{robot.robotKey}</span>
                          {robot.caption && (
                            <span className="text-gray-500 dark:text-gray-400 ml-2">({robot.caption})</span>
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            robot.hasDressPackInfo
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          )}
                        >
                          {robot.hasDressPackInfo ? 'Dress Pack ✓' : 'No Dress Pack'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weld Guns */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-500" />
                  Weld Guns ({weldGunCount})
                </h4>
                {weldGunCount === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic pl-6">No weld guns assigned</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {cell.weldGuns?.map((gun) => {
                      const hasForce = cell.gunForces?.some((gf) => gf.gunKey === gun.gunKey)
                      return (
                        <div
                          key={gun.gunKey}
                          className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{gun.gunKey}</span>
                            {gun.deviceName && (
                              <span className="text-gray-500 dark:text-gray-400 ml-2">({gun.deviceName})</span>
                            )}
                          </div>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              hasForce
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            )}
                          >
                            {hasForce ? 'Force ✓' : 'No Force Data'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Risers */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Risers ({riserCount})
                </h4>
                {riserCount === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic pl-6">No risers assigned</p>
                ) : (
                  <div className="space-y-2 pl-6">
                    {cell.risers?.map((riser, idx) => (
                      <div
                        key={idx}
                        className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded flex items-center gap-2"
                      >
                        {riser.brand && (
                          <span className="font-medium text-gray-900 dark:text-white">{riser.brand}</span>
                        )}
                        {riser.height && (
                          <span className="text-gray-500 dark:text-gray-400">
                            Height: {riser.height}
                            {typeof riser.height === 'number' ? 'mm' : ''}
                          </span>
                        )}
                        {!riser.brand && !riser.height && (
                          <span className="text-gray-500 dark:text-gray-400 italic">Riser (no details)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Flags Section */}
          <Section
            title="Flags & Issues"
            icon={<AlertTriangle className="h-5 w-5" />}
            defaultOpen={totalFlags > 0}
            badge={
              totalFlags > 0 && (
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full ml-2',
                    errors.length > 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  )}
                >
                  {totalFlags} {totalFlags === 1 ? 'issue' : 'issues'}
                </span>
              )
            }
          >
            {totalFlags === 0 ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">No issues detected for this station.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Errors first */}
                {errors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase mb-2">
                      Errors ({errors.length})
                    </p>
                    <div className="space-y-2">
                      {errors.map((flag, idx) => (
                        <FlagItem key={`error-${idx}`} flag={flag} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Then warnings */}
                {warnings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase mb-2">
                      Warnings ({warnings.length})
                    </p>
                    <div className="space-y-2">
                      {warnings.map((flag, idx) => (
                        <FlagItem key={`warning-${idx}`} flag={flag} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>
    </>
  )
}

export default StationDetailPanel
