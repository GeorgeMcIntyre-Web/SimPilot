import { useMemo, useState } from 'react'
import type { HTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Loader2, SlidersHorizontal, ExternalLink } from 'lucide-react'
import { DashboardBottlenecksSummary } from './DashboardBottlenecksSummary'
import { selectWorstWorkflowBottlenecks } from '../../domain/simPilotSelectors'
import { useSimPilotStore } from '../../domain/simPilotStore'
import { EmptyState } from '../../ui/components/EmptyState'
import { cn } from '../../ui/lib/utils'
import type {
  WorkflowBottleneckStatus,
  WorkflowStage,
  WorkflowBottleneckReason
} from '../../domain/workflowTypes'

const STAGE_FILTERS: ReadonlyArray<WorkflowStage | 'ALL'> = ['ALL', 'DESIGN', 'SIMULATION', 'MANUFACTURE', 'EXTERNAL_SUPPLIER', 'UNKNOWN'] as const

interface ReasonOption {
  value: WorkflowBottleneckReason
  label: string
}

interface DashboardBottlenecksPanelProps {
  variant?: 'standalone' | 'embedded'
}

export function DashboardBottlenecksPanel({ variant = 'standalone' }: DashboardBottlenecksPanelProps = {}) {
  const navigate = useNavigate()
  const simPilotState = useSimPilotStore()
  const [stageFilter, setStageFilter] = useState<WorkflowStage | 'ALL'>('ALL')
  const [reasonFilter, setReasonFilter] = useState<WorkflowBottleneckReason[]>([])
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowBottleneckStatus | null>(null)

  // PHASE 3: Using generic workflow selectors, filtered to TOOLING kind only
  const allBottlenecks = useMemo(() => {
    return selectWorstWorkflowBottlenecks(simPilotState, 50)
  }, [simPilotState])

  // Filter to TOOLING kind only (preserves current behavior, ready for WELD_GUN/ROBOT_CELL later)
  const worstBottlenecks = useMemo(() => {
    return allBottlenecks.filter(b => b.kind === 'TOOLING').slice(0, 25)
  }, [allBottlenecks])

  const reasonOptions: ReasonOption[] = useMemo(() => {
    const unique = new Set<WorkflowBottleneckReason>()
    for (const status of worstBottlenecks) {
      unique.add(status.bottleneckReason)
    }
    return Array.from(unique).map(reason => ({
      value: reason,
      label: formatReason(reason)
    }))
  }, [worstBottlenecks])

  const filteredBottlenecks = useMemo(() => {
    return worstBottlenecks.filter(status => {
      if (stageFilter !== 'ALL' && status.dominantStage !== stageFilter) {
        return false
      }
      if (reasonFilter.length > 0 && reasonFilter.includes(status.bottleneckReason) === false) {
        return false
      }
      return true
    }).slice(0, 10)
  }, [worstBottlenecks, stageFilter, reasonFilter])

  const summaryCounts = useMemo(() => {
    let high = 0
    let medium = 0
    let low = 0
    for (const status of worstBottlenecks) {
      const severity = status.severity.toUpperCase()
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        high += 1
        continue
      }
      if (severity === 'MEDIUM') {
        medium += 1
        continue
      }
      if (severity === 'LOW') {
        low += 1
        continue
      }
    }
    return { high, medium, low }
  }, [worstBottlenecks])

  const ContentWrapper = variant === 'embedded' ? 'div' : PanelCard

  if (simPilotState.isLoading === true) {
    const loadingContent = (
      <div className="flex items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading tooling bottlenecks…</span>
      </div>
    )
    return variant === 'embedded' ? loadingContent : <ContentWrapper data-testid="bottlenecks-loading">{loadingContent}</ContentWrapper>
  }

  const hasSnapshot = simPilotState.snapshot !== null
  const hasAnyBottlenecks = worstBottlenecks.length > 0

  if (hasSnapshot === false || hasAnyBottlenecks === false) {
    const emptyContent = (
      <EmptyState
        title="No tooling bottlenecks"
        message="Load data in the Data Loader to see bottleneck trends across tooling workflows."
      />
    )
    return variant === 'embedded' ? emptyContent : <ContentWrapper data-testid="bottlenecks-empty">{emptyContent}</ContentWrapper>
  }

  const handleOpenSimulation = (status: WorkflowBottleneckStatus) => {
    // Parse simulation context key (format: Program|Plant|Unit|Line|Station)
    const parts = status.simulationContextKey.split('|')
    if (parts.length === 5) {
      const params = new URLSearchParams()
      params.set('program', parts[0])
      params.set('plant', parts[1])
      params.set('unit', parts[2])
      params.set('line', parts[3])
      params.set('station', parts[4])
      navigate(`/simulation?${params.toString()}`)
    }
  }

  const handleOpenDrawer = (status: WorkflowBottleneckStatus) => {
    setActiveWorkflow(status)
  }

  const handleCloseDrawer = () => {
    setActiveWorkflow(null)
  }

  const updatedAt = simPilotState.snapshot?.workflowBottleneckSnapshot.generatedAt

  const content = (
    <div className="space-y-6" data-testid="bottlenecks-panel">
        <DashboardBottlenecksSummary
          total={worstBottlenecks.length}
          highCount={summaryCounts.high}
          mediumCount={summaryCounts.medium}
          lowCount={summaryCounts.low}
          activeStage={stageFilter}
          updatedAt={updatedAt}
        />

        <FilterToolbar
          stageFilter={stageFilter}
          onStageChange={setStageFilter}
          reasonFilter={reasonFilter}
          onReasonToggle={reason => {
            setReasonFilter(prev => {
              const exists = prev.includes(reason)
              if (exists === true) {
                return prev.filter(r => r !== reason)
              }
              return [...prev, reason]
            })
          }}
          onClearReasons={() => setReasonFilter([])}
          reasons={reasonOptions}
        />

        {filteredBottlenecks.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
            No bottlenecks match the current filters. Try switching stages or clearing the reasons.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBottlenecks.map(status => (
              <BottleneckRow
                key={status.workflowItemId}
                status={status}
                onOpenSimulation={() => handleOpenSimulation(status)}
                onOpenDetail={() => handleOpenDrawer(status)}
              />
            ))}
          </div>
        )}
    </div>
  )

  return (
    <>
      {variant === 'embedded' ? (
        content
      ) : (
        <PanelCard data-testid="bottlenecks-panel-wrapper">
          {content}
        </PanelCard>
      )}
      <WorkflowDetailDrawer workflow={activeWorkflow} onClose={handleCloseDrawer} />
    </>
  )
}

interface PanelCardProps extends HTMLAttributes<HTMLDivElement> {}

function PanelCard({ className, ...rest }: PanelCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm',
        className
      )}
      {...rest}
    />
  )
}

interface FilterToolbarProps {
  stageFilter: WorkflowStage | 'ALL'
  onStageChange: (stage: WorkflowStage | 'ALL') => void
  reasonFilter: WorkflowBottleneckReason[]
  onReasonToggle: (reason: WorkflowBottleneckReason) => void
  onClearReasons: () => void
  reasons: ReasonOption[]
}

function FilterToolbar({
  stageFilter,
  onStageChange,
  reasonFilter,
  onReasonToggle,
  onClearReasons,
  reasons
}: FilterToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STAGE_FILTERS.map(stage => {
          const isActive = stageFilter === stage
          const base = 'px-4 py-2 rounded-full text-sm font-medium border transition-colors'
          const activeStyle = 'bg-indigo-600 text-white border-indigo-600'
          const inactiveStyle = 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400'
          return (
            <button
              key={stage}
              type="button"
              onClick={() => onStageChange(stage)}
              className={`${base} ${isActive ? activeStyle : inactiveStyle}`}
            >
              {stage === 'ALL' ? 'All stages' : stage.charAt(0) + stage.slice(1).toLowerCase()}
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <Filter className="h-4 w-4" />
          Filter by bottleneck reason
          {reasonFilter.length > 0 && (
            <button
              type="button"
              onClick={onClearReasons}
              className="text-indigo-600 dark:text-indigo-300 text-xs underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {reasons.length === 0 && (
            <span className="text-sm text-gray-400">No reasons available in this snapshot.</span>
          )}
          {reasons.map(reason => {
            const isActive = reasonFilter.includes(reason.value)
            const base = 'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1'
            const activeStyle = 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800'
            const inactiveStyle = 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-purple-400'
            return (
              <button
                key={reason.value}
                type="button"
                onClick={() => onReasonToggle(reason.value)}
                className={`${base} ${isActive ? activeStyle : inactiveStyle}`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                {reason.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface BottleneckRowProps {
  status: WorkflowBottleneckStatus
  onOpenSimulation: () => void
  onOpenDetail: () => void
}

function BottleneckRow({ status, onOpenSimulation, onOpenDetail }: BottleneckRowProps) {
  const severityStyle = getSeverityStyle(status.severity)

  // Extract location info from context key (format: Program|Plant|Unit|Line|Station)
  const parts = status.simulationContextKey.split('|')
  const program = parts[0] ?? 'UNKNOWN'
  const station = parts[4] ?? 'UNKNOWN'

  // Get item display info
  const itemNumber = status.itemNumber ?? status.workflowItemId
  const workflowItem = status.workflowItem
  const handedness = workflowItem?.handedness

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${severityStyle}`}>
              {status.severity} severity
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatReason(status.bottleneckReason)}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {itemNumber}
            {handedness !== undefined ? ` • ${handedness}` : ''}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Station {station} · {program}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={onOpenSimulation}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Open Station in Simulation
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-400 transition-colors"
          >
            Open Item Detail
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <StagePill label="Design" snapshot={status.designStage} />
        <StagePill label="Simulation" snapshot={status.simulationStage} />
        <StagePill label="Manufacture" snapshot={status.manufactureStage} />
      </div>

      <div className="text-xs text-gray-400">
        Dominant stage: {status.dominantStage} · Score {status.severityScore} · Kind: {status.kind}
      </div>
    </div>
  )
}

interface StagePillProps {
  label: string
  snapshot: WorkflowBottleneckStatus['designStage']
}

function StagePill({ label, snapshot }: StagePillProps) {
  const statusText =
    snapshot.status === 'BLOCKED'
      ? 'Blocked'
      : snapshot.status === 'CHANGES_REQUESTED'
        ? 'Changes requested'
        : snapshot.status === 'IN_PROGRESS'
          ? 'In progress'
          : snapshot.status === 'APPROVED'
            ? 'Approved'
            : snapshot.status === 'COMPLETE'
              ? 'Complete'
              : snapshot.status === 'NOT_STARTED'
                ? 'Not started'
                : 'Unknown'

  const statusColor =
    snapshot.status === 'BLOCKED'
      ? 'text-rose-600'
      : snapshot.status === 'CHANGES_REQUESTED'
        ? 'text-amber-600'
        : snapshot.status === 'IN_PROGRESS'
          ? 'text-blue-600'
          : snapshot.status === 'APPROVED' || snapshot.status === 'COMPLETE'
            ? 'text-emerald-600'
            : 'text-gray-500'

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold ${statusColor}`}>
        {statusText}
        {typeof snapshot.percentComplete === 'number' ? ` • ${snapshot.percentComplete}%` : ''}
      </p>
      {snapshot.owner !== undefined && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Owner: {snapshot.owner}</p>
      )}
    </div>
  )
}

interface WorkflowDetailDrawerProps {
  workflow: WorkflowBottleneckStatus | null
  onClose: () => void
}

function WorkflowDetailDrawer({ workflow, onClose }: WorkflowDetailDrawerProps) {
  if (workflow === null) {
    return null
  }

  const workflowItem = workflow.workflowItem
  const parts = workflow.simulationContextKey.split('|')
  const program = parts[0] ?? 'UNKNOWN'
  const station = parts[4] ?? 'UNKNOWN'

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full p-6 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Workflow Item Detail</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <InfoRow label="Item number" value={workflow.itemNumber ?? workflow.workflowItemId} />
          <InfoRow label="Kind" value={workflow.kind} />
          <InfoRow label="Station" value={station} />
          <InfoRow label="Program" value={program} />
          <InfoRow label="Dominant stage" value={workflow.dominantStage} />
          <InfoRow label="Bottleneck reason" value={formatReason(workflow.bottleneckReason)} />
          <InfoRow label="Severity" value={workflow.severity} />
        </div>

        <div className="mt-6 space-y-3">
          <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Item metadata</h5>
          {workflowItem !== undefined ? (
            <div className="space-y-2">
              {workflowItem.name !== undefined && (
                <InfoRow label="Name" value={workflowItem.name} />
              )}
              {workflowItem.equipmentNumber !== undefined && (
                <InfoRow label="Equipment #" value={workflowItem.equipmentNumber} />
              )}
              {workflowItem.handedness !== undefined && (
                <InfoRow label="Handedness" value={workflowItem.handedness} />
              )}
              {workflowItem.externalSupplierName !== undefined && (
                <InfoRow label="Supplier" value={workflowItem.externalSupplierName} />
              )}
              {workflowItem.metadata !== undefined && Object.entries(workflowItem.metadata).map(([key, value]) => (
                <InfoRow
                  key={key}
                  label={key}
                  value={value === undefined || value === null ? '—' : String(value)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No detailed workflow item metadata available.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100 text-right">{value}</span>
    </div>
  )
}

function getSeverityStyle(severity: string): string {
  const upper = severity.toUpperCase()

  if (upper === 'CRITICAL' || upper === 'HIGH') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'
  }
  if (upper === 'MEDIUM') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
  }
  if (upper === 'LOW') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
  }
  if (upper === 'OK') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-200'
}

function formatReason(reason: WorkflowBottleneckReason): string {
  return reason
    .toLowerCase()
    .split('_')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}
