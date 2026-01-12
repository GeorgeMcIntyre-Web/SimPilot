import { useState, useCallback } from 'react';
import { ingestFiles, IngestFilesResult, IngestFilesInput } from '../../ingestion/ingestionCoordinator';
import { useGlobalBusy } from '../../ui/GlobalBusyContext';
import { VersionComparisonResult } from '../../ingestion/versionComparison';
import { addImportHistoryEntry, buildImportHistoryEntry } from '../features/importHistory/importHistoryStore';
import { syncSimPilotStoreFromLocalData } from '../../domain/simPilotSnapshotBuilder';
import { log } from '../../lib/log';
import { saveSnapshot } from '../../storage/indexedDBStore';
import { coreStore } from '../../domain/coreStore';

export function useLocalFileIngest(hasData: boolean) {
  const [simulationFiles, setSimulationFiles] = useState<File[]>([]);
  const [equipmentFiles, setEquipmentFiles] = useState<File[]>([]);
  const [toolListFiles, setToolListFiles] = useState<File[]>([]);
  const [assembliesFiles, setAssembliesFiles] = useState<File[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [result, setResult] = useState<IngestFilesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { pushBusy, popBusy } = useGlobalBusy();

  // Version comparison state
  const [showVersionComparison, setShowVersionComparison] = useState(false);
  const [versionComparison, setVersionComparison] = useState<VersionComparisonResult | null>(null);
  const [pendingIngestInput, setPendingIngestInput] = useState<IngestFilesInput | null>(null);

  const addSimulationFiles = useCallback((files: File[]) => {
    setSimulationFiles(prev => [...prev, ...files]);
    setResult(null);
    setError(null);
  }, []);

  const addEquipmentFiles = useCallback((files: File[]) => {
    setEquipmentFiles(prev => [...prev, ...files]);
    setResult(null);
    setError(null);
  }, []);

  const addToolListFiles = useCallback((files: File[]) => {
    setToolListFiles(prev => [...prev, ...files]);
    setResult(null);
    setError(null);
  }, []);

  const addAssembliesFiles = useCallback((files: File[]) => {
    setAssembliesFiles(prev => [...prev, ...files]);
    setResult(null);
    setError(null);
  }, []);

  const handleIngest = async () => {
    if (simulationFiles.length === 0) {
      setError("At least one Simulation Status file is required.");
      return;
    }

    setIsIngesting(true);
    pushBusy('Ingesting local files...');
    setError(null);
    setResult(null);

    try {
      const allEquipmentFiles = [...equipmentFiles, ...toolListFiles, ...assembliesFiles];

      const input: IngestFilesInput = {
        simulationFiles,
        equipmentFiles: allEquipmentFiles,
        fileSources: {},
        dataSource: 'Local',
        previewOnly: hasData
      };

      simulationFiles.forEach(f => { if (input.fileSources) input.fileSources[f.name] = 'local' });
      allEquipmentFiles.forEach(f => { if (input.fileSources) input.fileSources[f.name] = 'local' });

      const res = await ingestFiles(input);

      if (hasData && res.versionComparison) {
        setVersionComparison(res.versionComparison);
        setPendingIngestInput(input);
        setShowVersionComparison(true);
      } else {
        setResult(res);
        addImportHistoryEntry(buildImportHistoryEntry(input, res, 'Local Files'));
        syncSimPilotStoreFromLocalData();

        // Save snapshot to IndexedDB
        try {
          const fileNames = simulationFiles.map(f => f.name);
          const snapshotTimestamp = await saveSnapshot(
            coreStore.getState(),
            fileNames,
            undefined // userNotes (optional)
          );
          log.info('Snapshot saved after local file import:', snapshotTimestamp);
        } catch (snapshotErr) {
          log.error('Failed to save snapshot after import:', snapshotErr);
          // Don't break the import flow if snapshot save fails
        }
      }
    } catch (err) {
      log.error('Local file ingestion error', err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during ingestion.");
    } finally {
      setIsIngesting(false);
      popBusy();
    }
  };

  const confirmVersionComparison = async () => {
    if (!pendingIngestInput) return;

    setIsIngesting(true);
    pushBusy('Applying changes...');
    setShowVersionComparison(false);

    try {
      const input = { ...pendingIngestInput, previewOnly: false };
      const res = await ingestFiles(input);
      setResult(res);
      setPendingIngestInput(null);
      setVersionComparison(null);
      addImportHistoryEntry(buildImportHistoryEntry(input, res, 'Local Files'));
      syncSimPilotStoreFromLocalData();

      // Save snapshot to IndexedDB
      try {
        const fileNames = input.simulationFiles.map(f => f.name);
        const snapshotTimestamp = await saveSnapshot(
          coreStore.getState(),
          fileNames,
          undefined
        );
        log.info('Snapshot saved after version comparison confirmation:', snapshotTimestamp);
      } catch (snapshotErr) {
        log.error('Failed to save snapshot after confirmation:', snapshotErr);
      }
    } catch (err) {
      log.error('Local file ingestion confirmation error', err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during ingestion.");
    } finally {
      setIsIngesting(false);
      popBusy();
    }
  };

  const cancelVersionComparison = () => {
    setShowVersionComparison(false);
    setPendingIngestInput(null);
    setVersionComparison(null);
    setIsIngesting(false);
  };

  const clearFiles = () => {
    setSimulationFiles([]);
    setEquipmentFiles([]);
    setToolListFiles([]);
    setAssembliesFiles([]);
    setResult(null);
    setError(null);
  };

  return {
    simulationFiles,
    equipmentFiles,
    toolListFiles,
    assembliesFiles,
    isIngesting,
    result,
    error,
    showVersionComparison,
    versionComparison,
    addSimulationFiles,
    addEquipmentFiles,
    addToolListFiles,
    addAssembliesFiles,
    handleIngest,
    confirmVersionComparison,
    cancelVersionComparison,
    clearFiles,
    setResult,
    setError
  };
}
