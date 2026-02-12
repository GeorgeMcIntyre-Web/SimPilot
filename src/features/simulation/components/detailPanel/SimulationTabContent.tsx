import { BarChart3, CheckCircle2, Clock, User, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { MetricRow } from '../SimulationDetailPieces'
import type { StationContext } from '../../simulationStore'

interface SimulationTabContentProps {
  station: StationContext
}

export function SimulationTabContent({ station }: SimulationTabContentProps) {
  const simStatus = station.simulationStatus

  if (!simStatus) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No simulation status data available
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200">Progress</h3>
        </div>
        <div className="space-y-2">
          <MetricRow label="1st Stage" value={simStatus.firstStageCompletion} threshold={80} />
          <MetricRow
            label="Final Deliverables"
            value={simStatus.finalDeliverablesCompletion}
            threshold={80}
          />
        </div>
      </div>

      {/* Status */}
      <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200">Status</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium px-2 py-2 rounded bg-gray-50 dark:bg-gray-700/60">
          {simStatus.dcsConfigured ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-emerald-700 dark:text-emerald-300">DCS configured</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-amber-700 dark:text-amber-300">DCS not configured</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs px-2 py-2 rounded bg-gray-50 dark:bg-gray-700/60">
          <User className="h-4 w-4 text-blue-500" />
          <span className="text-gray-600 dark:text-gray-200">
            {simStatus.engineer || 'Unassigned'}
          </span>
        </div>
      </div>

      {/* Data source (collapsed text, no accordion) */}
      <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-[11px] space-y-1">
        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-semibold">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>Data source</span>
        </div>
        <div className="flex flex-col gap-1 text-gray-600 dark:text-gray-300">
          <div className="flex gap-1">
            <span className="text-gray-500 dark:text-gray-400">File:</span>
            <span className="font-mono truncate">{simStatus.sourceFile || 'Unknown'}</span>
          </div>
          {simStatus.sheetName && (
            <div className="flex gap-1">
              <span className="text-gray-500 dark:text-gray-400">Sheet:</span>
              <span className="font-mono truncate">{simStatus.sheetName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
