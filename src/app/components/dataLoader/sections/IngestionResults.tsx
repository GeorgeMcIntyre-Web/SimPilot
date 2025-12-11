import { CheckCircle, AlertTriangle } from 'lucide-react';
import { IngestFilesResult } from '../../../../ingestion/ingestionCoordinator';

interface IngestionResultsProps {
  result: IngestFilesResult;
}

export function IngestionResults({ result }: IngestionResultsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center" data-testid="data-loaded-indicator">
          <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Ingestion Complete</h3>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard'}
          data-testid="go-to-dashboard-button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Go to Dashboard →
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-projects-count">
            {result.projectsCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Projects</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-areas-count">
            {result.areasCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Areas</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-cells-count">
            {result.cellsCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stations</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-robots-count">
            {result.robotsCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Robots</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-tools-count">
            {result.toolsCount}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tools</div>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Warnings ({result.warnings.length})
          </h4>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-md p-4 max-h-60 overflow-y-auto">
            <ul className="space-y-2">
              {result.warnings.map((w: any, i: number) => (
                <li key={i} className="text-sm text-orange-800 dark:text-orange-200">
                  <span className="font-semibold">{w.fileName}:</span> {w.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
