import { Radio, AlertTriangle } from 'lucide-react';
import { cn } from '../../../../ui/lib/utils';
import { SimBridgeStatus } from '../../../../integrations/simbridge/SimBridgeClient';

interface SimBridgeTabProps {
  sbStatus: SimBridgeStatus;
  sbStudyPath: string;
  sbError: string | null;
  onConnect: () => void;
  onStudyPathChange: (path: string) => void;
  onLoadStudy: () => void;
}

export function SimBridgeTab({
  sbStatus,
  sbStudyPath,
  sbError,
  onConnect,
  onStudyPathChange,
  onLoadStudy
}: SimBridgeTabProps) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="typography-title-sm text-gray-900 dark:text-gray-100 flex items-center">
            <Radio className={cn("w-5 h-5 mr-2", sbStatus.isConnected ? "text-green-500" : "text-gray-400")} />
            SimBridge Connection
          </h3>
          <p className="typography-subtitle text-gray-500 dark:text-gray-400 mt-1">
            Connect to the local SimBridge server to interact with Tecnomatix.
          </p>
        </div>
        <div>
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            sbStatus.isConnected
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
          )}>
            {sbStatus.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {!sbStatus.isConnected ? (
        <div className="flex justify-center py-8">
          <button
            onClick={onConnect}
            className="inline-flex items-center px-4 py-2 border border-transparent typography-body-strong rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Connect to SimBridge
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block typography-body-strong text-gray-700 dark:text-gray-300">
              Study Path (.psz)
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="text"
                value={sbStudyPath}
                onChange={(e) => onStudyPathChange(e.target.value)}
                placeholder="C:\Path\To\Study.psz"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={onLoadStudy}
                disabled={!sbStudyPath}
                className="inline-flex items-center px-4 py-2 border border-transparent typography-body-strong rounded-r-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Load Study
              </button>
            </div>
          </div>
        </div>
      )}

      {sbError && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="typography-body-strong text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-2 typography-body text-red-700 dark:text-red-300">
                <p>{sbError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
