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
        ? 'Changes requested'
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
      ? 'text-rose-600'
      : snapshot.status === 'CHANGES_REQUESTED'
        ? 'text-amber-600'
        : snapshot.status === 'IN_PROGRESS'
          ? 'text-blue-600'
          : snapshot.status === 'APPROVED' || snapshot.status === 'COMPLETE'
            ? 'text-emerald-600'
            : 'text-gray-500';

  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800 p-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold ${statusColor}`}>
        {statusText}
        {typeof snapshot.percentComplete === 'number' ? ` • ${snapshot.percentComplete}%` : ''}
      </p>
      {snapshot.owner !== undefined && (
        <p className="text-xs text-gray-500 dark:text-gray-400">Owner: {snapshot.owner}</p>
      )}
    </div>
  );
}
