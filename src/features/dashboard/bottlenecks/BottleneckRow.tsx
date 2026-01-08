import { ExternalLink } from 'lucide-react';
import type { WorkflowBottleneckStatus } from '../../../domain/workflowTypes';
import { StagePill } from './StagePill';
import { getSeverityStyle, formatReason } from './bottleneckUtils';

interface BottleneckRowProps {
  status: WorkflowBottleneckStatus;
  onOpenSimulation: () => void;
  onOpenDetail: () => void;
}

export function BottleneckRow({ status, onOpenSimulation, onOpenDetail }: BottleneckRowProps) {
  const severityStyle = getSeverityStyle(status.severity);

  // Extract location info from context key (format: Program|Plant|Unit|Line|Station)
  const parts = status.simulationContextKey.split('|');
  const program = parts[0] ?? 'UNKNOWN';
  const station = parts[4] ?? 'UNKNOWN';

  // Get item display info
  const itemNumber = status.itemNumber ?? status.workflowItemId;
  const workflowItem = status.workflowItem;
  const handedness = workflowItem?.handedness;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2.5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${severityStyle}`}
            >
              {status.severity}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {formatReason(status.bottleneckReason)}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {itemNumber}
            {handedness !== undefined ? ` • ${handedness}` : ''}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {station} • {program}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs lg:flex-nowrap">
          <button
            type="button"
            onClick={onOpenSimulation}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            <ExternalLink className="h-3 w-3" />
            Simulation
          </button>
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            Detail
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <StagePill label="Design" snapshot={status.designStage} />
        <StagePill label="Simulation" snapshot={status.simulationStage} />
        <StagePill label="Manufacture" snapshot={status.manufactureStage} />
      </div>
    </div>
  );
}
