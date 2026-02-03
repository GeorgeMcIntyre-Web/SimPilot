import { RefreshCw } from 'lucide-react';
import { cn } from '../../../../ui/lib/utils';
import { MsExcelFileItem } from '../../../../integrations/ms/msGraphClient';

interface M365TabProps {
  isSignedIn: boolean;
  m365Items: MsExcelFileItem[];
  selectedSimIds: string[];
  selectedEqIds: string[];
  importedFiles?: string[];
  isLoadingM365: boolean;
  isIngesting: boolean;
  m365Error: string | null;
  onLogin: () => void;
  onRefreshFiles: () => void;
  onToggleSelection: (id: string, type: 'sim' | 'eq') => void;
  onIngest: () => void;
}

export function M365Tab({
  isSignedIn,
  m365Items,
  selectedSimIds,
  selectedEqIds,
  importedFiles = [],
  isLoadingM365,
  isIngesting,
  m365Error,
  onLogin,
  onRefreshFiles,
  onToggleSelection,
  onIngest
}: M365TabProps) {
  if (!isSignedIn) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 typography-title-sm text-gray-900 dark:text-gray-100">Authentication Required</h3>
        <p className="mt-1 typography-subtitle text-gray-500 dark:text-gray-400">
          To pick files from SharePoint, sign in with your Microsoft account.
        </p>
        <div className="mt-6">
          <button
            onClick={onLogin}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm typography-body-strong rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with Microsoft
          </button>
        </div>
      </div>

      
    );
  }

  return (
    <div className="space-y-6">
      {importedFiles.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3">
          <div className="typography-caption text-gray-600 dark:text-gray-300 mb-2">Last imported files</div>
          <div className="flex flex-wrap gap-2">
            {importedFiles.map((file) => (
              <span
                key={file}
                className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-1 text-xs text-gray-800 dark:text-gray-100"
                title={file}
              >
                {file}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="typography-subtitle text-gray-500 dark:text-gray-400">
          Select files from your configured SharePoint folder.
        </p>
        <button
          onClick={onRefreshFiles}
          disabled={isLoadingM365}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm typography-caption rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
        >
          <RefreshCw className={cn("w-4 h-4 mr-1", isLoadingM365 && "animate-spin")} />
          Refresh Files
        </button>
      </div>

      {m365Error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <p className="typography-body text-red-700 dark:text-red-300">{m365Error}</p>
        </div>
      )}  

      {m365Items.length > 0 ? (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left typography-label text-gray-900 dark:text-gray-100 sm:pl-6">
                  Name
                </th>
                <th scope="col" className="px-3 py-3.5 text-left typography-label text-gray-900 dark:text-gray-100">
                  Last Modified
                </th>
                <th scope="col" className="px-3 py-3.5 text-center typography-label text-gray-900 dark:text-gray-100">
                  Simulation
                </th>
                <th scope="col" className="px-3 py-3.5 text-center typography-label text-gray-900 dark:text-gray-100">
                  Equipment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {m365Items.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 typography-body-strong text-gray-900 dark:text-gray-100 sm:pl-6">
                    <a href={item.webUrl} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600">
                      {item.name}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 typography-caption text-gray-500 dark:text-gray-400">
                    {item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime).toLocaleDateString() : '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 typography-caption text-gray-500 text-center">
                    <input
                      type="checkbox"
                      checked={selectedSimIds.includes(item.id)}
                      onChange={() => onToggleSelection(item.id, 'sim')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 typography-caption text-gray-500 text-center">
                    <input
                      type="checkbox"
                      checked={selectedEqIds.includes(item.id)}
                      onChange={() => onToggleSelection(item.id, 'eq')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !isLoadingM365 && !m365Error && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 typography-caption">
            Click "Refresh Files" to load from SharePoint.
          </div>
        )
      )}

      <div className="flex justify-end">
        <button
          onClick={onIngest}
          disabled={isIngesting || (selectedSimIds.length === 0 && selectedEqIds.length === 0)}
          className="inline-flex items-center px-4 py-2 border border-transparent typography-body-strong rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isIngesting ? 'Downloading & Processing...' : 'Load Selected from Microsoft'}
        </button>
      </div>
    </div>
  );
}
