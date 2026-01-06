import { useState, useEffect } from 'react';
import { DEMO_SCENARIOS, loadDemoScenario, DemoScenarioId, coreStore } from '../../domain/coreStore';
import { syncSimulationStore } from '../../features/simulation';
import { getUserPreference, setUserPreference } from '../../utils/prefsStorage';
import { useGlobalBusy } from '../../ui/GlobalBusyContext';
import { IngestFilesResult } from '../../ingestion/ingestionCoordinator';
import { log } from '../../lib/log';

export function useDemoScenario() {
  const [selectedDemoId, setSelectedDemoIdState] = useState<DemoScenarioId>(
    () => getUserPreference('simpilot.dataloader.demoId', 'STLA_SAMPLE')
  );
  const { pushBusy, popBusy } = useGlobalBusy();

  useEffect(() => {
    setUserPreference('simpilot.dataloader.demoId', selectedDemoId);
  }, [selectedDemoId]);

  const setSelectedDemoId = (id: DemoScenarioId) => {
    setSelectedDemoIdState(id);
  };

  const handleLoadDemo = (
    onSuccess: (result: IngestFilesResult) => void,
    onError: (error: string | null) => void
  ) => {
    pushBusy('Loading demo scenario...');
    setTimeout(() => {
      loadDemoScenario(selectedDemoId);
      syncSimulationStore();

      const state = coreStore.getState();
      const result: IngestFilesResult = {
        projectsCount: state.projects.length,
        areasCount: state.areas.length,
        cellsCount: state.cells.length,
        robotsCount: state.assets.filter(a => a.kind === 'ROBOT').length,
        toolsCount: state.assets.filter(a => a.kind !== 'ROBOT').length,
        warnings: []
      };

      onSuccess(result);
      onError(null);
      popBusy();
    }, 500);
  };

  const handleLoadExportedData = async (
    onSuccess: (result: IngestFilesResult) => void,
    onError: (error: string) => void
  ) => {
    pushBusy('Loading exported data...');

    try {
      const response = await fetch('/exported_store_data.json');
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }

      const snapshot = await response.json();

      const deduplicatedSnapshot = {
        ...snapshot,
        projects: deduplicateById(snapshot.projects || []),
        areas: deduplicateById(snapshot.areas || []),
        cells: deduplicateById(snapshot.cells || []),
        assets: deduplicateById(snapshot.assets || [])
      };

      coreStore.clear();
      coreStore.loadSnapshot(deduplicatedSnapshot);
      syncSimulationStore();

      const state = coreStore.getState();
      const warnings = (state.warnings || []).map((msg, idx) => ({
        id: `warning-${idx}`,
        kind: 'ROW_SKIPPED' as const,
        fileName: 'exported_store_data.json',
        message: msg,
        createdAt: new Date().toISOString()
      }));

      const result: IngestFilesResult = {
        projectsCount: state.projects.length,
        areasCount: state.areas.length,
        cellsCount: state.cells.length,
        robotsCount: state.assets.filter(a => a.kind === 'ROBOT').length,
        toolsCount: state.assets.filter(a => a.kind !== 'ROBOT').length,
        warnings
      };

      onSuccess(result);

      log.info('✅ Exported data loaded (deduplicated):', {
        projects: state.projects.length,
        areas: state.areas.length,
        cells: state.cells.length,
        assets: state.assets.length
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load exported data';
      onError(errorMsg);
      console.error('Error loading exported data:', err);
    } finally {
      popBusy();
    }
  };

  return {
    selectedDemoId,
    setSelectedDemoId,
    demoScenarios: DEMO_SCENARIOS,
    handleLoadDemo,
    handleLoadExportedData
  };
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  }
  return Array.from(seen.values());
}
