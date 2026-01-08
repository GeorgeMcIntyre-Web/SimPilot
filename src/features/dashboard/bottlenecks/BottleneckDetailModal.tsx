import { X } from 'lucide-react';
import type { WorkflowBottleneckStatus } from '../../../domain/workflowTypes';
import { formatReason, getSeverityStyle } from './bottleneckUtils';

interface BottleneckDetailModalProps {
  workflow: WorkflowBottleneckStatus | null;
  onClose: () => void;
}

export function BottleneckDetailModal({ workflow, onClose }: BottleneckDetailModalProps) {
  if (workflow === null) {
    return null;
  }

  const workflowItem = workflow.workflowItem;
  const parts = workflow.simulationContextKey.split('|');
  const program = parts[0] ?? 'UNKNOWN';
  const plant = parts[1] ?? 'UNKNOWN';
  const unit = parts[2] ?? 'UNKNOWN';
  const line = parts[3] ?? 'UNKNOWN';
  const station = parts[4] ?? 'UNKNOWN';
  const severityStyle = getSeverityStyle(workflow.severity);

  // Close on escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bottleneck Detail
            </h3>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${severityStyle}`}>
              {workflow.severity}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4 custom-scrollbar">
          {/* Primary Information */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Item Information
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <InfoField label="Item Number" value={workflow.itemNumber ?? workflow.workflowItemId} />
                {workflowItem?.name && <InfoField label="Name" value={workflowItem.name} />}
                {workflowItem?.equipmentNumber && (
                  <InfoField label="Equipment Number" value={workflowItem.equipmentNumber} />
                )}
                {workflowItem?.handedness && (
                  <InfoField label="Handedness" value={workflowItem.handedness} />
                )}
                <InfoField label="Kind" value={workflow.kind} />
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Location
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <InfoField label="Program" value={program} />
                <InfoField label="Plant" value={plant} />
                <InfoField label="Unit" value={unit} />
                <InfoField label="Line" value={line} />
                <InfoField label="Station" value={station} />
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Bottleneck Status
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                <InfoField label="Reason" value={formatReason(workflow.bottleneckReason)} />
                <InfoField label="Dominant Stage" value={workflow.dominantStage} />
                <InfoField label="Severity Score" value={workflow.severityScore.toString()} />
              </div>
            </div>

            {/* Stage Details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Stage Progress
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StageCard label="Design" snapshot={workflow.designStage} />
                <StageCard label="Simulation" snapshot={workflow.simulationStage} />
                <StageCard label="Manufacture" snapshot={workflow.manufactureStage} />
              </div>
            </div>

            {/* External Supplier */}
            {workflowItem?.externalSupplierName && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  External Supplier
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                  <InfoField label="Supplier Name" value={workflowItem.externalSupplierName} />
                </div>
              </div>
            )}

            {/* Additional Metadata */}
            {workflowItem?.metadata && Object.keys(workflowItem.metadata).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Additional Metadata
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                  {Object.entries(workflowItem.metadata).map(([key, value]) => (
                    <InfoField
                      key={key}
                      label={key}
                      value={value === undefined || value === null ? '—' : String(value)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface InfoFieldProps {
  label: string;
  value: string;
}

function InfoField({ label, value }: InfoFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm font-medium text-gray-900 dark:text-white text-right">
        {value}
      </span>
    </div>
  );
}

interface StageCardProps {
  label: string;
  snapshot: WorkflowBottleneckStatus['designStage'];
}

function StageCard({ label, snapshot }: StageCardProps) {
  const statusText =
    snapshot.status === 'BLOCKED'
      ? 'Blocked'
      : snapshot.status === 'CHANGES_REQUESTED'
        ? 'Changes Requested'
        : snapshot.status === 'IN_PROGRESS'
          ? 'In Progress'
          : snapshot.status === 'APPROVED'
            ? 'Approved'
            : snapshot.status === 'COMPLETE'
              ? 'Complete'
              : snapshot.status === 'NOT_STARTED'
                ? 'Not Started'
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
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${statusColor} mb-1`}>{statusText}</div>
      {typeof snapshot.percentComplete === 'number' && (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-full rounded-full ${
                snapshot.status === 'BLOCKED'
                  ? 'bg-rose-500'
                  : snapshot.status === 'COMPLETE'
                    ? 'bg-emerald-500'
                    : 'bg-blue-500'
              }`}
              style={{ width: `${snapshot.percentComplete}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {snapshot.percentComplete}%
          </span>
        </div>
      )}
      {snapshot.owner && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Owner: {snapshot.owner}
        </div>
      )}
    </div>
  );
}
