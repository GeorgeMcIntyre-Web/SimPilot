import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { DataTable, Column } from '../../../ui/components/DataTable'
import type { RobotDisplay } from './types'

interface RobotAssetsSectionProps {
  robots: RobotDisplay[]
}

export function RobotAssetsSection({ robots }: RobotAssetsSectionProps) {
  const robotColumns: Column<RobotDisplay>[] = [
    {
      header: 'Name',
      accessor: (r) => {
        const robotLabel = r.name
        const assetId = r.linkAssetId || r.id
        if (!assetId) return robotLabel
        const searchParams = new URLSearchParams()
        searchParams.set('assetId', assetId)
        if (robotLabel) {
          searchParams.set('robotNumber', robotLabel)
        }
        return (
          <Link
            to={`/assets?${searchParams.toString()}`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {robotLabel}
          </Link>
        )
      },
    },
    { header: 'Model', accessor: (r) => r.oemModel || '-' },
    {
      header: 'Application Code',
      accessor: (r) => {
        const rawApp =
          (r.metadata?.application as string) ||
          (r.metadata?.['Robot Function'] as string) ||
          (r.metadata?.['Application'] as string) ||
          (r.metadata?.robotType as string) ||
          (r.metadata?.['Robot Type'] as string) ||
          '—'

        const appMap: Record<string, string> = {
          'SELF PIERCE RIVET': 'SPR',
          'SELF PIERCE RIVETING': 'SPR',
          'SPOT WELD': 'SW',
          'SPOT WELDING': 'SW',
          'MATERIAL HANDLING': 'MH',
          'STUD WELDING': 'STUD',
          'STUD WELD': 'STUD',
          'ARC WELDING': 'AW',
          SEALER: 'SEA',
          SEALING: 'SEA',
          ADHESIVE: 'ADH',
          'FLOW DRILL SCREW': 'FDS',
          PROCESS: 'PROC',
        }

        const normalized = rawApp.toUpperCase().trim()
        const app = appMap[normalized] || rawApp

        return (
          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase tracking-wider">
            {app}
          </span>
        )
      },
    },
    {
      header: 'Comment',
      accessor: (r) => {
        const comment =
          (r.metadata?.comment as string) ||
          (r.metadata?.Comment as string) ||
          (r.metadata?.esowComment as string) ||
          (r.metadata?.['ESOW Comment'] as string) ||
          null
        return comment && comment.toString().trim().length > 0 ? comment : '—'
      },
    },
  ]

  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/30 dark:bg-transparent flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
          <Package className="h-4 w-4 text-blue-500" />
          Robot Assets ({robots.length})
        </h3>
      </div>
      <div className="p-2 overflow-x-auto">
        <DataTable
          data={robots}
          columns={robotColumns}
          emptyMessage="No robots assigned to this production node."
        />
      </div>
    </section>
  )
}
