import { useState } from 'react';
import { ChevronDown, ChevronRight, FileSpreadsheet, X, Upload, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { FileDropzone } from '../FileDropzone';
import { cn } from '../../../../ui/lib/utils';
import { detectFileType, getFileTypeColor, getFileTypeLabel } from '../utils/fileTypeDetection';
import { ErrorDisplay } from '../ErrorDisplay';
import { IngestionProgress } from '../IngestionProgress';

interface LocalFilesTabProps {
  simulationFiles: File[];
  equipmentFiles: File[];
  toolListFiles: File[];
  assembliesFiles: File[];
  importedFiles?: string[];
  onSimulationFilesAdded: (files: File[]) => void;
  onEquipmentFilesAdded: (files: File[]) => void;
  onToolListFilesAdded: (files: File[]) => void;
  onAssembliesFilesAdded: (files: File[]) => void;
  error: string | null;
  isIngesting: boolean;
  onIngest: () => void;
}

interface FileCategory {
  id: string;
  label: string;
  description: string;
  files: File[];
  onFilesAdded: (files: File[]) => void;
  onClear: () => void;
  placeholder: string;
  testId: string;
}

function CollapsibleFileSection({
  category,
  isExpanded,
  onToggle,
}: {
  category: FileCategory;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasFiles = category.files.length > 0;

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-colors",
      hasFiles
        ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10"
        : "border-gray-200 dark:border-gray-700"
    )}>
      {/* Header - always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <FileSpreadsheet className={cn(
            "w-5 h-5",
            hasFiles ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"
          )} />
          <div className="text-left">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {category.label}
            </span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              {category.description}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasFiles && (
            <>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                {category.files.length} file{category.files.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  category.onClear();
                }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Clear files"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800/50">
          <FileDropzone
            label=""
            files={category.files}
            onFilesAdded={category.onFilesAdded}
            placeholder={category.placeholder}
            testId={category.testId}
            compact
          />
        </div>
      )}

      {/* Collapsed file list preview with type detection */}
      {!isExpanded && hasFiles && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex flex-wrap gap-2">
            {category.files.map((file, idx) => {
              const detection = detectFileType(file.name);
              const colors = getFileTypeColor(detection.type);
              const isCorrectCategory = detection.suggestedCategory === category.id;

              return (
                <span
                  key={idx}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded border",
                    isCorrectCategory
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                  )}
                  title={isCorrectCategory ? detection.description : `Warning: This looks like a ${getFileTypeLabel(detection.type)} file`}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  {detection.confidence === 'high' && isCorrectCategory && (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  )}
                  {!isCorrectCategory && detection.type !== 'Unknown' && (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {detection.type === 'Unknown' && (
                    <HelpCircle className="w-3 h-3" />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function LocalFilesTab({
  simulationFiles,
  equipmentFiles,
  toolListFiles,
  assembliesFiles,
  importedFiles = [],
  onSimulationFilesAdded,
  onEquipmentFilesAdded,
  onToolListFilesAdded,
  onAssembliesFilesAdded,
  error,
  isIngesting,
  onIngest
}: LocalFilesTabProps) {
  // Track which sections are expanded - default to expanding sections without files
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (simulationFiles.length === 0) initial.add('simulation');
    if (equipmentFiles.length === 0 && simulationFiles.length === 0) initial.add('equipment');
    return initial;
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const categories: FileCategory[] = [
    {
      id: 'simulation',
      label: 'Simulation Status',
      description: 'Station progress & metrics',
      files: simulationFiles,
      onFilesAdded: onSimulationFilesAdded,
      onClear: () => onSimulationFilesAdded([]),
      placeholder: 'Drag & drop simulation status files (.xlsx, .xlsm)',
      testId: 'local-simulation-input',
    },
    {
      id: 'equipment',
      label: 'Robot Equipment List',
      description: 'Robot inventory & specs',
      files: equipmentFiles,
      onFilesAdded: onEquipmentFilesAdded,
      onClear: () => onEquipmentFilesAdded([]),
      placeholder: 'Robotlist_*.xlsx',
      testId: 'local-equipment-input',
    },
    {
      id: 'toollist',
      label: 'Tool List',
      description: 'Tool inventory',
      files: toolListFiles,
      onFilesAdded: onToolListFilesAdded,
      onClear: () => onToolListFilesAdded([]),
      placeholder: 'STLA_S_ZAR Tool List.xlsx',
      testId: 'local-toollist-input',
    },
    {
      id: 'assemblies',
      label: 'Assemblies List',
      description: 'Assembly configurations',
      files: assembliesFiles,
      onFilesAdded: onAssembliesFilesAdded,
      onClear: () => onAssembliesFilesAdded([]),
      placeholder: 'J11006_TMS_STLA_S_*_Assemblies_List.xlsm',
      testId: 'local-assemblies-input',
    },
  ];

  const totalFiles = simulationFiles.length + equipmentFiles.length + toolListFiles.length + assembliesFiles.length;
  const hasFiles = totalFiles > 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {hasFiles ? (
              <>
                <span className="font-medium text-gray-900 dark:text-gray-100">{totalFiles}</span> file{totalFiles !== 1 ? 's' : ''} selected
              </>
            ) : (
              'Select files to import'
            )}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          All file types are optional
        </span>
      </div>

      {/* Last imported files (persisted) */}
      {importedFiles.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
          <div className="typography-caption text-gray-600 dark:text-gray-300 mb-2">Last imported files</div>
          <div className="flex flex-wrap gap-2">
            {importedFiles.map((file) => (
              <span
                key={file}
                className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-1 text-xs text-gray-800 dark:text-gray-100"
                title={file}
              >
                {file}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible file sections */}
      <div className="space-y-2">
        {categories.map(category => (
          <CollapsibleFileSection
            key={category.id}
            category={category}
            isExpanded={expandedSections.has(category.id)}
            onToggle={() => toggleSection(category.id)}
          />
        ))}
      </div>

      {/* Ingestion Progress */}
      {isIngesting && (
        <IngestionProgress isIngesting={isIngesting} fileCount={totalFiles} />
      )}

      {/* Error display with actionable suggestions */}
      {error && !isIngesting && (
        <ErrorDisplay
          error={error}
          onRetry={hasFiles ? onIngest : undefined}
        />
      )}

      {/* Action button */}
      {!isIngesting && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onIngest}
            disabled={isIngesting || !hasFiles}
            data-testid="local-ingest-button"
            data-testid-ingest="ingest-files-button"
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent typography-body-strong rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            Parse & Load Local Files
          </button>
        </div>
      )}
    </div>
  );
}
