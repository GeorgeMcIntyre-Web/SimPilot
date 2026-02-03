import { useState, useEffect } from 'react';
import { PageHeader } from '../../ui/components/PageHeader';
import { cn } from '../../ui/lib/utils';
import { useMsAccount } from '../../integrations/ms/useMsAccount';
import { getUserPreference, setUserPreference } from '../../utils/prefsStorage';
import { useHasSimulationData } from '../../ui/hooks/useDomainData';
import { clearCrossRefData } from '../../hooks/useCrossRefData';
import { syncSimulationStore } from '../../features/simulation';
import { coreStore } from '../../domain/coreStore';
import { simPilotStore } from '../../domain/simPilotStore';
import { VersionComparisonModal } from '../components/VersionComparisonModal';
import { log } from '../../lib/log';
import { downloadSnapshot, uploadSnapshot, clearAllData } from '../../persistence/exportImport';
import { persistenceService } from '../../persistence/indexedDbService';
import { SummaryStatsGrid } from './dataHealth/SummaryStatsGrid';
import { ReuseSummarySection } from './dataHealth/ReuseSummarySection';
import { LinkingStatsSection } from './dataHealth/LinkingStatsSection';
import { ErrorsSection } from './dataHealth/ErrorsSection';
import { useDataHealth } from './dataHealth/useDataHealth';
import { Download, FileText, FolderOpen, Cloud, Link, History, Activity } from 'lucide-react';

// Hooks
import { useLocalFileIngest } from '../hooks/useLocalFileIngest';
import { useM365Ingest } from '../hooks/useM365Ingest';
import { useSimBridge } from '../hooks/useSimBridge';
import { useDemoScenario } from '../hooks/useDemoScenario';

// Components
import { QuickActionsBar } from '../components/dataLoader/sections/QuickActionsBar';
import { IngestionResults } from '../components/dataLoader/sections/IngestionResults';
import { ClearDataDialog } from '../components/dataLoader/dialogs/ClearDataDialog';
import { LocalFilesTab } from '../components/dataLoader/tabs/LocalFilesTab';
import { M365Tab } from '../components/dataLoader/tabs/M365Tab';
import { SimBridgeTab } from '../components/dataLoader/tabs/SimBridgeTab';
import { ImportHistoryTab } from '../components/dataLoader/tabs/ImportHistoryTab';
import { DiffResultsTab } from '../components/dataLoader/tabs/DiffResultsTab';
import { useImportHistory } from '../hooks/useImportHistory';
import { useCoreStore } from '../../domain/coreStore';
import type { ImportHistoryEntry } from '../components/dataLoader/tabs/ImportHistoryTab';
import { clearImportHistory } from '../features/importHistory/importHistoryStore';

type DataLoaderTab = 'local' | 'm365' | 'simbridge' | 'health' | 'history';

const allowedTabs: DataLoaderTab[] = ['local', 'm365', 'simbridge', 'health', 'history'];

export function DataLoaderPage() {
  const storedTab = getUserPreference('simpilot.dataloader.tab', 'local') as DataLoaderTab;
  const initialTab: DataLoaderTab = allowedTabs.includes(storedTab) ? storedTab : 'local';

  const [activeTab, setActiveTab] = useState<DataLoaderTab>(initialTab);
  const [historyView, setHistoryView] = useState<'history' | 'diff'>('history');
  const [showClearDialog, setShowClearDialog] = useState(false);

  const hasData = useHasSimulationData();
  const { enabled: msEnabled, isSignedIn, login } = useMsAccount();

  // Custom hooks 
  const localIngest = useLocalFileIngest(hasData);
  const m365Ingest = useM365Ingest(hasData);
  const simBridge = useSimBridge(activeTab === 'simbridge');
  const demoScenario = useDemoScenario();
  const { entries } = useImportHistory();
  const { diffResults } = useCoreStore();
  const latestLocalImport = entries.find((e) => e.sourceType === 'Local Files');
  const latestM365Import = entries.find((e) => e.sourceType === 'Microsoft 365');
  const filesFromEntry = (entry?: ImportHistoryEntry) =>
    entry?.filename
      ? entry.filename.split(',').map((f) => f.trim()).filter(Boolean)
      : [];
  const latestLocalFiles = filesFromEntry(latestLocalImport);
  const latestM365Files = filesFromEntry(latestM365Import);

  useEffect(() => {
    setUserPreference('simpilot.dataloader.tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    // If user had m365 selected but feature is disabled, fall back to local
    if (!msEnabled && activeTab === 'm365') {
      setActiveTab('local');
    }
  }, [msEnabled, activeTab]);

  // Unified result display (from either local or M365 ingestion)
  const result = localIngest.result || m365Ingest.result;
  const showVersionComparison = localIngest.showVersionComparison || m365Ingest.showVersionComparison;
  const versionComparison = localIngest.versionComparison || m365Ingest.versionComparison;

  const handleConfirmVersionComparison = () => {
    if (localIngest.showVersionComparison) {
      localIngest.confirmVersionComparison();
    } else if (m365Ingest.showVersionComparison) {
      m365Ingest.confirmVersionComparison();
    }
  };

  const handleCancelVersionComparison = () => {
    localIngest.cancelVersionComparison();
    m365Ingest.cancelVersionComparison();
  };

  const handleClearData = () => {
    setShowClearDialog(true);
  };

  const confirmClearData = async () => {
    // Clear in-memory stores
    coreStore.clear();
    syncSimulationStore();
    clearCrossRefData();
    simPilotStore.clear();
    localIngest.clearFiles();
    localIngest.setResult(null);
    localIngest.setError(null);
    m365Ingest.setResult(null);
    m365Ingest.setM365Error(null);
    clearImportHistory();

    // Clear persisted data in IndexedDB
    const result = await clearAllData();
    if (!result.success) {
      log.error('Failed to clear persisted data:', result.errorMessage);
    }

    setShowClearDialog(false);
    log.info('✅ Data cleared');
  };

  const cancelClearData = () => {
    setShowClearDialog(false);
  };

  const handleExportSnapshot = async () => {
    const result = await downloadSnapshot();
    if (result.success) {
      log.info('✅ Snapshot exported successfully');
    } else {
      log.error('Failed to export snapshot:', result.errorMessage);
    }
  };

  const handleImportSnapshot = async () => {
    const result = await uploadSnapshot();
    if (result.success && result.requiresReload) {
      log.info('✅ Snapshot imported successfully. Reloading data...');
      // Reload the snapshot into the store
      const loadResult = await persistenceService.load();
      if (loadResult.success && loadResult.snapshot) {
        coreStore.loadSnapshot(loadResult.snapshot);
        syncSimulationStore();
      }
    } else if (!result.success && result.errorMessage !== 'File selection cancelled') {
      log.error('Failed to import snapshot:', result.errorMessage);
    }
  };

  const handleLoadDemo = () => {
    demoScenario.handleLoadDemo(
      (res) => {
        localIngest.setResult(res);
        m365Ingest.setResult(res);
      },
      (err) => {
        localIngest.setError(err);
        m365Ingest.setM365Error(err);
      }
    );
  };

  // Count files for badge display
  const localFilesCount = localIngest.simulationFiles.length + localIngest.equipmentFiles.length +
    localIngest.toolListFiles.length + localIngest.assembliesFiles.length;
  const m365FilesCount = m365Ingest.selectedSimIds.length + m365Ingest.selectedEqIds.length;
  const historyCount = entries.length;

  return (
    <div className="space-y-6" data-testid="data-loader-root">
      {/* Section 1: Header */}
      <PageHeader
        title="Data Loader"
        subtitle="Import simulation status and equipment lists from Excel files."
      />

      {/* Section 2: Quick Start Banner (only when no data) */}
      {!hasData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="text-xl">💡</span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">New here? Try the Fast Path</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              To see SimPilot in action immediately, use the <strong>Load Demo Scenario</strong> button below (select <em>STLA_SAMPLE</em>).
              For real projects, upload your Excel status files in the "Local Files" tab.
            </p>
          </div>
        </div>
      )}

      {/* Section 3: Quick Actions (Demo, Clear, Export/Import) */}
      <QuickActionsBar
        selectedDemoId={demoScenario.selectedDemoId}
        demoScenarios={demoScenario.demoScenarios}
        onDemoIdChange={demoScenario.setSelectedDemoId}
        onLoadDemo={handleLoadDemo}
        onClearData={handleClearData}
        onExportSnapshot={handleExportSnapshot}
        onImportSnapshot={handleImportSnapshot}
      />

      {/* Section 4: Main Tabbed Content Area */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex" aria-label="Tabs">
            {/* Local Files Tab */}
            <button
              onClick={() => setActiveTab('local')}
              data-testid="tab-local-files"
              className={cn(
                "flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors flex items-center justify-center gap-2",
                activeTab === 'local'
                  ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/10"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-rose-200 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Local Files</span>
              {localFilesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                  {localFilesCount}
                </span>
              )}
            </button>

            {/* Microsoft 365 Tab */}
            {msEnabled && (
              <button
                onClick={() => setActiveTab('m365')}
                className={cn(
                  "flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors flex items-center justify-center gap-2",
                  activeTab === 'm365'
                    ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/10"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-rose-200 dark:text-gray-400 dark:hover:text-gray-300"
                )}
              >
                <Cloud className="w-4 h-4" />
                <span>Microsoft 365</span>
                {m365FilesCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                    {m365FilesCount}
                  </span>
                )}
              </button>
            )}

            {/* SimBridge Tab */}
            <button
              onClick={() => setActiveTab('simbridge')}
              className={cn(
                "flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors flex items-center justify-center gap-2",
                activeTab === 'simbridge'
                  ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              <Link className="w-4 h-4" />
              <span>SimBridge</span>
            </button>

            {/* Import History Tab */}
            <button
              onClick={() => setActiveTab('history')}
              data-testid="tab-import-history"
              className={cn(
                "flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors flex items-center justify-center gap-2",
                activeTab === 'history'
                  ? "border-amber-500 text-amber-700 dark:text-amber-300 bg-amber-50/40 dark:bg-amber-900/10"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-amber-200 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              <History className="w-4 h-4" />
              <span>Import History</span>
              {historyCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  {historyCount}
                </span>
              )}
            </button>

            {/* Data Health Tab */}
            <button
              onClick={() => setActiveTab('health')}
              className={cn(
                "flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors flex items-center justify-center gap-2",
                activeTab === 'health'
                  ? "border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/10"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-emerald-200 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              <Activity className="w-4 h-4" />
              <span>Data Health</span>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'local' && (
            <LocalFilesTab
              simulationFiles={localIngest.simulationFiles}
              equipmentFiles={localIngest.equipmentFiles}
              toolListFiles={localIngest.toolListFiles}
              assembliesFiles={localIngest.assembliesFiles}
              importedFiles={latestLocalFiles}
              onSimulationFilesAdded={localIngest.addSimulationFiles}
              onEquipmentFilesAdded={localIngest.addEquipmentFiles}
              onToolListFilesAdded={localIngest.addToolListFiles}
              onAssembliesFilesAdded={localIngest.addAssembliesFiles}
              error={localIngest.error}
              isIngesting={localIngest.isIngesting}
              onIngest={localIngest.handleIngest}
            />
          )}

          {activeTab === 'm365' && msEnabled && (
            <M365Tab
              isSignedIn={isSignedIn}
              m365Items={m365Ingest.m365Items}
              selectedSimIds={m365Ingest.selectedSimIds}
              selectedEqIds={m365Ingest.selectedEqIds}
              importedFiles={latestM365Files}
              isLoadingM365={m365Ingest.isLoadingM365}
              isIngesting={m365Ingest.isIngesting}
              m365Error={m365Ingest.m365Error}
              onLogin={login}
              onRefreshFiles={m365Ingest.refreshM365Files}
              onToggleSelection={m365Ingest.toggleSelection}
              onIngest={m365Ingest.handleIngest}
            />
          )}

          {activeTab === 'simbridge' && (
            <SimBridgeTab
              sbStatus={simBridge.sbStatus}
              sbStudyPath={simBridge.sbStudyPath}
              sbError={simBridge.sbError}
              onConnect={simBridge.handleConnect}
              onStudyPathChange={simBridge.setSbStudyPath}
              onLoadStudy={simBridge.handleLoadStudy}
            />
          )}

          {activeTab === 'history' && (
            <div className="space-y-4" data-testid="import-history-panel">
              <div className="flex justify-between items-center">
                <div>
                  <div className="typography-title-sm text-gray-900 dark:text-white">Import History</div>
                  <div className="typography-subtitle text-gray-600 dark:text-gray-300">
                    Review recent imports, warnings, and diffs without leaving Data Loader.
                  </div>
                </div>
                <div className="inline-flex items-center rounded-md border border-gray-300 bg-white px-1 py-1 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                  <button
                    onClick={() => setHistoryView('history')}
                    className={`px-3 py-1 rounded-md ${historyView === 'history' ? 'bg-gray-200 dark:bg-gray-600 font-semibold' : ''}`}
                  >
                    History
                  </button>
                  <button
                    onClick={() => setHistoryView('diff')}
                    className={`px-3 py-1 rounded-md ${historyView === 'diff' ? 'bg-gray-200 dark:bg-gray-600 font-semibold' : ''}`}
                  >
                    Diff Results
                  </button>
                </div>
              </div>

              {historyView === 'history' ? (
                <ImportHistoryTab entries={entries} />
              ) : (
                <DiffResultsTab diffResults={diffResults} />
              )}
            </div>
          )}

          {activeTab === 'health' && <DataHealthTab />}
        </div>
      </div>

      {/* Section 5: Ingestion Results (conditionally displayed) */}
      {result && <IngestionResults result={result} />}

      {/* Version Comparison Modal */}
      {showVersionComparison && versionComparison && (
        <VersionComparisonModal
          comparison={versionComparison}
          onConfirm={handleConfirmVersionComparison}
          onCancel={handleCancelVersionComparison}
        />
      )}

      {/* Clear Data Confirmation Dialog */}
      {showClearDialog && (
        <ClearDataDialog
          onConfirm={confirmClearData}
          onCancel={cancelClearData}
        />
      )}
    </div>
  );
}

function DataHealthTab() {
  const { metrics, reuseSummary, groupedErrors, expandedSources, toggleSource, hasData, allErrors } =
    useDataHealth();

  const handleExportJson = () => {
    // reuse exporter from data health page
    import('../../utils/dataHealthExport').then(({ exportDataHealthJson }) => {
      exportDataHealthJson({
        totalAssets: metrics.totalAssets,
        totalErrors: metrics.totalErrors,
        unknownSourcingCount: metrics.unknownSourcingCount,
        reuseSummary: metrics.reuseSummary,
        linkingStats: metrics.linkingStats,
        errors: allErrors,
      });
    });
  };

  const handleExportErrorsCsv = () => {
    import('../../utils/dataHealthExport').then(({ exportErrorsCsv }) => {
      exportErrorsCsv(allErrors);
    });
  };

  if (hasData === false) {
    return (
      <div className="space-y-4">
        <div className="typography-title-sm text-gray-900 dark:text-white">No Data Loaded</div>
        <p className="typography-subtitle text-gray-600 dark:text-gray-300">
          Load some data to see health metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div>
          <div className="typography-title-sm text-gray-900 dark:text-white">Data Health</div>
          <div className="typography-subtitle text-gray-600 dark:text-gray-300">
            Monitor ingestion quality and asset statistics.
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportJson}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm typography-caption rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </button>
          {allErrors.length > 0 && (
            <button
              onClick={handleExportErrorsCsv}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm typography-caption rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export Errors CSV
            </button>
          )}
        </div>
      </div>

      <SummaryStatsGrid metrics={metrics} reuseSummary={reuseSummary} />
      <ReuseSummarySection reuseSummary={reuseSummary} />
      {metrics.linkingStats !== null && <LinkingStatsSection linkingStats={metrics.linkingStats} />}
      <ErrorsSection
        groupedErrors={groupedErrors}
        expandedSources={expandedSources}
        onToggleSource={toggleSource}
      />
    </div>
  );
}

export default DataLoaderPage
