import { ExternalLink } from 'lucide-react';
import type { WorkflowBottleneckStatus } from '../../../domain/workflowTypes';
import { getSeverityStyle, formatReason } from './bottleneckUtils';

interface BottleneckTableProps {
  bottlenecks: WorkflowBottleneckStatus[];
  onOpenSimulation: (status: WorkflowBottleneckStatus) => void;
  onOpenDetail: (status: WorkflowBottleneckStatus) => void;
}

export function BottleneckTable({ bottlenecks, onOpenSimulation, onOpenDetail }: BottleneckTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="overflow-x-auto max-h-[560px] overflow-y-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm sm:pl-6">
                <span className="font-semibold text-gray-900 dark:text-white">Severity</span>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">Item</span>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">Location</span>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">Reason</span>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">Design</span>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">Simulation</span>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">Manufacture</span>
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm">
                <span className="font-semibold text-gray-900 dark:text-white">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {bottlenecks.map((status) => {
              const severityStyle = getSeverityStyle(status.severity);
              const parts = status.simulationContextKey.split('|');
              const program = parts[0] ?? 'UNKNOWN';
              const station = parts[4] ?? 'UNKNOWN';
              const itemNumber = status.itemNumber ?? status.workflowItemId;
              const handedness = status.workflowItem?.handedness;

              return (
                <tr
                  key={status.workflowItemId}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6 text-xs">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${severityStyle}`}>
                    {status.severity}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <div className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                    {itemNumber}
                  </div>
                  {handedness && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{handedness}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <div className="font-medium text-gray-900 dark:text-white">{station}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{program}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {formatReason(status.bottleneckReason)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <StageCell snapshot={status.designStage} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <StageCell snapshot={status.simulationStage} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <StageCell snapshot={status.manufactureStage} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenSimulation(status)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                      title="Open Station in Simulation"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(status)}
                      className="inline-flex items-center px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs font-medium hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      title="Open Item Detail"
                    >
                      Detail
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface StageCellProps {
  snapshot: WorkflowBottleneckStatus['designStage'];
}

function StageCell({ snapshot }: StageCellProps) {
  const statusText =
    snapshot.status === 'BLOCKED'
      ? 'Blocked'
      : snapshot.status === 'CHANGES_REQUESTED'
        ? 'Changes'
        : snapshot.status === 'IN_PROGRESS'
          ? 'In progress'
          : snapshot.status === 'APPROVED'
            ? 'Approved'
            : snapshot.status === 'COMPLETE'
              ? 'Complete'
              : snapshot.status === 'NOT_STARTED'
                ? 'Not started'
                : 'Unknown';

  const statusColor =
    snapshot.status === 'BLOCKED'
      ? 'text-rose-600 dark:text-rose-400'
      : snapshot.status === 'CHANGES_REQUESTED'
        ? 'text-amber-600 dark:text-amber-400'
        : snapshot.status === 'IN_PROGRESS'
          ? 'text-blue-600 dark:text-blue-400'
          : snapshot.status === 'APPROVED' || snapshot.status === 'COMPLETE'
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-gray-500 dark:text-gray-400';

  return (
    <div>
      <div className={`font-medium ${statusColor} text-xs truncate`}>
        {statusText}
      </div>
      {typeof snapshot.percentComplete === 'number' && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {snapshot.percentComplete}%
        </div>
      )}
    </div>
  );
}
