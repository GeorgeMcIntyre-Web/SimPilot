import { Table } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
      <Table className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>No sheets to display</p>
      <p className="text-sm">Load a workbook to see mapping analysis</p>
    </div>
  )
}
