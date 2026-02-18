import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { StatusPill } from '../../../ui/components/StatusPill'
import type { Cell } from '../../../domain/core'

interface BreadcrumbsProps {
  cell: Cell
  breadcrumbRootHref: string
  breadcrumbRootLabel: string
  isAtRisk: boolean
}

export function Breadcrumbs({
  cell,
  breadcrumbRootHref,
  breadcrumbRootLabel,
  isAtRisk,
}: BreadcrumbsProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        <Link
          to={breadcrumbRootHref}
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          {breadcrumbRootLabel}
        </Link>
        <span className="text-gray-300 dark:text-gray-700">/</span>
        {cell.projectId && (
          <>
            <Link
              to={`/projects/${cell.projectId}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              Project
            </Link>
            <span className="text-gray-300 dark:text-gray-700">/</span>
          </>
        )}
        <span className="text-gray-900 dark:text-gray-300">{cell.name || 'Station'}</span>
      </nav>

      <div className="flex items-center gap-2">
        {isAtRisk && (
          <span className="inline-flex items-center gap-1.5 rounded bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 uppercase">
            <AlertTriangle className="h-3 w-3" />
            At Risk
          </span>
        )}
        <StatusPill status={cell.status} />
      </div>
    </div>
  )
}
