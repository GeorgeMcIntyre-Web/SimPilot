/**
 * Version Timeline Component
 *
 * Displays a chronological list of all saved snapshots with metadata.
 * Allows users to load, compare, and delete snapshots.
 */

import { useState, useEffect } from 'react';
import { Clock, Download, GitCompare, Trash2, Loader2, FileText } from 'lucide-react';
import { getAllSnapshots, deleteSnapshot, getSnapshot, type SnapshotSummary } from '../../../storage/indexedDBStore';
import { coreStore } from '../../../domain/coreStore';
import { log } from '../../../lib/log';

export interface VersionTimelineProps {
  onCompare?: (timestamp: string) => void;
  onRefresh?: () => void;
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

/**
 * Format timestamp for short display (time only if today)
 */
function formatShortTimestamp(ts: string): string {
  const date = new Date(ts);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString();
}

export function VersionTimeline({ onCompare, onRefresh }: VersionTimelineProps) {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState<string | null>(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState<string | null>(null);

  // Load snapshots on mount
  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allSnapshots = await getAllSnapshots();
      setSnapshots(allSnapshots);
      log.info('Version Timeline: Loaded snapshots', { count: allSnapshots.length });
    } catch (err) {
      log.error('Version Timeline: Failed to load snapshots', err);
      setError('Failed to load version history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async (timestamp: string) => {
    setLoadingSnapshot(timestamp);

    try {
      const snapshot = await getSnapshot(timestamp);

      if (!snapshot) {
        throw new Error('Snapshot not found');
      }

      // Load snapshot into coreStore
      coreStore.setData(
        {
          projects: snapshot.data.projects,
          areas: snapshot.data.areas,
          cells: snapshot.data.cells,
          robots: snapshot.data.assets.filter(a => a.kind === 'ROBOT') as any,
          tools: snapshot.data.assets.filter(a => a.kind !== 'ROBOT') as any,
          warnings: snapshot.data.warnings,
          referenceData: snapshot.data.referenceData
        },
        snapshot.metadata.source
      );

      log.info('Version Timeline: Loaded snapshot into store', { timestamp });

      // Notify parent if needed
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      log.error('Version Timeline: Failed to load snapshot', err);
      alert('Failed to load this version. Please try again.');
    } finally {
      setLoadingSnapshot(null);
    }
  };

  const handleDelete = async (timestamp: string) => {
    const confirmed = confirm(
      'Are you sure you want to delete this snapshot? This action cannot be undone.'
    );

    if (!confirmed) return;

    setDeletingSnapshot(timestamp);

    try {
      await deleteSnapshot(timestamp);
      log.info('Version Timeline: Deleted snapshot', { timestamp });

      // Reload snapshots
      await loadSnapshots();
    } catch (err) {
      log.error('Version Timeline: Failed to delete snapshot', err);
      alert('Failed to delete snapshot. Please try again.');
    } finally {
      setDeletingSnapshot(null);
    }
  };

  const handleCompare = (timestamp: string) => {
    if (onCompare) {
      onCompare(timestamp);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading version history...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
        <button
          onClick={loadSnapshots}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (snapshots.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Versions Saved Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Import Excel files to automatically create version snapshots.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {snapshots.map(snapshot => {
        const isLoadingThis = loadingSnapshot === snapshot.timestamp;
        const isDeletingThis = deletingSnapshot === snapshot.timestamp;
        const isDisabled = isLoadingThis || isDeletingThis || loadingSnapshot !== null || deletingSnapshot !== null;

        return (
          <div
            key={snapshot.timestamp}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {formatTimestamp(snapshot.timestamp)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatShortTimestamp(snapshot.timestamp)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    snapshot.metadata.source === 'Local'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                      : snapshot.metadata.source === 'MS365'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                  }`}
                >
                  {snapshot.metadata.source}
                </span>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Tools</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {snapshot.metadata.toolCount}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Robots</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {snapshot.metadata.robotCount}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Cells</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {snapshot.metadata.cellCount}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Projects</div>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {snapshot.metadata.projectCount}
                </div>
              </div>
            </div>

            {/* File names */}
            {snapshot.metadata.fileNames.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Files:</div>
                <div className="flex flex-wrap gap-1">
                  {snapshot.metadata.fileNames.map((fileName, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                    >
                      {fileName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* User notes */}
            {snapshot.metadata.userNotes && (
              <div className="mb-3 text-sm text-gray-600 dark:text-gray-400 italic">
                {snapshot.metadata.userNotes}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleLoad(snapshot.timestamp)}
                disabled={isDisabled}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingThis ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Load</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCompare(snapshot.timestamp)}
                disabled={isDisabled}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <GitCompare className="w-4 h-4" />
                <span>Compare</span>
              </button>

              <button
                onClick={() => handleDelete(snapshot.timestamp)}
                disabled={isDisabled}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeletingThis ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
