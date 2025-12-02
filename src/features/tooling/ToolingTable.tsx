import type { ToolingItem, WorkflowStage, BottleneckReason, ToolingWorkflowStatus } from '../../domain/toolingTypes'
import { DataTable, type Column } from '../../ui/components/DataTable'
import { Tag } from '../../ui/components/Tag'

const stageColor: Record<WorkflowStage, 'blue' | 'purple' | 'yellow'> = {
  DESIGN: 'blue',
  SIMULATION: 'purple',
  MANUFACTURE: 'yellow'
}

const reasonColor: Partial<Record<BottleneckReason, 'red' | 'yellow' | 'purple'>> = {
  DATA_GAP: 'red',
  STAFFING: 'purple',
  HARDWARE_DELAY: 'red',
  SCOPE_CHANGE: 'yellow',
  QUALITY: 'red'
}

interface ToolingTableProps {
  items: ToolingItem[]
  workflowById: Map<string, ToolingWorkflowStatus>
  onSelect: (item: ToolingItem) => void
}

export function ToolingTable({ items, workflowById, onSelect }: ToolingTableProps) {
  const columns: Column<ToolingItem>[] = [
    {
      header: 'Program / Area / Station',
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">{item.context.program}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.context.area} • {item.context.station}</span>
        </div>
      )
    },
    {
      header: 'Tooling Number',
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{item.toolingNumber}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.handedness}</span>
        </div>
      )
    },
    {
      header: 'Tool Type / Equipment',
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">{item.toolType}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{item.equipmentType ?? '—'}</span>
        </div>
      )
    },
    {
      header: 'Design Stage',
      accessor: (item) => <Tag label={item.designStage.replace('_', ' ')} color="blue" />
    },
    {
      header: 'Simulation Status',
      accessor: (item) => (
        <div className="flex flex-col">
          <Tag label={item.simulationStatus.shortLabel} color="purple" />
          {item.simulationStatus.percentComplete !== undefined && (
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.simulationStatus.percentComplete}%</span>
          )}
        </div>
      )
    },
    {
      header: 'Dominant Stage',
      accessor: (item) => {
        const workflow = workflowById.get(item.id)
        if (!workflow) return <Tag label="Untracked" color="gray" />
        return <Tag label={workflow.dominantStage} color={stageColor[workflow.dominantStage]} />
      }
    },
    {
      header: 'Bottleneck Reason',
      accessor: (item) => {
        const workflow = workflowById.get(item.id)
        if (!workflow || !workflow.bottleneckReason || workflow.bottleneckReason === 'NONE') {
          return <span className="text-xs text-gray-400">—</span>
        }
        const color = reasonColor[workflow.bottleneckReason] ?? 'yellow'
        return <Tag label={workflow.bottleneckReason} color={color} />
      }
    },
    {
      header: 'Has Assets',
      accessor: (item) => (
        <Tag
          label={item.hasAssets ? 'Yes' : 'No'}
          color={item.hasAssets ? 'green' : 'red'}
        />
      )
    },
    {
      header: 'Reuse Plan',
      accessor: (item) => (
        <Tag
          label={item.hasReusePlan ? 'Ready' : 'Missing'}
          color={item.hasReusePlan ? 'green' : 'red'}
        />
      )
    }
  ]

  return (
    <div data-testid="tooling-table">
      <DataTable data={items} columns={columns} onRowClick={onSelect} emptyMessage="No tooling matches the current filters." />
    </div>
  )
}
