import { Filter, SlidersHorizontal } from 'lucide-react';
import type { WorkflowStage, WorkflowBottleneckReason } from '../../../domain/workflowTypes';

const STAGE_FILTERS: ReadonlyArray<WorkflowStage | 'ALL'> = [
  'ALL',
  'DESIGN',
  'SIMULATION',
  'MANUFACTURE',
  'EXTERNAL_SUPPLIER',
  'UNKNOWN',
] as const;

interface ReasonOption {
  value: WorkflowBottleneckReason;
  label: string;
}

interface FilterToolbarProps {
  stageFilter: WorkflowStage | 'ALL';
  onStageChange: (stage: WorkflowStage | 'ALL') => void;
  reasonFilter: WorkflowBottleneckReason[];
  onReasonToggle: (reason: WorkflowBottleneckReason) => void;
  onClearReasons: () => void;
  reasons: ReasonOption[];
}

export function FilterToolbar({
  stageFilter,
  onStageChange,
  reasonFilter,
  onReasonToggle,
  onClearReasons,
  reasons,
}: FilterToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STAGE_FILTERS.map((stage) => {
          const isActive = stageFilter === stage;
          const base = 'px-4 py-2 rounded-full text-sm font-medium border transition-colors';
          const activeStyle = 'bg-indigo-600 text-white border-indigo-600';
          const inactiveStyle =
            'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400';
          return (
            <button
              key={stage}
              type="button"
              onClick={() => onStageChange(stage)}
              className={`${base} ${isActive ? activeStyle : inactiveStyle}`}
            >
              {stage === 'ALL' ? 'All stages' : stage.charAt(0) + stage.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <Filter className="h-4 w-4" />
          Filter by bottleneck reason
          {reasonFilter.length > 0 && (
            <button
              type="button"
              onClick={onClearReasons}
              className="text-indigo-600 dark:text-indigo-300 text-xs underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {reasons.length === 0 && (
            <span className="text-sm text-gray-400">No reasons available in this snapshot.</span>
          )}
          {reasons.map((reason) => {
            const isActive = reasonFilter.includes(reason.value);
            const base =
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1';
            const activeStyle =
              'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800';
            const inactiveStyle =
              'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-purple-400';
            return (
              <button
                key={reason.value}
                type="button"
                onClick={() => onReasonToggle(reason.value)}
                className={`${base} ${isActive ? activeStyle : inactiveStyle}`}
              >
                <SlidersHorizontal className="h-3 w-3" />
                {reason.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
