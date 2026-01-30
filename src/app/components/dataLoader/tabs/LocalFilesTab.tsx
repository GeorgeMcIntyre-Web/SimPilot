import { AlertTriangle } from 'lucide-react';
import { FileDropzone } from '../FileDropzone';

interface LocalFilesTabProps {
  simulationFiles: File[];
  equipmentFiles: File[];
  toolListFiles: File[];
  assembliesFiles: File[];
  onSimulationFilesAdded: (files: File[]) => void;
  onEquipmentFilesAdded: (files: File[]) => void;
  onToolListFilesAdded: (files: File[]) => void;
  onAssembliesFilesAdded: (files: File[]) => void;
  error: string | null;
  isIngesting: boolean;
  onIngest: () => void;
}

export function LocalFilesTab({
  simulationFiles,
  equipmentFiles,
  toolListFiles,
  assembliesFiles,
  onSimulationFilesAdded,
  onEquipmentFilesAdded,
  onToolListFilesAdded,
  onAssembliesFilesAdded,
  error,
  isIngesting,
  onIngest
}: LocalFilesTabProps) {
  return (
    <div className="space-y-6">
      <FileDropzone
        label="Simulation Status Files (Optional)"
        files={simulationFiles}
        onFilesAdded={onSimulationFilesAdded}
        placeholder="Drag & drop simulation files here, or click to select"
        testId="local-simulation-input"
      />

      <FileDropzone
        label="Robot Equipment List (Optional)"
        files={equipmentFiles}
        onFilesAdded={onEquipmentFilesAdded}
        placeholder="Robotlist_*.xlsx"
        testId="local-equipment-input"
      />

      <FileDropzone
        label="Tool List (Optional)"
        files={toolListFiles}
        onFilesAdded={onToolListFilesAdded}
        placeholder="STLA_S_ZAR Tool List.xlsx"
        testId="local-toollist-input"
      />

      <FileDropzone
        label="Assemblies List (Optional)"
        files={assembliesFiles}
        onFilesAdded={onAssembliesFilesAdded}
        placeholder="J11006_TMS_STLA_S_*_Assemblies_List.xlsm"
        testId="local-assemblies-input"
      />

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="typography-body-strong text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-2 typography-body text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onIngest}
          disabled={isIngesting || (simulationFiles.length === 0 && equipmentFiles.length === 0 && toolListFiles.length === 0 && assembliesFiles.length === 0)}
          data-testid="local-ingest-button"
          data-testid-ingest="ingest-files-button"
          className="inline-flex items-center px-4 py-2 border border-transparent typography-body-strong rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isIngesting ? 'Processing...' : 'Parse & Load Local Files'}
        </button>
      </div>
    </div>
  );
}
