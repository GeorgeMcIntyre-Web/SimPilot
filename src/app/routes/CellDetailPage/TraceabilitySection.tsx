import { FileSpreadsheet } from 'lucide-react'
import type { Cell } from '../../../domain/core'

interface TraceabilitySectionProps {
  cell: Cell
}

export function TraceabilitySection({ cell }: TraceabilitySectionProps) {
  return (
    <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
          Data Traceability
        </h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
              Primary Manifest
            </span>
            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 truncate break-all">
              {cell.simulation?.sourceFile || 'N/A'}
            </span>
          </div>
          {cell.simulation?.studyPath && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                Simulation Path
              </span>
              <span className="text-[10px] font-mono text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                {cell.simulation.studyPath}
              </span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-50 dark:border-gray-700/50">
          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
            <span>System Objects</span>
            <span className="text-gray-300">/</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
              <span className="block text-[8px] text-gray-400 uppercase font-black mb-0.5">
                Static ID
              </span>
              <span className="text-[10px] font-mono font-bold dark:text-gray-300">
                {cell.id.slice(0, 8)}...
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
              <span className="block text-[8px] text-gray-400 uppercase font-black mb-0.5">
                Project
              </span>
              <span className="text-[10px] font-bold dark:text-gray-300 truncate">
                {cell.projectId || 'Global'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
