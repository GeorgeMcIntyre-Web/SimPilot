import { AlertTriangle } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import type {
  WorkflowStage,
  BottleneckReason,
  BottleneckSeverity,
} from '../../../domain/toolingBottleneckStore';
import { getBottleneckReasonLabel } from '../../../domain/toolingBottleneckLabels';

type BottleneckBadgeInfo = {
  label: string;
  subLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
};

function getBottleneckBadgeInfo(
  stage: WorkflowStage,
  reason: BottleneckReason,
  severity: BottleneckSeverity
): BottleneckBadgeInfo {
  const palette =
    severity === 'critical'
      ? {
          color: 'text-red-700 dark:text-red-300',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          borderColor: 'border-red-200 dark:border-red-800',
        }
      : severity === 'warning'
        ? {
            color: 'text-amber-700 dark:text-amber-300',
            bgColor: 'bg-amber-100 dark:bg-amber-900/30',
            borderColor: 'border-amber-200 dark:border-amber-800',
          }
        : {
            color: 'text-blue-700 dark:text-blue-300',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
            borderColor: 'border-blue-200 dark:border-blue-800',
          };

  const reasonInfo = getBottleneckReasonLabel(reason);

  return {
    label: `Blocked (${stage})`,
    subLabel: reasonInfo.shortLabel,
    ...palette,
  };
}

type BottleneckBadgeProps = {
  stage: WorkflowStage;
  reason: BottleneckReason;
  severity: BottleneckSeverity;
  className?: string;
};

export function BottleneckBadge({ stage, reason, severity, className }: BottleneckBadgeProps) {
  const info = getBottleneckBadgeInfo(stage, reason, severity);

  return (
    <span
      className={cn(
        'inline-flex flex-col rounded-lg border px-2 py-1 text-[11px] font-semibold leading-tight whitespace-nowrap',
        info.bgColor,
        info.color,
        info.borderColor,
        className
      )}
      title={getBottleneckReasonLabel(reason).description}
    >
      <span className="inline-flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {info.label}
      </span>
      <span className="text-[10px] font-medium tracking-wide opacity-80">{info.subLabel}</span>
    </span>
  );
}
