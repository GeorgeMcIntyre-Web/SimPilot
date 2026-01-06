import { useState, useEffect } from 'react';
import { PageHeader } from '../../ui/components/PageHeader';
import { cn } from '../../ui/lib/utils';
import { useMsAccount } from '../../integrations/ms/useMsAccount';
import { getUserPreference, setUserPreference } from '../../utils/prefsStorage';
import { useHasSimulationData } from '../../ui/hooks/useDomainData';
import { clearCrossRefData } from '../../hooks/useCrossRefData';
import { syncSimulationStore } from '../../features/simulation';
import { coreStore } from '../../domain/coreStore';
import { VersionComparisonModal } from '../components/VersionComparisonModal';
import { log } from '../../lib/log';

// Hooks
import { useLocalFileIngest } from '../hooks/useLocalFileIngest';
import { useM365Ingest } from '../hooks/useM365Ingest';
import { useSimBridge } from '../hooks/useSimBridge';
import { useDemoScenario } from '../hooks/useDemoScenario';

// Components
import { DemoScenarioSection } from '../components/dataLoader/sections/DemoScenarioSection';
import { IngestionResults } from '../components/dataLoader/sections/IngestionResults';
import { ClearDataDialog } from '../components/dataLoader/dialogs/ClearDataDialog';
import { LocalFilesTab } from '../components/dataLoader/tabs/LocalFilesTab';
import { M365Tab } from '../components/dataLoader/tabs/M365Tab';
import { SimBridgeTab } from '../components/dataLoader/tabs/SimBridgeTab';

export function DataLoaderPage() {
  const [activeTab, setActiveTab] = useState<'local' | 'm365' | 'simbridge'>(
    () => getUserPreference('simpilot.dataloader.tab', 'local') as any
  );
  const [showClearDialog, setShowClearDialog] = useState(false);

  const hasData = useHasSimulationData();
  const { enabled: msEnabled, isSignedIn, login } = useMsAccount();

  // Custom hooks 
  const localIngest = useLocalFileIngest(hasData);
  const m365Ingest = useM365Ingest(hasData);
  const simBridge = useSimBridge(activeTab === 'simbridge');
  const demoScenario = useDemoScenario();

  useEffect(() => {
    setUserPreference('simpilot.dataloader.tab', activeTab);
  }, [activeTab]);

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

  const confirmClearData = () => {
    coreStore.clear();
    syncSimulationStore();
    clearCrossRefData();
    localIngest.clearFiles();
    localIngest.setResult(null);
    localIngest.setError(null);
    m365Ingest.setResult(null);
    m365Ingest.setM365Error(null);
    setShowClearDialog(false);
    log.info('✅ Data cleared');
  };

  const cancelClearData = () => {
    setShowClearDialog(false);
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

  return (
    <div className="space-y-6" data-testid="data-loader-root">
      <PageHeader
        title="Data Loader"
        subtitle="Import simulation status and equipment lists from Excel files."
      />

      {!hasData && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex items-start space-x-3">
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

      <DemoScenarioSection
        selectedDemoId={demoScenario.selectedDemoId}
        demoScenarios={demoScenario.demoScenarios}
        onDemoIdChange={demoScenario.setSelectedDemoId}
        onLoadDemo={handleLoadDemo}
        onClearData={handleClearData}
      />

      {/* Ingestion Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('local')}
              data-testid="tab-local-files"
              className={cn(
                "w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors",
                activeTab === 'local'
                  ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/30"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-rose-200 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              Local Files
            </button>
            {msEnabled && (
              <button
                onClick={() => setActiveTab('m365')}
                className={cn(
                  "w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors",
                  activeTab === 'm365'
                    ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/30"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-rose-200 dark:text-gray-400 dark:hover:text-gray-300"
                )}
              >
                Microsoft 365
              </button>
            )}
            <button
              onClick={() => setActiveTab('simbridge')}
              className={cn(
                "w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm",
                activeTab === 'simbridge'
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              SimBridge
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
        </div>
      </div>

      {/* Results Section */}
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

export default DataLoaderPage
