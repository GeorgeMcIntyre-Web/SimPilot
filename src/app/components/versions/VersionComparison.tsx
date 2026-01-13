/**
 * Version Comparison Component
 *
 * Displays a detailed diff between two snapshots showing added, removed,
 * and modified items.
 */

import { useState, useEffect } from 'react';
import {
  PlusCircle,
  MinusCircle,
  Edit3,
  ChevronDown,
  ChevronRight,
  Loader2,
  X,
  Search
} from 'lucide-react';
import { getSnapshot } from '../../../storage/indexedDBStore';
import { calculateDiff, type DiffResult } from '../../../storage/diffCalculator';
import { log } from '../../../lib/log';

export interface VersionComparisonProps {
  fromTimestamp: string;
  toTimestamp: string;
  onClose?: () => void;
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
 * Get icon for item kind
 */
function getKindIcon(kind: string): string {
  switch (kind.toUpperCase()) {
    case 'ROBOT':
      return '🤖';
    case 'GUN':
    case 'TOOL':
      return '🔧';
    case 'CELL':
      return '🏭';
    case 'PROJECT':
      return '📁';
    case 'AREA':
      return '📍';
    default:
      return '📦';
  }
}

export function VersionComparison({ fromTimestamp, toTimestamp, onClose }: VersionComparisonProps) {
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    added: true,
    removed: true,
    modified: true
  });
  const [expandedModified, setExpandedModified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAndCompare();
  }, [fromTimestamp, toTimestamp]);

  const loadAndCompare = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [fromSnapshot, toSnapshot] = await Promise.all([
        getSnapshot(fromTimestamp),
        getSnapshot(toTimestamp)
      ]);

      if (!fromSnapshot || !toSnapshot) {
        throw new Error('One or both snapshots not found');
      }

      const diffResult = calculateDiff(
        fromSnapshot.data,
        toSnapshot.data,
        fromTimestamp,
        toTimestamp
      );

      setDiff(diffResult);
      log.info('Version Comparison: Diff calculated', {
        addedCount: diffResult.addedItems.length,
        removedCount: diffResult.removedItems.length,
        modifiedCount: diffResult.modifiedItems.length
      });
    } catch (err) {
      log.error('Version Comparison: Failed to calculate diff', err);
      setError('Failed to compare versions');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleModifiedItem = (id: string) => {
    setExpandedModified(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter items by search query
  const filterItems = <T extends { displayName: string; kind: string }>(items: T[]): T[] => {
    if (!searchQuery) return items;

    const query = searchQuery.toLowerCase();
    return items.filter(
      item =>
        item.displayName.toLowerCase().includes(query) ||
        item.kind.toLowerCase().includes(query)
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Comparing versions...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !diff) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200">{error || 'Failed to load comparison'}</p>
        <button
          onClick={loadAndCompare}
          className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const filteredAdded = filterItems(diff.addedItems);
  const filteredRemoved = filterItems(diff.removedItems);
  const filteredModified = filterItems(diff.modifiedItems);

  const hasNoChanges =
    diff.addedItems.length === 0 &&
    diff.removedItems.length === 0 &&
    diff.modifiedItems.length === 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Comparing Versions
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-col space-y-1 text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">From:</span> {formatTimestamp(fromTimestamp)}
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            <span className="font-medium">To:</span> {formatTimestamp(toTimestamp)}
          </div>
        </div>

        <div className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          {diff.summary}
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* No changes */}
      {hasNoChanges && (
        <div className="p-8 text-center text-gray-600 dark:text-gray-400">
          No changes detected between these versions.
        </div>
      )}

      {/* Content */}
      <div className="max-h-[600px] overflow-y-auto">
        {/* Added Items */}
        {diff.addedItems.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleSection('added')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {expandedSections.added ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
                <PlusCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Added ({filteredAdded.length})
                </span>
              </div>
            </button>

            {expandedSections.added && (
              <div className="px-4 pb-4 space-y-2">
                {filteredAdded.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
                  >
                    <span className="text-lg">{getKindIcon(item.kind)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.kind}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Removed Items */}
        {diff.removedItems.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleSection('removed')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {expandedSections.removed ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
                <MinusCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Removed ({filteredRemoved.length})
                </span>
              </div>
            </button>

            {expandedSections.removed && (
              <div className="px-4 pb-4 space-y-2">
                {filteredRemoved.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                  >
                    <span className="text-lg">{getKindIcon(item.kind)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.kind}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modified Items */}
        {diff.modifiedItems.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => toggleSection('modified')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {expandedSections.modified ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
                <Edit3 className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Modified ({filteredModified.length})
                </span>
              </div>
            </button>

            {expandedSections.modified && (
              <div className="px-4 pb-4 space-y-2">
                {filteredModified.map(item => {
                  const isExpanded = expandedModified[item.id];

                  return (
                    <div
                      key={item.id}
                      className="bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800"
                    >
                      <button
                        onClick={() => toggleModifiedItem(item.id)}
                        className="w-full flex items-center space-x-2 p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                        <span className="text-lg">{getKindIcon(item.kind)}</span>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {item.displayName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.kind} • {item.changes.length} change
                            {item.changes.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-2 space-y-1">
                          {item.changes.map((change, idx) => (
                            <div
                              key={idx}
                              className="text-sm p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                            >
                              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {change.fieldLabel}
                              </div>
                              <div className="flex items-center space-x-2 text-xs">
                                <span className="text-red-600 dark:text-red-400 line-through">
                                  {change.oldValueDisplay}
                                </span>
                                <span className="text-gray-500">→</span>
                                <span className="text-green-600 dark:text-green-400">
                                  {change.newValueDisplay}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
