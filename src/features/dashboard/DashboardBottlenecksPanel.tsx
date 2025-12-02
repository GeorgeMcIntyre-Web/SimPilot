import { useMemo, useState } from 'react'
import type { HTMLAttributes } from 'react'
import { useNavigate } from 'react-router-dom'
import { Filter, Loader2, SlidersHorizontal, ExternalLink } from 'lucide-react'
import { DashboardBottlenecksSummary } from './DashboardBottlenecksSummary'
import { selectWorstBottlenecks } from '../../domain/simPilotSelectors'
import { useSimPilotStore } from '../../domain/simPilotStore'
import type {
  BottleneckReason,
  ToolingWorkflowStatus,
  WorkflowStage
} from '../../domain/toolingTypes'

const STAGE_FILTERS: Array<WorkflowStage | 'ALL'> = ['ALL', 'DESIGN', 'SIMULATION', 'MANUFACTURE']

interface ReasonOption {
  value: BottleneckReason
  label: string
}

export function DashboardBottlenecksPanel() {
  const navigate = useNavigate()
  const simPilotState = useSimPilotStore()
  const [stageFilter, setStageFilter] = useState<WorkflowStage | 'ALL'>('ALL')
  const [reasonFilter, setReasonFilter] = useState<BottleneckReason[]>([])
  const [activeWorkflow, setActiveWorkflow] = useState<ToolingWorkflowStatus | null>(null)

  const worstBottlenecks = useMemo(() => {
    return selectWorstBottlenecks(simPilotState, 25)
  }, [simPilotState])

  const reasonOptions: ReasonOption[] = useMemo(() => {
    const unique = new Set<BottleneckReason>()
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
      const derived = deriveSeverity(status.bottleneckReason)
      if (derived === 'HIGH') {
        high += 1
        continue
      }
      if (derived === 'MEDIUM') {
        medium += 1
        continue
      }
      low += 1
    }
    return { high, medium, low }
  }, [worstBottlenecks])

  if (simPilotState.isLoading === true) {
    return (
      <PanelCard data-testid="bottlenecks-loading">
        <div className="flex items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading tooling bottlenecks…</span>
        </div>
      </PanelCard>
    )
  }

  const hasSnapshot = simPilotState.snapshot !== null
  const hasAnyBottlenecks = worstBottlenecks.length > 0

  if (hasSnapshot === false || hasAnyBottlenecks === false) {
    return (
      <PanelCard data-testid="bottlenecks-empty">
        <div className="space-y-2 text-center py-10">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            No tooling bottlenecks detected
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Load the latest SimPilot snapshot or adjust the filters to see DESIGN, SIMULATION, or
            MANUFACTURE blockers.
          </p>
        </div>
      </PanelCard>
    )
  }

  const handleOpenSimulation = (status: ToolingWorkflowStatus) => {
    const params = new URLSearchParams()
    params.set('program', status.location.program)
    params.set('plant', status.location.plant)
    params.set('unit', status.location.unit)
    params.set('line', status.location.line)
    params.set('station', status.location.station)
    navigate(`/simulation?${params.toString()}`)
  }

  const handleOpenDrawer = (status: ToolingWorkflowStatus) => {
    setActiveWorkflow(status)
  }

  const handleCloseDrawer = () => {
    setActiveWorkflow(null)
  }

  const updatedAt = simPilotState.snapshot?.bottleneckSnapshot.generatedAt

  return (
    <PanelCard data-testid="bottlenecks-panel">
      <div className="space-y-6">
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
                key={status.workflowId}
                status={status}
                onOpenSimulation={() => handleOpenSimulation(status)}
                onOpenDetail={() => handleOpenDrawer(status)}
              />
            ))}
          </div>
        )}
      </div>

      <ToolingDetailDrawer workflow={activeWorkflow} onClose={handleCloseDrawer} />
    </PanelCard>
  )
}

interface PanelCardProps extends HTMLAttributes<HTMLDivElement> {}

function PanelCard({ className, ...rest }: PanelCardProps) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm ${className ?? ''}`}
      {...rest}
    />
  )
}

interface FilterToolbarProps {
  stageFilter: WorkflowStage | 'ALL'
  onStageChange: (stage: WorkflowStage | 'ALL') => void
  reasonFilter: BottleneckReason[]
  onReasonToggle: (reason: BottleneckReason) => void
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
  status: ToolingWorkflowStatus
  onOpenSimulation: () => void
  onOpenDetail: () => void
}

function BottleneckRow({ status, onOpenSimulation, onOpenDetail }: BottleneckRowProps) {
  const severity = deriveSeverity(status.bottleneckReason)
  const severityStyle = getSeverityStyle(severity)

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${severityStyle}`}>
              {severity} severity
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatReason(status.bottleneckReason)}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {status.toolingNumber}
            {status.handedness ? ` • ${status.handedness}` : ''}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Station {status.station} · {status.area} · {status.program}
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
            Open Tooling Detail
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <StagePill label="Design" snapshot={status.designStage} />
        <StagePill label="Simulation" snapshot={status.simulationStage} />
        <StagePill label="Manufacture" snapshot={status.manufactureStage} />
      </div>

      <div className="text-xs text-gray-400">
        Dominant stage: {status.dominantStage} · Score {status.severityScore}
      </div>
    </div>
  )
}

interface StagePillProps {
  label: string
  snapshot: ToolingWorkflowStatus['designStage']
}

function StagePill({ label, snapshot }: StagePillProps) {
  const statusText =
    snapshot.status === 'BLOCKED'
      ? 'Blocked'
      : snapshot.status === 'AT_RISK'
        ? 'At risk'
        : 'On track'
  const statusColor =
    snapshot.status === 'BLOCKED'
      ? 'text-rose-600'
      : snapshot.status === 'AT_RISK'
        ? 'text-amber-600'
        : 'text-emerald-600'

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold ${statusColor}`}>
        {statusText}
        {typeof snapshot.percentComplete === 'number' ? ` • ${snapshot.percentComplete}%` : ''}
      </p>
      {snapshot.owner && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Owner: {snapshot.owner}</p>
      )}
    </div>
  )
}

interface ToolingDetailDrawerProps {
  workflow: ToolingWorkflowStatus | null
  onClose: () => void
}

function ToolingDetailDrawer({ workflow, onClose }: ToolingDetailDrawerProps) {
  if (workflow === null) {
    return null
  }

  const tool = workflow.tool

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full p-6 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Tooling Detail</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <InfoRow label="Tooling number" value={workflow.toolingNumber} />
          {workflow.equipmentNumber && (
            <InfoRow label="Equipment #" value={workflow.equipmentNumber} />
          )}
          <InfoRow label="Station" value={`${workflow.station} • ${workflow.area}`} />
          <InfoRow label="Program" value={workflow.program} />
          <InfoRow label="Dominant stage" value={workflow.dominantStage} />
          <InfoRow label="Bottleneck reason" value={formatReason(workflow.bottleneckReason)} />
        </div>

        <div className="mt-6 space-y-3">
          <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tool metadata</h5>
          {tool ? (
            <div className="space-y-2">
              <InfoRow label="Supplier" value={tool.supplier ?? 'Not specified'} />
              <InfoRow label="Owner" value={tool.owner ?? 'Unassigned'} />
              <InfoRow label="Location" value={`${tool.location.plant} / ${tool.location.line}`} />
              {Object.entries(tool.metadata).map(([key, value]) => (
                <InfoRow
                  key={key}
                  label={key}
                  value={value === undefined || value === null ? '—' : String(value)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No detailed tooling record was linked to this workflow item.
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

type SeverityLabel = 'HIGH' | 'MEDIUM' | 'LOW'

function deriveSeverity(reason: BottleneckReason): SeverityLabel {
  if (reason === 'DESIGN_BLOCKED' || reason === 'SIMULATION_DEFECT') {
    return 'HIGH'
  }
  if (reason === 'MANUFACTURE_CONSTRAINT' || reason === 'SUPPLIER_DELAY') {
    return 'MEDIUM'
  }
  return 'LOW'
}

function getSeverityStyle(severity: SeverityLabel): string {
  if (severity === 'HIGH') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200'
  }
  if (severity === 'MEDIUM') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'
  }
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
}

function formatReason(reason: BottleneckReason): string {
  return reason
    .toLowerCase()
    .split('_')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}
