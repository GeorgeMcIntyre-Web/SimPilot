import { MonitorPlay } from 'lucide-react'
import { DataTable, Column } from '../../../ui/components/DataTable'
import { Tag } from '../../../ui/components/Tag'

interface ToolsSectionProps {
  tools: any
  mergedTools: any
}

export function ToolsSection({ tools, mergedTools }: ToolsSectionProps) {
  const toolColumns: Column<any>[] = [
    { header: 'Name', accessor: (t) => t.name },
    { header: 'Type', accessor: (t) => <Tag label={t.toolType} color="blue" /> },
    { header: 'Model', accessor: (t) => t.oemModel || '-' },
    { header: 'Mount', accessor: (t) => t.mountType },
    {
      header: 'Source',
      accessor: (t) =>
        t.sourceFile ? (
          <span
            className="text-xs text-gray-500"
            title={`${t.sourceFile} (Sheet: ${t.sheetName}, Row: ${t.rowIndex})`}
          >
            {t.sourceFile}
          </span>
        ) : (
          '-'
        ),
    },
  ]

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/30 dark:bg-transparent flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
          <MonitorPlay className="h-4 w-4 text-indigo-500" />
          Integrated Tooling ({tools.length})
        </h3>
      </div>
      <div className="p-2 overflow-x-auto">
        <DataTable
          data={mergedTools as any}
          columns={toolColumns}
          emptyMessage="No specialized tooling detected for this station."
        />
      </div>
    </section>
  )
}
