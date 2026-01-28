import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle, Info } from 'lucide-react';
import type { IngestionWarning } from '../../../../domain/core';
import { useCoreStore } from '../../../../domain/coreStore';
import type { DiffResult } from '../../../../domain/uidTypes';

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

function splitFilenamesList(filenames: string): string[] {
  return filenames
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

function splitFilenameParts(filename: string): { base: string; dir: string | null } {
  if (!filename) return { base: '', dir: null };
  const parts = filename.split(/[\\/]/);
  const base = parts.pop() || filename;
  const dir = parts.length ? parts.join('/') : null;
  return { base, dir };
}

export function ImportHistoryTab({ entries = [] }: ImportHistoryTabProps) {
  const { diffResults } = useCoreStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [warningGroupExpanded, setWarningGroupExpanded] = useState<Record<string, boolean>>({});

  const rows = useMemo(
    () => [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [entries]
  );

  const toggleRow = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
    // Reset group states when switching rows
    if (expandedId !== id) {
      setWarningGroupExpanded({});
    }
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

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-x-auto w-full custom-scrollbar">
        {!hasData ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
            No imports yet. Run a Data Loader import to see history and detailed diffs here.
          </div>
        ) : (
          <table className="w-full table-auto divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs">
              <tr>
                <th scope="col" className="py-1.5 pl-2 pr-1 text-left font-semibold text-gray-900 dark:text-gray-100 sm:pl-3">Import</th>
                <th scope="col" className="px-1.5 py-1.5 text-left font-semibold text-gray-900 dark:text-gray-100 w-48 sm:w-60 md:w-64 lg:w-72">Filename</th>
                <th scope="col" className="px-1.5 py-1.5 text-left font-semibold text-gray-900 dark:text-gray-100">Plant</th>
                <th scope="col" className="px-1.5 py-1.5 text-left font-semibold text-gray-900 dark:text-gray-100">Source</th>
                <th scope="col" className="px-1.5 py-1.5 text-center font-semibold text-gray-900 dark:text-gray-100">Created</th>
                <th scope="col" className="px-1.5 py-1.5 text-center font-semibold text-gray-900 dark:text-gray-100">Updated</th>
                <th scope="col" className="px-1.5 py-1.5 text-center font-semibold text-gray-900 dark:text-gray-100">Deleted</th>
                <th scope="col" className="px-1.5 py-1.5 text-center font-semibold text-gray-900 dark:text-gray-100">Renamed</th>
                <th scope="col" className="px-1.5 py-1.5 text-center font-semibold text-gray-900 dark:text-gray-100">Ambiguous</th>
                <th scope="col" className="px-1.5 py-1.5 text-left font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th scope="col" className="px-1.5 py-1.5 text-left font-semibold text-gray-900 dark:text-gray-100">Warnings</th>
                <th scope="col" className="px-1.5 py-1.5 text-left font-semibold text-gray-900 dark:text-gray-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {rows.map((entry) => {
                const expanded = expandedId === entry.id;
                const WarningsIcon = entry.warnings && entry.warnings.length > 0 ? AlertTriangle : Info;
                const liveDiff = diffResults.find((d: DiffResult) => d.importRunId === entry.id);
                const counts = liveDiff
                  ? {
                      created: liveDiff.summary.created,
                      updated: liveDiff.summary.updated,
                      deleted: liveDiff.summary.deleted,
                      renamed: liveDiff.summary.renamed,
                      ambiguous: liveDiff.summary.ambiguous,
                    }
                  : entry.counts || {};
                const detailedWarningsRaw = entry.warningsDetailed || [];
                const filteredDetailedWarnings = detailedWarningsRaw.filter((w) => w.kind !== 'LINKING_MISSING_TARGET');
                const warningMessages = entry.warnings || [];
                const hasDetailedWarnings = filteredDetailedWarnings.length > 0;
                const hasSimpleWarnings = !hasDetailedWarnings && warningMessages.length > 0;
                const unlinkedItems = entry.unlinked || [];
                const hasUnlinked = unlinkedItems.length > 0;
                const diff: ImportDiff = liveDiff
                  ? buildImportDiffFromDiffResult(liveDiff)
                  : entry.diff || {
                      created: [],
                      updated: [],
                      deleted: [],
                      renamed: [],
                      ambiguities: [],
                    };

                return (
                  <Fragment key={entry.id}>
                    <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60" onClick={() => toggleRow(entry.id)}>
                      <td className="py-2.5 pl-2 pr-1 text-xs font-medium text-gray-900 dark:text-gray-100 sm:pl-3">
                        <div className="flex items-center gap-2">
                          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                          <div>
                            <div className="font-semibold break-words">{entry.id}</div>
                            <div className="text-gray-500 dark:text-gray-400 break-words">{formatTimestamp(entry.timestamp)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-1.5 py-2.5 text-xs text-gray-700 dark:text-gray-300">
                        {(() => {
                          const files = splitFilenamesList(entry.filename);
                          return (
                            <div className="w-full max-w-[220px] sm:max-w-[260px] md:max-w-[300px] lg:max-w-[360px]" title={entry.filename}>
                              <div className="flex flex-wrap gap-1">
                                {files.length === 0 ? (
                                  <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 px-2 py-0.5 max-w-[170px] sm:max-w-[215px] truncate">
                                    <span className="truncate font-semibold">—</span>
                                  </div>
                                ) : (
                                  files.map((file, idx) => {
                                    const { base } = splitFilenameParts(file);
                                    return (
                                      <div
                                        key={`${file}-${idx}`}
                                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 px-2 py-0.5 max-w-[170px] sm:max-w-[215px] truncate"
                                        title={file}
                                      >
                                        <span className="truncate font-semibold">{base || '—'}</span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-1.5 py-2.5 text-xs text-gray-700 dark:text-gray-300 break-words">{entry.plant}</td>
                      <td className="px-1.5 py-2.5 text-xs text-gray-700 dark:text-gray-300 break-words">{entry.sourceType}</td>
                      <td className="px-1.5 py-2.5 text-xs text-center text-gray-700 dark:text-gray-300">{counts.created ?? 0}</td>
                      <td className="px-1.5 py-2.5 text-xs text-center text-gray-700 dark:text-gray-300">{counts.updated ?? 0}</td>
                      <td className="px-1.5 py-2.5 text-xs text-center text-gray-700 dark:text-gray-300">{counts.deleted ?? 0}</td>
                      <td className="px-1.5 py-2.5 text-xs text-center text-gray-700 dark:text-gray-300">{counts.renamed ?? 0}</td>
                      <td className="px-1.5 py-2.5 text-xs text-center text-gray-700 dark:text-gray-300">{counts.ambiguous ?? 0}</td>
                      <td className="px-1.5 py-2.5 text-xs">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClassMap[entry.status]}`}>
                          {entry.status === 'clean' ? 'Clean' : 'Needs resolution'}
                        </span>
                      </td>
                      <td className="px-1.5 py-2.5 text-xs text-gray-700 dark:text-gray-300 break-words">
                        {entry.warnings && entry.warnings.length > 0 ? `${entry.warnings.length} warning(s)` : '—'}
                      </td>
                      <td className="px-1.5 py-2.5 text-xs text-gray-500 text-right">
                        <WarningsIcon className="w-4 h-4 inline-block" />
                      </td>
                    </tr>

                    {expanded && (
                      <tr>
                        <td colSpan={12} className="bg-gray-50 dark:bg-gray-800/60 px-6 py-4">
                          <div className="space-y-6">
                            {hasDetailedWarnings || hasSimpleWarnings || hasUnlinked ? (
                              <WarningsSection
                                detailedWarnings={filteredDetailedWarnings}
                                simpleWarnings={warningMessages}
                                hasDetailedWarnings={hasDetailedWarnings}
                                hasSimpleWarnings={hasSimpleWarnings}
                                entryId={entry.id}
                                warningGroupExpanded={warningGroupExpanded}
                                toggleWarningGroup={toggleWarningGroup}
                                unlinkedItems={unlinkedItems}
                              />
                            ) : null}

                            <DiffSection title="Created" items={diff.created} />
                            <DiffSection title="Updated" items={diff.updated} />
                            <DiffSection title="Deleted" items={diff.deleted} />
                            <RenameSection items={diff.renamed} />
                            <AmbiguitySection items={diff.ambiguities} />
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

function buildImportDiffFromDiffResult(diff: DiffResult): ImportDiff {
  const created: DiffItem[] = diff.creates.map(item => ({
    item: `${capitalize(item.entityType)} ${item.key}`,
    detail: `Plant ${item.plantKey}`,
  }))

  const updated: DiffItem[] = diff.updates.map(item => ({
    item: `${capitalize(item.entityType)} ${item.key}`,
    detail: item.changedFields.length ? `Changed: ${item.changedFields.join(', ')}` : undefined,
  }))

  const deleted: DiffItem[] = diff.deletes.map(item => ({
    item: `${capitalize(item.entityType)} ${item.key}`,
    detail: item.lastSeen ? `Last seen ${item.lastSeen}` : undefined,
  }))

  const renamed: RenameItem[] = diff.renamesOrMoves.map(item => ({
    from: item.oldKey || 'unknown',
    to: item.newKey,
    reason: item.matchReasons?.join(', ') || undefined,
  }))

  const ambiguities: AmbiguityItem[] = diff.ambiguous.map(item => ({
    item: `${capitalize(item.entityType)} ${item.newKey}`,
    candidates: item.candidates.map(c => ({
      name: c.key,
      score: c.matchScore / 100,
      reason: c.reasons.join(', '),
    })),
  }))

  return { created, updated, deleted, renamed, ambiguities }
}

function capitalize(input: string): string {
  if (!input) return input;
  return input.charAt(0).toUpperCase() + input.slice(1);
}

interface WarningsSectionProps {
  detailedWarnings: IngestionWarning[];
  simpleWarnings: string[];
  hasDetailedWarnings: boolean;
  hasSimpleWarnings: boolean;
  entryId: string;
  warningGroupExpanded: Record<string, boolean>;
  toggleWarningGroup: (entryId: string, kind: string) => void;
  unlinkedItems: UnlinkedItem[];
}

function WarningsSection({
  detailedWarnings,
  simpleWarnings,
  hasDetailedWarnings,
  hasSimpleWarnings,
  entryId,
  warningGroupExpanded,
  toggleWarningGroup,
  unlinkedItems,
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
  const groupedUnlinked = useMemo(() => {
    const groups: Record<string, UnlinkedItem[]> = { Robot: [], Tool: [] };
    unlinkedItems.forEach((item) => {
      if (!groups[item.type]) {
        groups[item.type] = [];
      }
      groups[item.type].push(item);
    });
    return groups;
  }, [unlinkedItems]);

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

  const hasUnlinked = unlinkedItems.length > 0;
  const warningsCount = hasDetailedWarnings ? detailedWarnings.length : hasSimpleWarnings ? simpleWarnings.length : 0;
  const totalIssues = warningsCount + unlinkedItems.length;
  const headingLabel = 'Warnings';

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm overflow-hidden max-w-full">
      {/* Header */}
      <div className="border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
              {headingLabel} ({totalIssues})
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Issues found during import that may require attention
              
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-w-full">
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
                <div key={kind} className={`rounded-lg border ${colors.border} shadow-sm overflow-hidden bg-white dark:bg-gray-900 max-w-full`}>
                  {/* Group header */}
                  <button
                    onClick={() => toggleWarningGroup(entryId, kind)}
                    className={`w-full px-4 py-3 flex items-center justify-between ${colors.bg} hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className={`w-4 h-4 flex-shrink-0 ${colors.text}`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${colors.text}`} />
                      )}
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${colors.badge} text-white`}>
                        {kind}
                      </div>
                      <span className={`text-sm font-semibold ${colors.text} truncate`}>
                        {warnings.length} {warnings.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </button>

                  {/* Group content */}
                  {isExpanded && (
                    <div className="max-h-80 overflow-auto w-full">
                      <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-1/4 min-w-[150px]">
                              Location
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-16">
                              Row
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-1/2 min-w-[200px]">
                              Message
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                          {warnings.map((w) => (
                            <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-[200px]">
                                <div className="font-medium truncate">{w.fileName || 'Unknown'}</div>
                                {w.sheetName && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                                    Sheet: {w.sheetName}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-center font-mono whitespace-nowrap">
                                {w.rowIndex ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200 break-words">
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

        {hasUnlinked ? (
          <div className="space-y-2">
            {Object.entries(groupedUnlinked).map(([type, items]) => {
              const key = `${entryId}-unlinked-${type}`;
              const isExpanded = warningGroupExpanded[key] ?? true;
              const colors = getKindColors(type);
              const label = type === 'Robot' ? 'UNLINKED ROBOTS' : type === 'Tool' ? 'UNLINKED TOOLS' : `Unlinked ${type}`;

              return (
                <div key={type} className={`rounded-lg border ${colors.border} shadow-sm overflow-hidden bg-white dark:bg-gray-900 max-w-full`}>
                  <button
                    onClick={() => toggleWarningGroup(entryId, `unlinked-${type}`)}
                    className={`w-full px-4 py-3 flex items-center justify-between ${colors.bg} hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className={`w-4 h-4 flex-shrink-0 ${colors.text}`} />
                      ) : (
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${colors.text}`} />
                      )}
                      <div className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${colors.badge} text-white`}>
                        {label}
                      </div>
                      <span className={`text-sm font-semibold ${colors.text} truncate`}>
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="max-h-80 overflow-auto w-full">
                      {items.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">No unlinked items.</div>
                      ) : (
                        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-1/4 min-w-[150px]">
                                Item Name
                              </th>
                              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-1/2 min-w-[200px]">
                                Reason
                              </th>
                              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">
                                Resolution
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                            {items.map((item, idx) => {
                              const hasReference = item.reason.toLowerCase().includes('not found') ||
                                                item.reason.toLowerCase().includes('missing') ||
                                                item.reason.toLowerCase().includes('unknown');

                              return (
                                <tr key={`${item.item}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[200px] break-words">
                                    {item.item}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 break-words">
                                    {item.reason}
                                  </td>
                                  <td className="px-4 py-3 text-xs whitespace-nowrap">
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
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
