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
  const rows = useMemo(
    () => [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [entries]
  );

  const toggleRow = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
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

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        {!hasData ? (
          <div className="p-6 text-sm text-gray-600 dark:text-gray-300">
            No imports yet. Run a Data Loader import to see history and detailed diffs here.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
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
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">
                        <div className="flex items-center gap-2">
                          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                          <div>
                            <div className="font-semibold">{entry.id}</div>
                            <div className="text-gray-500 dark:text-gray-400">{formatTimestamp(entry.timestamp)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">{entry.filename}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">{entry.plant}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">{entry.sourceType}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.created ?? 0}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.updated ?? 0}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.deleted ?? 0}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.renamed ?? 0}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center text-gray-700 dark:text-gray-300">{counts.ambiguous ?? 0}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClassMap[entry.status]}`}>
                          {entry.status === 'clean' ? 'Clean' : 'Needs resolution'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {entry.warnings && entry.warnings.length > 0 ? `${entry.warnings.length} warning(s)` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                        <WarningsIcon className="w-4 h-4 inline-block" />
                      </td>
                    </tr>

                    {expanded && (
                      <tr>
                        <td colSpan={12} className="bg-gray-50 dark:bg-gray-800/60 px-6 py-4">
                          <div className="space-y-4">
                            {(entry.warningsDetailed && entry.warningsDetailed.length > 0) || (entry.warnings && entry.warnings.length > 0) ? (
                              <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-3 space-y-2">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-300 mt-0.5" />
                                  <div className="space-y-1">
                                    {(entry.warningsDetailed && entry.warningsDetailed.length > 0
                                      ? entry.warningsDetailed.map((w) => w.message)
                                      : entry.warnings || []
                                    ).map((warning) => (
                                      <div key={warning} className="text-sm text-amber-800 dark:text-amber-200">
                                        {warning}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {entry.warningsDetailed && entry.warningsDetailed.length > 0 && (
                                  <div className="overflow-hidden rounded-md border border-amber-200 dark:border-amber-700">
                                    <table className="min-w-full divide-y divide-amber-200 dark:divide-amber-800">
                                      <thead className="bg-amber-100 dark:bg-amber-900/40">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-900 dark:text-amber-100">Kind</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-900 dark:text-amber-100">File / Sheet</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-900 dark:text-amber-100">Row</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-amber-900 dark:text-amber-100">Message</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-amber-100 dark:divide-amber-800 bg-amber-50 dark:bg-amber-950/30">
                                        {entry.warningsDetailed.map((w) => (
                                          <tr key={w.id}>
                                            <td className="px-3 py-2 text-xs text-amber-900 dark:text-amber-100">{w.kind}</td>
                                            <td className="px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                                              {w.fileName || '—'}
                                              {w.sheetName ? ` / ${w.sheetName}` : ''}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-amber-900 dark:text-amber-100">{w.rowIndex ?? '—'}</td>
                                            <td className="px-3 py-2 text-xs text-amber-900 dark:text-amber-100 whitespace-pre-wrap">{w.message}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ) : null}

                            <DiffSection title="Created" items={diff.created} />
                            <DiffSection title="Updated" items={diff.updated} />
                            <DiffSection title="Deleted" items={diff.deleted} />
                            <RenameSection items={diff.renamed} />
                            <AmbiguitySection items={diff.ambiguities} />

                            {entry.unlinked && entry.unlinked.length > 0 && (
                              <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-3">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-300 mt-0.5" />
                                  <div>
                                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">Unlinked items</h4>
                                    <ul className="mt-2 space-y-1">
                                      {entry.unlinked.map((item) => (
                                        <li key={`${item.type}-${item.item}`} className="text-sm text-red-800 dark:text-red-200">
                                          <span className="font-medium">{item.type}</span> {item.item} — {item.reason}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
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
