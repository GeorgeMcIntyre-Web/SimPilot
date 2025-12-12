import { CheckCircle2, XCircle } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';

interface GroupedError {
  source: string;
  errors: Array<{
    message: string;
    sheet: string | null;
  }>;
}

interface ErrorsSectionProps {
  groupedErrors: GroupedError[];
  expandedSources: Set<string>;
  onToggleSource: (source: string) => void;
}

export function ErrorsSection({
  groupedErrors,
  expandedSources,
  onToggleSource,
}: ErrorsSectionProps) {
  const totalErrors = groupedErrors.reduce((sum, group) => sum + group.errors.length, 0);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          {totalErrors > 0 ? (
            <XCircle className="h-5 w-5 text-rose-500" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          )}
          Ingestion Errors & Warnings
          <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
            {totalErrors}
          </span>
        </h3>
      </div>

      <div className="p-6 max-h-[420px] overflow-y-auto custom-scrollbar">
        {totalErrors === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No errors found. Data ingestion is healthy!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedErrors.map((group) => (
              <CollapsibleSection
                key={group.source}
                title={group.source}
                count={group.errors.length}
                isExpanded={expandedSources.has(group.source)}
                onToggle={() => onToggleSource(group.source)}
              >
                <ul className="space-y-2">
                  {group.errors.map((error, idx) => (
                    <li
                      key={idx}
                      className="flex items-start text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="mr-2 text-rose-500 flex-shrink-0">•</span>
                      <div>
                        {error.sheet !== null && (
                          <span className="text-xs text-gray-400 mr-2">[{error.sheet}]</span>
                        )}
                        <span className="font-mono text-xs">{error.message}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
