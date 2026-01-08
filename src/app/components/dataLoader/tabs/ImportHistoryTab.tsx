import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Info } from 'lucide-react';
import type { IngestionWarning } from '../../../domain/core';

export type ImportStatus = 'clean' | 'needs resolution';

export interface ImportDiff {
  created: DiffItem[];
  updated: DiffItem[];
  deleted: DiffItem[];
  renamed: RenameItem[];
  ambiguities: AmbiguityItem[];
}

export interface DiffItem {
  item: string;
  detail?: string;
}

export interface RenameItem {
  from: string;
  to: string;
  reason?: string;
}

export interface AmbiguityCandidate {
  name: string;
  score: number;
  reason: string;
}

export interface AmbiguityItem {
  item: string;
  candidates: AmbiguityCandidate[];
}

export interface UnlinkedItem {
  item: string;
  type: 'Tool' | 'Robot';
  reason: string;
}

export interface ImportHistoryEntry {
  id: string;
  timestamp: string;
  filename: string;
  plant: string;
  sourceType: 'Local Files' | 'Microsoft 365' | 'SimBridge';
  status: ImportStatus;
  counts?: {
    created?: number;
    updated?: number;
    deleted?: number;
    renamed?: number;
    ambiguous?: number;
  };
  diff?: ImportDiff;
  warnings?: string[];
  warningsDetailed?: IngestionWarning[];
  unlinked?: UnlinkedItem[];
}

interface ImportHistoryTabProps {
  entries?: ImportHistoryEntry[];
}

const statusClassMap: Record<ImportStatus, string> = {
  clean: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  'needs resolution': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
};

function formatTimestamp(ts: string) {
  const date = new Date(ts);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function ImportHistoryTab({ entries = [] }: ImportHistoryTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unlinkedGroupExpanded, setUnlinkedGroupExpanded] = useState<Record<string, boolean>>({});
  const [warningGroupExpanded, setWarningGroupExpanded] = useState<Record<string, boolean>>({});

  const rows = useMemo(
    () => [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [entries]
  );

  const toggleRow = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
    // Reset group states when switching rows
    if (expandedId !== id) {
      setUnlinkedGroupExpanded({});
      setWarningGroupExpanded({});
    }
  };

  const toggleUnlinkedGroup = (entryId: string, groupType: string) => {
    const key = `${entryId}-${groupType}`;
    setUnlinkedGroupExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleWarningGroup = (entryId: string, kind: string) => {
    const key = `${entryId}-${kind}`;
    setWarningGroupExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasData = rows.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Import History</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Newest first. Click a row to inspect diffs, ambiguities, warnings, and unlinked items.
        </p>
      </div>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-x-auto">
        {!hasData ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
            No imports yet. Run a Data Loader import to see history and detailed diffs here.
          </div>
        ) : (
          <table className="w-full table-auto divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Import</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Filename</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Plant</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Source</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Created</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Updated</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Deleted</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Renamed</th>
                <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Ambiguous</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Warnings</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {rows.map((entry) => {
                const expanded = expandedId === entry.id;
                const WarningsIcon = entry.warnings && entry.warnings.length > 0 ? AlertTriangle : Info;
                const counts = entry.counts || {};
                const detailedWarnings = entry.warningsDetailed || [];
                const warningMessages = entry.warnings || [];
                const hasDetailedWarnings = detailedWarnings.length > 0;
                const hasSimpleWarnings = !hasDetailedWarnings && warningMessages.length > 0;
                const diff: ImportDiff = entry.diff || {
                  created: [],
                  updated: [],
                  deleted: [],
                  renamed: [],
                  ambiguities: [],
                };

                return (
                  <Fragment key={entry.id}>
                    <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60" onClick={() => toggleRow(entry.id)}>
                      <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">
                        <div className="flex items-center gap-2">
                          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                          <div>
                            <div className="font-semibold break-words">{entry.id}</div>
                            <div className="text-gray-500 dark:text-gray-400 break-words">{formatTimestamp(entry.timestamp)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300 break-words">{entry.filename}</td>
                      <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300 break-words">{entry.plant}</td>
                      <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300 break-words">{entry.sourceType}</td>
                      <td className="px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.created ?? 0}</td>
                      <td className="px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.updated ?? 0}</td>
                      <td className="px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.deleted ?? 0}</td>
                      <td className="px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.renamed ?? 0}</td>
                      <td className="px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.ambiguous ?? 0}</td>
                      <td className="px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClassMap[entry.status]}`}>
                          {entry.status === 'clean' ? 'Clean' : 'Needs resolution'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-700 dark:text-gray-300 break-words">
                        {entry.warnings && entry.warnings.length > 0 ? `${entry.warnings.length} warning(s)` : '—'}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 text-right">
                        <WarningsIcon className="w-4 h-4 inline-block" />
                      </td>
                    </tr>

                    {expanded && (
                      <tr>
                        <td colSpan={12} className="bg-gray-50 dark:bg-gray-800/60 px-6 py-4">
                          <div className="space-y-6 overflow-x-auto">
                            {hasDetailedWarnings || hasSimpleWarnings ? (
                              <WarningsSection
                                detailedWarnings={detailedWarnings}
                                simpleWarnings={warningMessages}
                                hasDetailedWarnings={hasDetailedWarnings}
                                hasSimpleWarnings={hasSimpleWarnings}
                                entryId={entry.id}
                                warningGroupExpanded={warningGroupExpanded}
                                toggleWarningGroup={toggleWarningGroup}
                              />
                            ) : null}

                            <DiffSection title="Created" items={diff.created} />
                            <DiffSection title="Updated" items={diff.updated} />
                            <DiffSection title="Deleted" items={diff.deleted} />
                            <RenameSection items={diff.renamed} />
                            <AmbiguitySection items={diff.ambiguities} />

                            {entry.unlinked && entry.unlinked.length > 0 && (
                              <UnlinkedItemsSection
                                unlinkedItems={entry.unlinked}
                                entryId={entry.id}
                                unlinkedGroupExpanded={unlinkedGroupExpanded}
                                toggleUnlinkedGroup={toggleUnlinkedGroup}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DiffSection({ title, items }: { title: string; items: DiffItem[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.item} className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">{item.item}</span>
            {item.detail ? ` — ${item.detail}` : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RenameSection({ items }: { items: RenameItem[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Renamed</h4>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={`${item.from}-${item.to}`} className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">{item.from}</span> → <span className="font-medium">{item.to}</span>
            {item.reason ? ` — ${item.reason}` : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AmbiguitySection({ items }: { items: AmbiguityItem[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ambiguities</h4>
      {items.map((amb) => (
        <div key={amb.item} className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-3">
          <div className="text-sm font-medium text-amber-900 dark:text-amber-100">{amb.item}</div>
          <ul className="mt-2 space-y-1">
            {amb.candidates.map((candidate) => (
              <li key={candidate.name} className="text-sm text-amber-900 dark:text-amber-100">
                <span className="font-semibold">{candidate.name}</span> — score {(candidate.score * 100).toFixed(0)}%, {candidate.reason}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface WarningsSectionProps {
  detailedWarnings: IngestionWarning[];
  simpleWarnings: string[];
  hasDetailedWarnings: boolean;
  hasSimpleWarnings: boolean;
  entryId: string;
  warningGroupExpanded: Record<string, boolean>;
  toggleWarningGroup: (entryId: string, kind: string) => void;
}

function WarningsSection({
  detailedWarnings,
  simpleWarnings,
  hasDetailedWarnings,
  hasSimpleWarnings,
  entryId,
  warningGroupExpanded,
  toggleWarningGroup,
}: WarningsSectionProps) {
  // Group warnings by kind
  const groupedWarnings = useMemo(() => {
    const groups: Record<string, IngestionWarning[]> = {};
    detailedWarnings.forEach((w) => {
      if (!groups[w.kind]) groups[w.kind] = [];
      groups[w.kind].push(w);
    });
    return groups;
  }, [detailedWarnings]);

  const kindColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    error: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      border: 'border-gray-300 dark:border-gray-600',
      badge: 'bg-gray-600 dark:bg-gray-500',
    },
    warning: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      border: 'border-gray-300 dark:border-gray-600',
      badge: 'bg-gray-600 dark:bg-gray-500',
    },
    info: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      border: 'border-gray-300 dark:border-gray-600',
      badge: 'bg-gray-600 dark:bg-gray-500',
    },
  };

  const getKindColors = (kind: string) => {
    const kindLower = kind.toLowerCase();
    if (kindLower.includes('error')) return kindColors.error;
    if (kindLower.includes('warn')) return kindColors.warning;
    if (kindLower.includes('info')) return kindColors.info;
    return kindColors.warning; // default
  };

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Warnings ({hasDetailedWarnings ? detailedWarnings.length : simpleWarnings.length})
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Issues found during import that may require attention
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {hasSimpleWarnings ? (
          <div className="space-y-2">
            {simpleWarnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/50 rounded-md p-3 border border-gray-300 dark:border-gray-600">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        ) : hasDetailedWarnings ? (
          <>
            {Object.entries(groupedWarnings).map(([kind, warnings]) => {
              const colors = getKindColors(kind);
              const key = `${entryId}-${kind}`;
              const isExpanded = warningGroupExpanded[key] ?? true;

              return (
                <div key={kind} className={`rounded-lg border ${colors.border} shadow-sm overflow-hidden bg-white dark:bg-gray-900`}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleWarningGroup(entryId, kind)}
                    className={`w-full px-4 py-3 flex items-center justify-between ${colors.bg} hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className={`w-4 h-4 ${colors.text}`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 ${colors.text}`} />
                      )}
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge} text-white`}>
                        {kind}
                      </div>
                      <span className={`text-sm font-semibold ${colors.text}`}>
                        {warnings.length} {warnings.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </button>

                  {/* Group content */}
                  {isExpanded && (
                    <div className="max-h-80 overflow-y-auto overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Location
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-16">
                              Row
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Message
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                          {warnings.map((w) => (
                            <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                <div className="font-medium">{w.fileName || 'Unknown'}</div>
                                {w.sheetName && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    Sheet: {w.sheetName}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-center font-mono">
                                {w.rowIndex ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                                {w.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : null}
      </div>
    </div>
  );
}

interface UnlinkedItemsSectionProps {
  unlinkedItems: UnlinkedItem[];
  entryId: string;
  unlinkedGroupExpanded: Record<string, boolean>;
  toggleUnlinkedGroup: (entryId: string, groupType: string) => void;
}

function UnlinkedItemsSection({
  unlinkedItems,
  entryId,
  unlinkedGroupExpanded,
  toggleUnlinkedGroup,
}: UnlinkedItemsSectionProps) {
  // Group by type
  const groupedItems = useMemo(() => {
    const groups: Record<string, UnlinkedItem[]> = {};
    unlinkedItems.forEach((item) => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
    });
    return groups;
  }, [unlinkedItems]);

  const typeColors: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    Tool: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      border: 'border-gray-300 dark:border-gray-600',
      badge: 'bg-gray-600 dark:bg-gray-500',
    },
    Robot: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      border: 'border-gray-300 dark:border-gray-600',
      badge: 'bg-gray-600 dark:bg-gray-500',
    },
  };

  const getTypeColors = (type: string) => {
    return typeColors[type] || typeColors.Tool;
  };

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div className="flex-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Unlinked Items ({unlinkedItems.length})
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Items that could not be linked to existing resources during import
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {Object.entries(groupedItems).map(([type, items]) => {
          const colors = getTypeColors(type);
          const key = `${entryId}-${type}`;
          const isExpanded = unlinkedGroupExpanded[key] ?? true;

          return (
            <div key={type} className={`rounded-lg border ${colors.border} shadow-sm overflow-hidden bg-white dark:bg-gray-900`}>
              {/* Group header */}
              <button
                onClick={() => toggleUnlinkedGroup(entryId, type)}
                className={`w-full px-4 py-3 flex items-center justify-between ${colors.bg} hover:opacity-80 transition-opacity`}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className={`w-4 h-4 ${colors.text}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${colors.text}`} />
                  )}
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge} text-white`}>
                    {type}
                  </div>
                  <span className={`text-sm font-semibold ${colors.text}`}>
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </button>

              {/* Group content */}
              {isExpanded && (
                <div className="max-h-80 overflow-y-auto overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Reason
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">
                          Resolution
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                      {items.map((item, idx) => {
                        // Parse reason to extract actionable info
                        const hasReference = item.reason.toLowerCase().includes('not found') ||
                                           item.reason.toLowerCase().includes('missing') ||
                                           item.reason.toLowerCase().includes('unknown');

                        return (
                          <tr key={`${item.item}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.item}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                              {item.reason}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {hasReference ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium">
                                  Create or link
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                  Review
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
