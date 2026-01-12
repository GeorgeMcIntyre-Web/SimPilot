/**
 * Version History Page
 *
 * Full page for viewing, comparing, and managing version snapshots.
 */

import { useState, useEffect } from 'react';
import { History, RefreshCw, Settings } from 'lucide-react';
import { PageHeader } from '../../ui/components/PageHeader';
import { VersionTimeline } from '../components/versions/VersionTimeline';
import { VersionComparison } from '../components/versions/VersionComparison';
import { StorageManagement } from '../components/versions/StorageManagement';
import { getStorageStats } from '../../storage/indexedDBStore';
import { log } from '../../lib/log';

function VersionHistoryPage() {
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonTimestamps, setComparisonTimestamps] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [snapshotCount, setSnapshotCount] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  const loadStats = async () => {
    try {
      const stats = await getStorageStats();
      setSnapshotCount(stats.snapshotCount);
    } catch (err) {
      log.error('Version History Page: Failed to load stats', err);
    }
  };

  const handleCompare = (_timestamp: string) => {
    // For now, compare with current state (we'd need to implement "current" snapshot)
    // Or we could allow selecting two timestamps
    // For simplicity, let's open a modal where user can select another timestamp
    alert('Comparison feature: Please select another snapshot to compare with');
    // TODO: Implement two-timestamp selection UI
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    log.info('Version History: Refreshed');
  };

  const handleStorageChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title={
          <div className="flex items-center space-x-3">
            <History className="w-6 h-6" />
            <span>Version History</span>
          </div>
        }
        subtitle={`${snapshotCount} snapshot${snapshotCount !== 1 ? 's' : ''} saved`}
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={toggleSettings}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showSettings
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
              title="Storage Management"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Storage</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              About Version History
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Snapshots are automatically saved after each Excel import</li>
              <li>• Load any previous version to restore your data</li>
              <li>• Compare versions to see what changed</li>
              <li>• All data stays local on your PC (stored in browser)</li>
            </ul>
          </div>

          {/* Storage Management (collapsible) */}
          {showSettings && (
            <StorageManagement
              key={refreshKey}
              onStorageChange={handleStorageChange}
            />
          )}

          {/* Version Comparison (modal/overlay) */}
          {showComparison && comparisonTimestamps && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="max-w-4xl w-full max-h-[90vh] overflow-auto">
                <VersionComparison
                  fromTimestamp={comparisonTimestamps.from}
                  toTimestamp={comparisonTimestamps.to}
                  onClose={() => {
                    setShowComparison(false);
                    setComparisonTimestamps(null);
                  }}
                />
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Snapshot Timeline
            </h2>
            <VersionTimeline
              key={refreshKey}
              onCompare={handleCompare}
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VersionHistoryPage;
