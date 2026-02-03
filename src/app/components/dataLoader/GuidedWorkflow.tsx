import { useState } from 'react';
import {
  Upload,
  FileCheck,
  Play,
  CheckCircle2,
  ChevronRight,
  X,
  Sparkles,
  FolderOpen,
  Eye
} from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import { getUserPreference, setUserPreference } from '../../../utils/prefsStorage';

interface GuidedWorkflowProps {
  hasFiles: boolean;
  hasData: boolean;
  isIngesting: boolean;
  onStartUpload: () => void;
  onLoadDemo: () => void;
}

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'current' | 'completed';
  action?: {
    label: string;
    onClick: () => void;
  };
}

const PREF_KEY = 'simpilot.dataloader.hideGuidedWorkflow';

export function GuidedWorkflow({
  hasFiles,
  hasData,
  isIngesting,
  onStartUpload,
  onLoadDemo
}: GuidedWorkflowProps) {
  const [dismissed, setDismissed] = useState(() =>
    getUserPreference(PREF_KEY, false) as boolean
  );

  // Don't show if user has dismissed or already has data
  if (dismissed || hasData) {
    return null;
  }

  const handleDismiss = () => {
    setUserPreference(PREF_KEY, true);
    setDismissed(true);
  };

  const steps: WorkflowStep[] = [
    {
      id: 1,
      title: 'Select Files',
      description: 'Choose Excel files to import',
      icon: <Upload className="w-5 h-5" />,
      status: hasFiles ? 'completed' : 'current',
      action: !hasFiles ? {
        label: 'Browse Files',
        onClick: onStartUpload
      } : undefined
    },
    {
      id: 2,
      title: 'Review & Load',
      description: isIngesting ? 'Processing files...' : 'Verify selections and import',
      icon: <FileCheck className="w-5 h-5" />,
      status: hasFiles ? 'current' : 'pending'
    },
    {
      id: 3,
      title: 'Explore Data',
      description: 'View dashboard and reports',
      icon: <Eye className="w-5 h-5" />,
      status: 'pending'
    }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-800/50 dark:via-gray-800 dark:to-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-200/30 to-gray-300/20 dark:from-gray-600/20 dark:to-gray-700/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-200/30 to-gray-300/20 dark:from-gray-600/20 dark:to-gray-700/10 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
        title="Dismiss getting started guide"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
            <Sparkles className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Getting Started
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Follow these steps to import your simulation data
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-start gap-4 mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1 relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute top-5 left-[calc(50%+20px)] w-[calc(100%-40px)] h-0.5">
                  <div className={cn(
                    "h-full rounded-full transition-colors",
                    step.status === 'completed'
                      ? "bg-gray-600 dark:bg-gray-400"
                      : "bg-gray-200 dark:bg-gray-700"
                  )} />
                </div>
              )}

              <div className="flex flex-col items-center text-center">
                {/* Step circle */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all",
                  step.status === 'completed'
                    ? "bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900"
                    : step.status === 'current'
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ring-2 ring-gray-500 dark:ring-gray-400 ring-offset-2 dark:ring-offset-gray-800"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                )}>
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Step info */}
                <h4 className={cn(
                  "text-sm font-medium mb-0.5",
                  step.status === 'pending'
                    ? "text-gray-400 dark:text-gray-500"
                    : "text-gray-900 dark:text-gray-100"
                )}>
                  {step.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {step.description}
                </p>

                {/* Step action */}
                {step.action && (
                  <button
                    onClick={step.action.onClick}
                    className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:bg-gray-900 dark:hover:bg-gray-300 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    {step.action.label}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Demo Option */}
        <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
              <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Want to explore first?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Load demo data to see SimPilot in action
              </p>
            </div>
          </div>
          <button
            onClick={onLoadDemo}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:bg-gray-900 dark:hover:bg-gray-300 transition-colors"
          >
            Load Demo
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
