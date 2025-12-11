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
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${severityStyle}`}
            >
              {status.severity} severity
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatReason(status.bottleneckReason)}
            </span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {itemNumber}
            {handedness !== undefined ? ` • ${handedness}` : ''}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Station {station} · {program}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={onOpenSimulation}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Open Station in Simulation
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-400 transition-colors"
          >
            Open Item Detail
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <StagePill label="Design" snapshot={status.designStage} />
        <StagePill label="Simulation" snapshot={status.simulationStage} />
        <StagePill label="Manufacture" snapshot={status.manufactureStage} />
      </div>

      <div className="text-xs text-gray-400">
        Dominant stage: {status.dominantStage} · Score {status.severityScore} · Kind: {status.kind}
      </div>
    </div>
  );
}
