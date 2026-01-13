/**
 * Storage Management Component
 *
 * Displays storage statistics and provides actions for managing snapshots.
 */

import { useState, useEffect } from 'react';
import { Database, Trash2, Archive, Loader2, AlertTriangle } from 'lucide-react';
import {
  getStorageStats,
  deleteAllSnapshots,
  pruneOldSnapshots,
  type StorageStats
} from '../../../storage/indexedDBStore';
import { log } from '../../../lib/log';

export interface StorageManagementProps {
  onStorageChange?: () => void;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })}`;
}

export function StorageManagement({ onStorageChange }: StorageManagementProps) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPruning, setIsPruning] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const storageStats = await getStorageStats();
      setStats(storageStats);
      log.info('Storage Management: Loaded stats', storageStats);
    } catch (err) {
      log.error('Storage Management: Failed to load stats', err);
      setError('Failed to load storage statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrune = async (keepCount: number) => {
    const confirmed = confirm(
      `This will delete all snapshots except the ${keepCount} most recent ones. Continue?`
    );

    if (!confirmed) return;

    setIsPruning(true);

    try {
      const deletedCount = await pruneOldSnapshots(keepCount);
      log.info('Storage Management: Pruned snapshots', {
        deletedCount,
        keepCount
      });

      alert(`Successfully deleted ${deletedCount} old snapshot${deletedCount !== 1 ? 's' : ''}.`);

      // Reload stats
      await loadStats();

      // Notify parent
      if (onStorageChange) {
        onStorageChange();
      }
    } catch (err) {
      log.error('Storage Management: Failed to prune snapshots', err);
      alert('Failed to prune snapshots. Please try again.');
    } finally {
      setIsPruning(false);
    }
  };

  const handleClearAll = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete ALL snapshots? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    const doubleConfirmed = confirm(
      'This will permanently delete all version history. Are you absolutely sure?'
    );

    if (!doubleConfirmed) {
      return;
    }

    setIsClearing(true);

    try {
      await deleteAllSnapshots();
      log.info('Storage Management: Cleared all snapshots');

      alert('All snapshots have been deleted.');

      // Reload stats
      await loadStats();

      // Notify parent
      if (onStorageChange) {
        onStorageChange();
      }
    } catch (err) {
      log.error('Storage Management: Failed to clear snapshots', err);
      alert('Failed to clear snapshots. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading storage stats...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !stats) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">{error || 'Failed to load statistics'}</p>
        <button
          onClick={loadStats}
          className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const isDisabled = isPruning || isClearing;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Storage Management
          </h3>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Snapshot Count */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Snapshots</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.snapshotCount}
            </div>
          </div>

          {/* Storage Size */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated Size</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.estimatedSizeMB.toFixed(1)} MB
            </div>
          </div>

          {/* Oldest Snapshot */}
          {stats.oldestSnapshot && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Oldest Snapshot</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatTimestamp(stats.oldestSnapshot)}
              </div>
            </div>
          )}

          {/* Newest Snapshot */}
          {stats.newestSnapshot && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Newest Snapshot</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatTimestamp(stats.newestSnapshot)}
              </div>
            </div>
          )}
        </div>

        {/* Storage Warning */}
        {stats.estimatedSizeMB > 250 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Storage Usage High
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                You're using over 250 MB of storage. Consider pruning old snapshots to free up
                space.
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maintenance Actions
            </h4>

            <div className="space-y-2">
              {/* Prune to 50 */}
              <button
                onClick={() => handlePrune(50)}
                disabled={isDisabled || stats.snapshotCount <= 50}
                className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Archive className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Keep Last 50 Snapshots
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Delete older snapshots
                    </div>
                  </div>
                </div>
                {isPruning && (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* Prune to 20 */}
              <button
                onClick={() => handlePrune(20)}
                disabled={isDisabled || stats.snapshotCount <= 20}
                className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Archive className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Keep Last 20 Snapshots
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      More aggressive cleanup
                    </div>
                  </div>
                </div>
                {isPruning && (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* Clear All */}
              <button
                onClick={handleClearAll}
                disabled={isDisabled || stats.snapshotCount === 0}
                className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div className="text-left">
                    <div className="font-medium text-red-800 dark:text-red-200">
                      Delete All Snapshots
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400">
                      Permanently clear all version history
                    </div>
                  </div>
                </div>
                {isClearing && (
                  <Loader2 className="w-5 h-5 animate-spin text-red-600 dark:text-red-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• Snapshots are automatically saved after each import</p>
          <p>• Storage sizes are estimates based on typical data</p>
          <p>• All data is stored locally in your browser</p>
          <p>• Clearing browser data will remove all snapshots</p>
        </div>
      </div>
    </div>
  );
}
