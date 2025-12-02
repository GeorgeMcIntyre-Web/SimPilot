import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { FlowerEmptyState } from '../../ui/components/FlowerEmptyState'
import { useSimPilotStore } from '../../domain/simPilotStore'
import type { ToolingItem } from '../../domain/toolingTypes'
import { ToolingFilterBar, ToolingTable, ToolingDetailDrawer, useToolingFilters } from '../../features/tooling'

function StatCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'alert' }) {
  const toneClasses = tone === 'alert'
    ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300'
    : 'bg-white border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100'

  return (
    <div className={`rounded-xl border ${toneClasses} p-4 shadow-sm`}>
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  )
}

export function ToolingPage() {
  const navigate = useNavigate()
  const { isLoading, toolingSnapshot, workflowStatuses } = useSimPilotStore()
  const { items, filters, setFilter, resetFilters, options, counts, workflowById } = useToolingFilters()
  const [selectedTool, setSelectedTool] = useState<ToolingItem | null>(null)
  const [isDrawerOpen, setDrawerOpen] = useState(false)

  const handleSelect = (tool: ToolingItem) => {
    setSelectedTool(tool)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setSelectedTool(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="tooling-loading-state">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading tooling snapshot…</p>
      </div>
    )
  }

  if (toolingSnapshot.items.length === 0 && workflowStatuses.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader title="Tooling" subtitle="Cross-program tooling workflow" />
        <FlowerEmptyState
          title="No tooling ingested"
          message="Load the latest Tool List and Bottleneck exports to start tracking tooling health."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
        />
      </div>
    )
  }

  const selectedWorkflow = selectedTool ? workflowById.get(selectedTool.id) ?? null : null

  return (
    <div className="space-y-6" data-testid="tooling-page">
      <PageHeader
        title="Tooling workflow"
        subtitle="Track design readiness, simulation blockers, and reuse plans per tool."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total tools" value={counts.total} />
        <StatCard label="Visible with filters" value={counts.filtered} />
        <StatCard label="Active bottlenecks" value={counts.bottlenecked} tone={counts.bottlenecked ? 'alert' : 'default'} />
      </div>

      <ToolingFilterBar
        filters={filters}
        options={options}
        onFilterChange={setFilter}
        onReset={resetFilters}
      />

      <ToolingTable items={items} workflowById={workflowById} onSelect={handleSelect} />

      <ToolingDetailDrawer
        tooling={selectedTool}
        workflow={selectedWorkflow}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}
