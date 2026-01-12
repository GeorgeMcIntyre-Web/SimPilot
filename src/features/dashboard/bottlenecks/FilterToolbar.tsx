import { Filter } from 'lucide-react';
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
    <div className="space-y-3 pb-1 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGE_FILTERS.map((stage) => {
          const isActive = stageFilter === stage;
          const base = 'px-3 py-1 rounded-md text-xs font-medium border transition-colors';
          const activeStyle = 'bg-indigo-600 text-white border-indigo-600';
          const inactiveStyle =
            'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800';
          return (
            <button
              key={stage}
              type="button"
              onClick={() => onStageChange(stage)}
              className={`${base} ${isActive ? activeStyle : inactiveStyle}`}
            >
              {stage === 'ALL' ? 'All' : stage.charAt(0) + stage.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {reasons.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
            <Filter className="h-3.5 w-3.5" />
            Reason
            {reasonFilter.length > 0 && (
              <button
                type="button"
                onClick={onClearReasons}
                className="text-indigo-600 dark:text-indigo-400 underline hover:no-underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((reason) => {
              const isActive = reasonFilter.includes(reason.value);
              const base =
                'px-2 py-0.5 rounded text-xs font-medium border transition-colors flex items-center gap-1';
              const activeStyle =
                'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800';
              const inactiveStyle =
                'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800';
              return (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() => onReasonToggle(reason.value)}
                  className={`${base} ${isActive ? activeStyle : inactiveStyle}`}
                >
                  {reason.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
