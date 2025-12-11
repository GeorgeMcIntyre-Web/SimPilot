import type { WorkflowBottleneckStatus } from '../../../domain/workflowTypes';
import { formatReason } from './bottleneckUtils';

interface WorkflowDetailDrawerProps {
  workflow: WorkflowBottleneckStatus | null;
  onClose: () => void;
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100 text-right">{value}</span>
    </div>
  );
}

export function WorkflowDetailDrawer({ workflow, onClose }: WorkflowDetailDrawerProps) {
  if (workflow === null) {
    return null;
  }

  const workflowItem = workflow.workflowItem;
  const parts = workflow.simulationContextKey.split('|');
  const program = parts[0] ?? 'UNKNOWN';
  const station = parts[4] ?? 'UNKNOWN';

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white dark:bg-gray-900 h-full p-6 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Workflow Item Detail
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <InfoRow label="Item number" value={workflow.itemNumber ?? workflow.workflowItemId} />
          <InfoRow label="Kind" value={workflow.kind} />
          <InfoRow label="Station" value={station} />
          <InfoRow label="Program" value={program} />
          <InfoRow label="Dominant stage" value={workflow.dominantStage} />
          <InfoRow label="Bottleneck reason" value={formatReason(workflow.bottleneckReason)} />
          <InfoRow label="Severity" value={workflow.severity} />
        </div>

        <div className="mt-6 space-y-3">
          <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Item metadata</h5>
          {workflowItem !== undefined ? (
            <div className="space-y-2">
              {workflowItem.name !== undefined && <InfoRow label="Name" value={workflowItem.name} />}
              {workflowItem.equipmentNumber !== undefined && (
                <InfoRow label="Equipment #" value={workflowItem.equipmentNumber} />
              )}
              {workflowItem.handedness !== undefined && (
                <InfoRow label="Handedness" value={workflowItem.handedness} />
              )}
              {workflowItem.externalSupplierName !== undefined && (
                <InfoRow label="Supplier" value={workflowItem.externalSupplierName} />
              )}
              {workflowItem.metadata !== undefined &&
                Object.entries(workflowItem.metadata).map(([key, value]) => (
                  <InfoRow
                    key={key}
                    label={key}
                    value={value === undefined || value === null ? '—' : String(value)}
                  />
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No detailed workflow item metadata available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
