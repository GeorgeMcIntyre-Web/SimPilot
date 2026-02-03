import { useState, useEffect } from 'react';
import { Loader2, FileSpreadsheet, CheckCircle, Database, Link2 } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';

interface IngestionProgressProps {
  isIngesting: boolean;
  fileCount: number;
}

type IngestionStage = 'reading' | 'parsing' | 'processing' | 'linking' | 'saving';

interface StageInfo {
  id: IngestionStage;
  label: string;
  icon: React.ReactNode;
  duration: number; // estimated duration in ms
}

const stages: StageInfo[] = [
  { id: 'reading', label: 'Reading files', icon: <FileSpreadsheet className="w-4 h-4" />, duration: 1000 },
  { id: 'parsing', label: 'Parsing Excel data', icon: <FileSpreadsheet className="w-4 h-4" />, duration: 2000 },
  { id: 'processing', label: 'Processing entities', icon: <Database className="w-4 h-4" />, duration: 1500 },
  { id: 'linking', label: 'Linking assets', icon: <Link2 className="w-4 h-4" />, duration: 1000 },
  { id: 'saving', label: 'Saving snapshot', icon: <Database className="w-4 h-4" />, duration: 500 },
];

export function IngestionProgress({ isIngesting, fileCount }: IngestionProgressProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isIngesting) {
      setCurrentStageIndex(0);
      setProgress(0);
      return;
    }

    // Simulate progress through stages
    let stageIndex = 0;
    let progressValue = 0;
    const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);

    const interval = setInterval(() => {
      progressValue += 2;
      const currentProgress = Math.min(progressValue, 95); // Cap at 95% until complete
      setProgress(currentProgress);

      // Calculate which stage we're in based on progress
      let cumulativeDuration = 0;
      for (let i = 0; i < stages.length; i++) {
        cumulativeDuration += stages[i].duration;
        const stageProgress = (cumulativeDuration / totalDuration) * 100;
        if (currentProgress < stageProgress) {
          stageIndex = i;
          break;
        }
        stageIndex = i;
      }
      setCurrentStageIndex(stageIndex);
    }, 100);

    return () => clearInterval(interval);
  }, [isIngesting]);

  if (!isIngesting) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Loader2 className="w-6 h-6 text-gray-600 dark:text-gray-400 animate-spin" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Processing {fileCount} file{fileCount !== 1 ? 's' : ''}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Please wait while we import your data...
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{stages[currentStageIndex]?.label || 'Processing...'}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gray-600 to-gray-700 dark:from-gray-400 dark:to-gray-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="flex items-center justify-between">
        {stages.map((stage, idx) => {
          const isCompleted = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;

          return (
            <div key={stage.id} className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                isCompleted
                  ? "bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900"
                  : isCurrent
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ring-2 ring-gray-500 dark:ring-gray-400 ring-offset-2 dark:ring-offset-gray-800"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-400"
              )}>
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  stage.icon
                )}
              </div>
              <span className={cn(
                "mt-1 text-xs whitespace-nowrap",
                isCurrent
                  ? "text-gray-700 dark:text-gray-300 font-medium"
                  : isCompleted
                    ? "text-gray-600 dark:text-gray-400"
                    : "text-gray-400"
              )}>
                {stage.label.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Subtle animation indicator */}
      <div className="mt-4 flex justify-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline loading indicator for buttons and small spaces
 */
export function InlineProgress({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      {label && <span>{label}</span>}
    </span>
  );
}
