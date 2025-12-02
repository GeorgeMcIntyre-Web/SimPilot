import { useNavigate } from 'react-router-dom'
import {
  X,
  Layers,
  Clock,
  ExternalLink,
  Workflow,
  AlertTriangle,
  Calendar,
  AppWindow,
  Share2
} from 'lucide-react'
import type { ToolingItem, ToolingWorkflowStatus } from '../../domain/toolingTypes'
import { cn } from '../../ui/lib/utils'

interface ToolingDetailDrawerProps {
  tooling: ToolingItem | null
  workflow: ToolingWorkflowStatus | null
  isOpen: boolean
  onClose: () => void
}

function TimelineRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm text-gray-400">—</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
}

function PillList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ToolingDetailDrawer({ tooling, workflow, isOpen, onClose }: ToolingDetailDrawerProps) {
  const navigate = useNavigate()

  if (tooling === null) return null

  const openSimulationBoard = () => {
    const params = new URLSearchParams()
    params.set('program', tooling.context.program)
    if (tooling.context.area) params.set('area', tooling.context.area)
    if (tooling.context.station) params.set('station', tooling.context.station)
    navigate(`/simulation?${params.toString()}`)
    onClose()
  }

  const openAssetsTab = () => {
    const params = new URLSearchParams()
    if (tooling.context.area) params.set('area', tooling.context.area)
    if (tooling.context.station) params.set('station', tooling.context.station)
    navigate(`/assets?${params.toString()}`)
    onClose()
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        data-testid="tooling-detail-drawer"
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{tooling.context.program} / {tooling.context.area}</p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{tooling.toolingNumber}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{tooling.gaDescription}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          <section className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
              <Layers className="h-4 w-4" />
              <span>{tooling.context.plant} • {tooling.context.unit}</span>
              <span>•</span>
              <span>{tooling.context.station}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Design Stage</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{tooling.designStage}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">Simulation</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{tooling.simulationStatus.shortLabel}</p>
              </div>
            </div>

            {workflow && (
              <div className="flex items-center gap-3 text-sm">
                <Workflow className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dominant Stage</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{workflow.dominantStage}</p>
                  {workflow.bottleneckReason && workflow.bottleneckReason !== 'NONE' && (
                    <div className="mt-1 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">{workflow.bottleneckReason}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Key dates</h3>
            </div>
            <TimelineRow label="Simulation Due" value={tooling.timeline.simulationDue} />
            <TimelineRow label="OLP Due" value={tooling.timeline.olpDue} />
            <TimelineRow label="Documentation Due" value={tooling.timeline.documentationDue} />
            <TimelineRow label="Safety Layout Due" value={tooling.timeline.safetyLayoutDue} />
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <AppWindow className="h-4 w-4 text-green-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Simulation inputs</h3>
            </div>
            <PillList title="Apps" items={tooling.simulationApps} />
            <PillList title="Methods" items={tooling.simulationMethods} />
            <PillList title="Special Functions" items={tooling.specialFunctions} />
          </section>

          <section className="space-y-3">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white py-3 font-medium shadow hover:bg-blue-700 transition-colors"
              onClick={openSimulationBoard}
            >
              <Share2 className="h-4 w-4" />
              Open Station in Simulation Board
            </button>
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 py-3 font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={openAssetsTab}
            >
              <ExternalLink className="h-4 w-4" />
              Open Associated Assets tab
            </button>
          </section>

          <section className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <Clock className="h-4 w-4" />
              <span>Reuse Plan</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {tooling.hasReusePlan ? tooling.reusePlanNotes ?? 'Reuse tasks aligned, see plan for details.' : 'No reuse path defined yet.'}
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
