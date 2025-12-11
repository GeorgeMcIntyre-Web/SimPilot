import {
  BarChart3,
  CheckCircle2,
  Clock,
  User,
  FileSpreadsheet,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { MetricRow } from '../SimulationDetailPieces';
import type { StationContext } from '../../simulationStore';

interface SimulationTabContentProps {
  station: StationContext;
}

export function SimulationTabContent({ station }: SimulationTabContentProps) {
  const simStatus = station.simulationStatus;

  if (!simStatus) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          No simulation status data available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Completion Metrics */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Completion Progress
          </h3>
        </div>
        <div className="space-y-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          <MetricRow
            label="1st Stage"
            value={simStatus.firstStageCompletion}
            threshold={80}
          />
          <MetricRow
            label="Final Deliverables"
            value={simStatus.finalDeliverablesCompletion}
            threshold={80}
          />
        </div>
      </div>

      {/* DCS Configuration */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-gray-500" />
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Configuration</h3>
        </div>
        <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
          {simStatus.dcsConfigured ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                DCS Configured
              </span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                DCS Not Configured
              </span>
            </>
          )}
        </div>
      </div>

      {/* Engineer Assignment */}
      {simStatus.engineer && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <User className="h-3.5 w-3.5 text-gray-500" />
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Assignment</h3>
          </div>
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <User className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
              {simStatus.engineer}
            </span>
          </div>
        </div>
      )}

      {/* Source Information */}
      <details className="group">
        <summary className="flex items-center gap-1.5 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 -mx-1 px-1 py-1 rounded transition-colors">
          <ChevronRight className="h-3 w-3 text-gray-400 transition-transform group-open:rotate-90" />
          <FileSpreadsheet className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Data Source
          </span>
        </summary>
        <div className="pl-5 pt-2 space-y-1 text-[10px]">
          <div className="flex justify-between py-0.5">
            <span className="text-gray-500 dark:text-gray-400">File:</span>
            <span className="text-gray-900 dark:text-white font-mono truncate ml-2">
              {simStatus.sourceFile}
            </span>
          </div>
          {simStatus.sheetName && (
            <div className="flex justify-between py-0.5">
              <span className="text-gray-500 dark:text-gray-400">Sheet:</span>
              <span className="text-gray-900 dark:text-white font-mono">
                {simStatus.sheetName}
              </span>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
