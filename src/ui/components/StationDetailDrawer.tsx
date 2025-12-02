// StationDetailDrawer Component
// Slide-over drawer showing detailed station information

import { X, ChevronRight, Bot, Wrench, Zap, ArrowUpFromLine, FileSpreadsheet } from 'lucide-react'
import { cn } from '../lib/utils'
import { CellSnapshot, SimulationStatusSnapshot } from '../../domain/crossRef/CrossRefTypes'
import { RiskBadge } from './BadgePill'
import { FlagsList } from './FlagBadge'
import { MetricRow } from './MetricRow'
import { getRiskLevel } from '../../features/dashboard/dashboardUtils'

// ============================================================================
// TYPES
// ============================================================================

interface StationDetailDrawerProps {
  station: CellSnapshot | null
  isOpen: boolean
  onClose: () => void
}

interface SectionProps {
  title: string
  icon: React.ReactNode
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}

// ============================================================================
// COLLAPSIBLE SECTION
// ============================================================================

function Section({ title, icon, count, children, defaultOpen = true }: SectionProps) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center gap-2 py-3 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-4 px-4 rounded-lg transition-colors">
        <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
        <span className="text-gray-500">{icon}</span>
        <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        {count !== undefined && (
          <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </summary>
      <div className="pl-6 pb-4">
        {children}
      </div>
    </details>
  )
}

// ============================================================================
// SIMULATION STATUS SECTION
// ============================================================================

interface SimulationStatusSectionProps {
  status?: SimulationStatusSnapshot
}

function SimulationStatusSection({ status }: SimulationStatusSectionProps) {
  if (!status) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
        <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No Simulation Status for this station yet.</p>
        <p className="text-xs mt-1">This station appears in asset lists but is missing from the Simulation Status sheet.</p>
      </div>
    )
  }

  // Extract core info
  const coreInfo = [
    { label: 'Area', value: status.areaKey ?? '-' },
    { label: 'Line', value: status.lineCode ?? '-' },
    { label: 'Application', value: status.application ?? '-' },
    { label: 'Engineer', value: status.engineer ?? '-' }
  ]

  // Extract completion metrics
  const completionMetrics = [
    { key: 'firstStage', label: '1st Stage Completion', value: status.firstStageCompletion ?? null },
    { key: 'finalDeliverables', label: 'Final Deliverables', value: status.finalDeliverablesCompletion ?? null }
  ]

  return (
    <div className="space-y-4">
      {/* Core Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        {coreInfo.map(item => (
          <div key={item.label}>
            <dt className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</dd>
          </div>
        ))}
      </div>

      {/* Completion Metrics */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
        {completionMetrics.map(metric => (
          <MetricRow
            key={metric.key}
            label={metric.label}
            value={metric.value}
            threshold={90}
          />
        ))}
      </div>

      {/* DCS Status */}
      {status.dcsConfigured !== undefined && (
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="flex items-center gap-2">
            <span className={cn(
              'h-2 w-2 rounded-full',
              status.dcsConfigured ? 'bg-emerald-500' : 'bg-gray-400'
            )} />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              DCS {status.dcsConfigured ? 'Configured' : 'Not Configured'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ASSET COUNT BADGE
// ============================================================================

interface AssetCountBadgeProps {
  icon: React.ReactNode
  label: string
  count: number
}

function AssetCountBadge({ icon, label, count }: AssetCountBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <span className="text-gray-500">{icon}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <span className="ml-auto font-semibold text-gray-900 dark:text-white">{count}</span>
    </div>
  )
}

// ============================================================================
// MAIN DRAWER COMPONENT
// ============================================================================

export function StationDetailDrawer({ station, isOpen, onClose }: StationDetailDrawerProps) {
  if (!station) return null

  const riskLevel = getRiskLevel(station.flags)
  const errorCount = station.flags.filter(f => f.severity === 'ERROR').length
  const warningCount = station.flags.filter(f => f.severity === 'WARNING').length

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
        data-testid="station-detail-drawer"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="drawer-title" className="text-xl font-bold text-gray-900 dark:text-white">
                {station.stationKey}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {station.areaKey ?? 'Unknown Area'}
                </span>
                <RiskBadge riskLevel={riskLevel} />
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
          {/* Asset Summary */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <AssetCountBadge icon={<Bot className="h-4 w-4" />} label="Robots" count={station.robots.length} />
            <AssetCountBadge icon={<Wrench className="h-4 w-4" />} label="Tools" count={station.tools.length} />
            <AssetCountBadge icon={<Zap className="h-4 w-4" />} label="Weld Guns" count={station.weldGuns.length} />
            <AssetCountBadge icon={<ArrowUpFromLine className="h-4 w-4" />} label="Risers" count={station.risers.length} />
          </div>

          {/* Flags Section */}
          {(errorCount > 0 || warningCount > 0) && (
            <Section
              title="Issues"
              icon={<span className="text-amber-500">⚠️</span>}
              count={station.flags.length}
              defaultOpen={true}
            >
              <FlagsList flags={station.flags} />
            </Section>
          )}

          {/* Simulation Status Section */}
          <Section
            title="Simulation Status"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            defaultOpen={true}
          >
            <SimulationStatusSection status={station.simulationStatus} />
          </Section>

          {/* Robots Section */}
          {station.robots.length > 0 && (
            <Section
              title="Robots"
              icon={<Bot className="h-4 w-4" />}
              count={station.robots.length}
              defaultOpen={false}
            >
              <div className="space-y-2">
                {station.robots.map((robot, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {robot.caption ?? robot.robotKey}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                      {robot.oemModel && <span>Model: {robot.oemModel}</span>}
                      {robot.eNumber && <span>E#: {robot.eNumber}</span>}
                      <span className={robot.hasDressPackInfo ? 'text-emerald-600' : 'text-amber-600'}>
                        {robot.hasDressPackInfo ? '✓ Dress Pack Info' : '⚠ Missing Dress Pack'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Tools Section */}
          {station.tools.length > 0 && (
            <Section
              title="Tools & Fixtures"
              icon={<Wrench className="h-4 w-4" />}
              count={station.tools.length}
              defaultOpen={false}
            >
              <div className="space-y-2">
                {station.tools.map((tool, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {tool.toolId ?? `Tool ${idx + 1}`}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {tool.toolType && <span className="mr-2">Type: {tool.toolType}</span>}
                      {(tool.simLeader || tool.teamLeader) ? (
                        <span className="text-emerald-600">
                          Owner: {tool.simLeader ?? tool.teamLeader}
                        </span>
                      ) : (
                        <span className="text-amber-600">⚠ No owner assigned</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Weld Guns Section */}
          {station.weldGuns.length > 0 && (
            <Section
              title="Weld Guns"
              icon={<Zap className="h-4 w-4" />}
              count={station.weldGuns.length}
              defaultOpen={false}
            >
              <div className="space-y-2">
                {station.weldGuns.map((gun, idx) => {
                  const hasForceData = station.gunForces.some(gf => gf.gunKey === gun.gunKey)
                  return (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {gun.deviceName ?? gun.gunKey}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                        {gun.applicationRobot && <span>Robot: {gun.applicationRobot}</span>}
                        {gun.serialNumber && <span>S/N: {gun.serialNumber}</span>}
                        <span className={hasForceData ? 'text-emerald-600' : 'text-amber-600'}>
                          {hasForceData ? '✓ Force Data' : '⚠ Missing Force Data'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Risers Section */}
          {station.risers.length > 0 && (
            <Section
              title="Risers"
              icon={<ArrowUpFromLine className="h-4 w-4" />}
              count={station.risers.length}
              defaultOpen={false}
            >
              <div className="space-y-2">
                {station.risers.map((riser, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {riser.brand ?? 'Unknown Brand'} - {riser.height ?? 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {riser.project && <span>Project: {riser.project}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  )
}
