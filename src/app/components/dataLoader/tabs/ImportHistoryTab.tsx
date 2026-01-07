interface ImportHistoryEntry {
  id: string;
  date: string;
  source: string;
  files: string;
  records: string;
  status: 'Completed' | 'Failed' | 'Partial';
  user: string;
  notes?: string;
}

interface ImportHistoryTabProps {
  entries?: ImportHistoryEntry[];
}

const defaultEntries: ImportHistoryEntry[] = [
  {
    id: 'HIST-1034',
    date: '2024-02-12 14:10',
    source: 'Local Files',
    files: 'simulation_status.xlsx',
    records: '3 sheets',
    status: 'Completed',
    user: 'Alex Rivers',
    notes: 'Validated before import',
  },
  {
    id: 'HIST-1033',
    date: '2024-02-09 09:42',
    source: 'Microsoft 365',
    files: 'equipment_list.xlsx',
    records: '742 rows',
    status: 'Partial',
    user: 'Priya Shah',
    notes: 'Tooling tab skipped (missing headers)',
  },
  {
    id: 'HIST-1032',
    date: '2024-02-07 17:22',
    source: 'SimBridge',
    files: 'STUDY_ALPHA',
    records: 'study sync',
    status: 'Failed',
    user: 'Dana Walsh',
    notes: 'Bridge disconnected mid-transfer',
  },
];

const statusClassMap: Record<ImportHistoryEntry['status'], string> = {
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  Failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  Partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
};

export function ImportHistoryTab({ entries }: ImportHistoryTabProps) {
  const rows = entries && entries.length > 0 ? entries : defaultEntries;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Import History</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Recent imports across all sources. Entries below are placeholder data you can replace with real events.
        </p>
      </div>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">
                Date / Time
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Source
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Files / Study
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Records
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Status
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Imported By
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {rows.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">
                  <div className="font-semibold">{entry.id}</div>
                  <div className="text-gray-500 dark:text-gray-400">{entry.date}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {entry.source}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {entry.files}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {entry.records}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClassMap[entry.status]}`}>
                    {entry.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">
                  {entry.user}
                </td>
                <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {entry.notes || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
