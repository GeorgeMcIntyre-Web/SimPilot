import { PageHeader } from '../../ui/components/PageHeader';
import { ImportHistoryTab } from '../components/dataLoader/tabs/ImportHistoryTab';
import { useImportHistory } from '../hooks/useImportHistory';
import { clearImportHistory } from '../features/importHistory/importHistoryStore';

export function ImportHistoryPage() {
  const { entries } = useImportHistory();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import History"
        subtitle="Review recent imports across all sources."
        actions={
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
        }
      />

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <ImportHistoryTab entries={entries} />
        </div>
      </div>
    </div>
  );
}

export default ImportHistoryPage;
