import { Check, ArrowRight, MonitorPlay } from 'lucide-react'
import { InfoPill } from '../../../ui/components/InfoPill'
import { CellChaosHint } from '../../../ui/components/CellChaosHint'
import type { Cell } from '../../../domain/core'

interface HeaderCardProps {
  cell: Cell
  isEditingEngineer: boolean
  selectedEngineer: string
  allEngineers: any[]
  handleEditEngineer: () => void
  handleSaveEngineer: () => void
  setIsEditingEngineer: (value: boolean) => void
  setSelectedEngineer: (value: string) => void
  handleOpenSimulation: () => Promise<void>
}

export function HeaderCard({
  cell,
  isEditingEngineer,
  selectedEngineer,
  allEngineers,
  handleEditEngineer,
  handleSaveEngineer,
  setIsEditingEngineer,
  setSelectedEngineer,
  handleOpenSimulation,
}: HeaderCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
      <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-4 max-w-3xl">
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                {cell.name || 'Unnamed Station'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium max-w-xl">
                {cell.oemRef ? `OEM Reference ${cell.oemRef} • ` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-y-3 gap-x-8 pt-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                  <Check className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    Area
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
                    {cell.name || '—'}
                  </p>
                </div>
              </div>

              <div className="h-10 w-px bg-gray-100 dark:bg-gray-700 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                    OEM Partner
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
                    {cell.oemRef || 'Standard'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            {cell.simulation?.studyPath && (
              <button
                onClick={handleOpenSimulation}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
              >
                <MonitorPlay className="h-4 w-4" />
                Launch Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Essential Metrics Bar */}
      <div className="bg-gray-50/50 dark:bg-gray-900/20 px-4 md:px-8 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          <InfoPill
            label="Lead Engineer"
            value={isEditingEngineer ? undefined : cell.assignedEngineer || 'Unassigned'}
            onEdit={isEditingEngineer ? undefined : handleEditEngineer}
            editing={isEditingEngineer}
            editContent={
              <div className="space-y-2">
                <input
                  type="text"
                  list="engineers-list"
                  value={selectedEngineer}
                  onChange={(e) => setSelectedEngineer(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Search engineer..."
                />
                <datalist id="engineers-list">
                  {allEngineers.map((e) => (
                    <option key={e.name} value={e.name} />
                  ))}
                </datalist>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEngineer}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 transition-colors uppercase tracking-tight"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setIsEditingEngineer(false)}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-[10px] font-bold hover:bg-gray-300 transition-colors uppercase tracking-tight"
                  >
                    Discard
                  </button>
                </div>
              </div>
            }
          />
          <InfoPill
            label="Simulation Progress"
            value={cell.simulation ? `${cell.simulation.percentComplete}%` : '0%'}
            tone={cell.simulation?.percentComplete === 100 ? 'ok' : undefined}
          />
          <InfoPill
            label="Integrity Check"
            value={
              cell.simulation
                ? cell.simulation.hasIssues
                  ? 'Issues Found'
                  : 'Validation Clear'
                : 'Link Pending'
            }
            tone={cell.simulation?.hasIssues ? 'warn' : cell.simulation ? 'ok' : 'muted'}
          />
          <InfoPill
            label="Last Activity"
            value={
              cell.lastUpdated
                ? new Date(cell.lastUpdated).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'
            }
          />
        </div>
        <div className="mt-2">
          <CellChaosHint cell={cell} />
        </div>
      </div>
    </div>
  )
}
