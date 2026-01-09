import { useMemo, useState } from 'react';
import { PageHeader } from '../../ui/components/PageHeader';
import { ImportHistoryTab } from '../components/dataLoader/tabs/ImportHistoryTab';
import { DiffResultsTab } from '../components/dataLoader/tabs/DiffResultsTab';
import { useImportHistory } from '../hooks/useImportHistory';
import { clearImportHistory } from '../features/importHistory/importHistoryStore';
import { useCoreStore } from '../../domain/coreStore';

export function ImportHistoryPage() {
  const { entries } = useImportHistory();
  const { diffResults } = useCoreStore();
  const [activeTab, setActiveTab] = useState<'history' | 'diff'>('history');

  const historyAction = useMemo(() => (
    <div className="inline-flex items-center rounded-md border border-gray-300 bg-white px-1 py-1 text-sm font-medium text-gray-700 shadow-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
      <button
        onClick={() => setActiveTab('history')}
        className={`px-3 py-1 rounded-md ${activeTab === 'history' ? 'bg-gray-200 dark:bg-gray-600 font-semibold' : ''}`}
      >
        Import History
      </button>
      <button
        onClick={() => setActiveTab('diff')}
        className={`px-3 py-1 rounded-md ${activeTab === 'diff' ? 'bg-gray-200 dark:bg-gray-600 font-semibold' : ''}`}
      >
        Diff Results
      </button>
    </div>
  ), [activeTab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import History"
        subtitle="Review recent imports across all sources."
        actions={
          <div className="flex items-center gap-3">
            {historyAction}
            {activeTab === 'history' && (
              <button
                onClick={() => {
                  if (entries.length === 0 || window.confirm('Clear all import history entries?')) {
                    clearImportHistory();
                  }
                }}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Clear History
              </button>
            )}
          </div>
        }
      />

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          {activeTab === 'history' ? (
            <ImportHistoryTab entries={entries} />
          ) : (
            <DiffResultsTab diffResults={diffResults} />
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportHistoryPage;
