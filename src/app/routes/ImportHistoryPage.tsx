import { PageHeader } from '../../ui/components/PageHeader';
import { ImportHistoryTab } from '../components/dataLoader/tabs/ImportHistoryTab';

export function ImportHistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Import History"
        subtitle="Review recent imports across all sources."
      />

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <ImportHistoryTab />
        </div>
      </div>
    </div>
  );
}

export default ImportHistoryPage;
