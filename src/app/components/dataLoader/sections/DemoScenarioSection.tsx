import { DemoScenarioId } from '../../../../domain/coreStore';

interface DemoScenarioSectionProps {
  selectedDemoId: DemoScenarioId;
  demoScenarios: Array<{ id: DemoScenarioId; label: string }>;
  onDemoIdChange: (id: DemoScenarioId) => void;
  onLoadDemo: () => void;
  onClearData: () => void;
}

export function DemoScenarioSection({
  selectedDemoId,
  demoScenarios,
  onDemoIdChange,
  onLoadDemo,
  onClearData
}: DemoScenarioSectionProps) {
  return (
    <div className="bg-gradient-to-r from-rose-50 to-white dark:from-gray-800 dark:to-gray-800 shadow rounded-lg p-6 border border-rose-100 dark:border-indigo-900/30">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center" data-testid="demo-loader">
            Quick Start: Load Demo Data
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Quickly load sample data for demonstration purposes without needing Excel files.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedDemoId}
            onChange={(e) => onDemoIdChange(e.target.value as DemoScenarioId)}
            data-testid="demo-scenario-select"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
            data-testid-stla="load-demo-stla"
            className="inline-flex items-center justify-center px-3 py-1.5 w-32 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors whitespace-nowrap"
          >
            Load Demo
          </button>
          <button
            onClick={onClearData}
            className="inline-flex items-center justify-center px-3 py-1.5 w-32 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors whitespace-nowrap"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  );
}
