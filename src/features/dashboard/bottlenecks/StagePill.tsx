import type { WorkflowBottleneckStatus } from '../../../domain/workflowTypes';

interface StagePillProps {
  label: string;
  snapshot: WorkflowBottleneckStatus['designStage'];
}

export function StagePill({ label, snapshot }: StagePillProps) {
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
    <div className="rounded bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 p-2">
      <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-xs font-semibold ${statusColor} truncate`}>
        {statusText}
        {typeof snapshot.percentComplete === 'number' ? ` ${snapshot.percentComplete}%` : ''}
      </p>
    </div>
  );
}
