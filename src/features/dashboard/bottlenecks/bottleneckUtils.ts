import type { WorkflowBottleneckReason } from '../../../domain/workflowTypes';

export function getSeverityStyle(severity: string): string {
  const upper = severity.toUpperCase();

  if (upper === 'CRITICAL' || upper === 'HIGH') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200';
  }
  if (upper === 'MEDIUM') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200';
  }
  if (upper === 'LOW') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200';
  }
  if (upper === 'OK') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200';
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-200';
}

export function formatReason(reason: WorkflowBottleneckReason): string {
  return reason
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
