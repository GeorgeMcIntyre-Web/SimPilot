import { RefreshCw } from 'lucide-react';
import type { LinkingStats } from '../../../domain/dataHealthStore';

interface LinkingStatsSectionProps {
  linkingStats: LinkingStats;
}

export function LinkingStatsSection({ linkingStats }: LinkingStatsSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-green-500" />
        Linking Statistics
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {linkingStats.totalAssets}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Assets</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {linkingStats.assetsWithReuseInfo}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">With Reuse Info</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {linkingStats.matchedReuseRecords}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Matched Records</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {linkingStats.unmatchedReuseRecords}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Unmatched Records</p>
        </div>
      </div>
    </div>
  );
}
