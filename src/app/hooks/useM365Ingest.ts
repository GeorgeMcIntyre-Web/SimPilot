import { useState } from 'react';
import { ingestFiles, IngestFilesResult, IngestFilesInput } from '../../ingestion/ingestionCoordinator';
import { useGlobalBusy } from '../../ui/GlobalBusyContext';
import { listExcelFilesInConfiguredFolder, downloadFileAsBlob, blobToFile, MsExcelFileItem } from '../../integrations/ms/msGraphClient';
import { VersionComparisonResult } from '../../ingestion/versionComparison';

export function useM365Ingest(hasData: boolean) {
  const [m365Items, setM365Items] = useState<MsExcelFileItem[]>([]);
  const [selectedSimIds, setSelectedSimIds] = useState<string[]>([]);
  const [selectedEqIds, setSelectedEqIds] = useState<string[]>([]);
  const [isLoadingM365, setIsLoadingM365] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [m365Error, setM365Error] = useState<string | null>(null);
  const [result, setResult] = useState<IngestFilesResult | null>(null);
  const { pushBusy, popBusy } = useGlobalBusy();

  // Version comparison state
  const [showVersionComparison, setShowVersionComparison] = useState(false);
  const [versionComparison, setVersionComparison] = useState<VersionComparisonResult | null>(null);
  const [pendingIngestInput, setPendingIngestInput] = useState<IngestFilesInput | null>(null);

  const refreshM365Files = async () => {
    setIsLoadingM365(true);
    pushBusy('Listing SharePoint files...');
    setM365Error(null);
    try {
      const files = await listExcelFilesInConfiguredFolder();
      if (files.length === 0) {
        setM365Error("No Excel files found in the configured SharePoint folder.");
      }
      setM365Items(files);
    } catch (e) {
      setM365Error("Failed to list files from Microsoft 365.");
    } finally {
      setIsLoadingM365(false);
      popBusy();
    }
  };

  const handleIngest = async () => {
    if (selectedSimIds.length === 0 && selectedEqIds.length === 0) {
      setM365Error("Please select at least one file to load.");
      return;
    }

    setIsIngesting(true);
    pushBusy('Downloading & Ingesting M365 files...');
    setM365Error(null);
    setResult(null);

    try {
      const simBlobsAsFiles: File[] = [];
      const eqBlobsAsFiles: File[] = [];
      const fileSources: Record<string, 'local' | 'remote'> = {};

      for (const id of selectedSimIds) {
        const item = m365Items.find(i => i.id === id);
        if (item) {
          const blob = await downloadFileAsBlob(id);
          if (blob) {
            const file = blobToFile(blob, item.name);
            simBlobsAsFiles.push(file);
            fileSources[file.name] = 'remote';
          }
        }
      }

      for (const id of selectedEqIds) {
        const item = m365Items.find(i => i.id === id);
        if (item) {
          const blob = await downloadFileAsBlob(id);
          if (blob) {
            const file = blobToFile(blob, item.name);
            eqBlobsAsFiles.push(file);
            fileSources[file.name] = 'remote';
          }
        }
      }

      if (simBlobsAsFiles.length === 0) {
        throw new Error("Failed to download any simulation files.");
      }

      const input: IngestFilesInput = {
        simulationFiles: simBlobsAsFiles,
        equipmentFiles: eqBlobsAsFiles,
        fileSources,
        dataSource: 'MS365',
        previewOnly: hasData
      };

      const res = await ingestFiles(input);

      if (hasData && res.versionComparison) {
        setVersionComparison(res.versionComparison);
        setPendingIngestInput(input);
        setShowVersionComparison(true);
      } else {
        setResult(res);
      }

    } catch (err) {
      console.error(err);
      setM365Error(err instanceof Error ? err.message : "An unknown error occurred during M365 ingestion.");
    } finally {
      setIsIngesting(false);
      popBusy();
    }
  };

  const toggleSelection = (id: string, type: 'sim' | 'eq') => {
    if (type === 'sim') {
      if (selectedSimIds.includes(id)) {
        setSelectedSimIds(prev => prev.filter(i => i !== id));
      } else {
        setSelectedSimIds(prev => [...prev, id]);
        setSelectedEqIds(prev => prev.filter(i => i !== id));
      }
    } else {
      if (selectedEqIds.includes(id)) {
        setSelectedEqIds(prev => prev.filter(i => i !== id));
      } else {
        setSelectedEqIds(prev => [...prev, id]);
        setSelectedSimIds(prev => prev.filter(i => i !== id));
      }
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
    } catch (err) {
      console.error(err);
      setM365Error(err instanceof Error ? err.message : "An unknown error occurred during ingestion.");
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

  return {
    m365Items,
    selectedSimIds,
    selectedEqIds,
    isLoadingM365,
    isIngesting,
    m365Error,
    result,
    showVersionComparison,
    versionComparison,
    refreshM365Files,
    handleIngest,
    toggleSelection,
    confirmVersionComparison,
    cancelVersionComparison,
    setResult,
    setM365Error
  };
}
