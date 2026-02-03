import { Play, Trash2, Download, Upload } from 'lucide-react';
import { DemoScenarioId } from '../../../../domain/coreStore';

interface QuickActionsBarProps {
  selectedDemoId: DemoScenarioId;
  demoScenarios: Array<{ id: DemoScenarioId; label: string }>;
  onDemoIdChange: (id: DemoScenarioId) => void;
  onLoadDemo: () => void;
  onClearData: () => void;
  onExportSnapshot: () => void;
  onImportSnapshot: () => void;
}

export function QuickActionsBar({
  selectedDemoId,
  demoScenarios,
  onDemoIdChange,
  onLoadDemo,
  onClearData,
  onExportSnapshot,
  onImportSnapshot
}: QuickActionsBarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-4">
        {/* Demo Scenario Group */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Demo:
          </label>
          <select
            value={selectedDemoId}
            onChange={(e) => onDemoIdChange(e.target.value as DemoScenarioId)}
            data-testid="demo-scenario-select"
            className="block pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-rose-500 focus:border-rose-500 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            {demoScenarios.map(scenario => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.label}
              </option>
            ))}
          </select>
          <button
            onClick={onLoadDemo}
            data-testid="demo-load-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Load
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />

        {/* Clear Data */}
        <button
          onClick={onClearData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Data
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />

        {/* Data Persistence Group */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
            Snapshots:
          </span>
          <button
            onClick={onExportSnapshot}
            data-testid="export-snapshot-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={onImportSnapshot}
            data-testid="import-snapshot-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
