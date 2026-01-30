import { Fragment, useMemo, useState } from 'react'
import type { JSX } from 'react'
import type { DiffResult, DiffCreate, DiffUpdate, DiffDelete, DiffRenameOrMove, DiffAmbiguous } from '../../../domain/uidTypes'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface DiffResultsTabProps {
  diffResults: DiffResult[]
}

export function DiffResultsTab({ diffResults }: DiffResultsTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const rows = useMemo(
    () => [...diffResults].sort((a, b) => new Date(b.computedAt).getTime() - new Date(a.computedAt).getTime()),
    [diffResults]
  )

  const toggleRow = (id: string) => {
    setExpandedId(current => current === id ? null : id)
  }

  const hasData = rows.length > 0

  return (
    <div className="space-y-4">
      <div>
        <h3 className="typography-title-sm text-gray-900 dark:text-gray-100">Diff Results (live from store)</h3>
        <p className="typography-subtitle text-gray-500 dark:text-gray-400">
          These rows are built directly from `coreStore.diffResults`, so they stay in sync with ambiguity resolution and reactivations.
        </p>
      </div>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg overflow-x-auto">
        {!hasData ? (
          <div className="p-6 typography-body text-gray-600 dark:text-gray-300">
            No diff results yet. Run an import to generate diffs.
          </div>
        ) : (
          <table className="w-full table-auto divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left typography-label text-gray-900 dark:text-gray-100 sm:pl-6">Import</th>
                <th scope="col" className="px-3 py-3.5 text-left typography-label text-gray-900 dark:text-gray-100">Filename</th>
                <th scope="col" className="px-3 py-3.5 text-left typography-label text-gray-900 dark:text-gray-100">Plant</th>
                <th scope="col" className="px-3 py-3.5 text-left typography-label text-gray-900 dark:text-gray-100">Source</th>
                <th scope="col" className="px-3 py-3.5 text-center typography-label text-gray-900 dark:text-gray-100">Created</th>
                <th scope="col" className="px-3 py-3.5 text-center typography-label text-gray-900 dark:text-gray-100">Updated</th>
                <th scope="col" className="px-3 py-3.5 text-center typography-label text-gray-900 dark:text-gray-100">Deleted</th>
                <th scope="col" className="px-3 py-3.5 text-center typography-label text-gray-900 dark:text-gray-100">Renamed</th>
                <th scope="col" className="px-3 py-3.5 text-center typography-label text-gray-900 dark:text-gray-100">Ambiguous</th>
                <th scope="col" className="px-3 py-3.5 text-left typography-label text-gray-900 dark:text-gray-100">Computed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {rows.map(entry => {
                const expanded = expandedId === entry.importRunId
                const { summary } = entry
                return (
                  <Fragment key={entry.importRunId}>
                    <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60" onClick={() => toggleRow(entry.importRunId)}>
                      <td className="py-4 pl-4 pr-3 typography-body-strong text-gray-900 dark:text-gray-100 sm:pl-6">
                        <div className="flex items-center gap-2">
                          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                          <div className="min-w-0">
                            <div className="typography-body-strong break-words">{entry.importRunId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 typography-caption text-gray-700 dark:text-gray-300 break-words">{entry.sourceFile}</td>
                      <td className="px-3 py-4 typography-caption text-gray-700 dark:text-gray-300 break-words">{entry.plantKey}</td>
                      <td className="px-3 py-4 typography-caption text-gray-700 dark:text-gray-300 break-words">{entry.sourceType}</td>
                      <td className="px-3 py-4 typography-caption text-center text-gray-700 dark:text-gray-300">{summary.created}</td>
                      <td className="px-3 py-4 typography-caption text-center text-gray-700 dark:text-gray-300">{summary.updated}</td>
                      <td className="px-3 py-4 typography-caption text-center text-gray-700 dark:text-gray-300">{summary.deleted}</td>
                      <td className="px-3 py-4 typography-caption text-center text-gray-700 dark:text-gray-300">{summary.renamed}</td>
                      <td className="px-3 py-4 typography-caption text-center text-gray-700 dark:text-gray-300">{summary.ambiguous}</td>
                      <td className="px-3 py-4 typography-caption text-gray-700 dark:text-gray-300">{formatTimestamp(entry.computedAt)}</td>
                    </tr>

                    {expanded && (
                      <tr>
                        <td colSpan={10} className="bg-gray-50 dark:bg-gray-800/60 px-6 py-4">
                          <div className="space-y-4">
                            <DiffSection title="Created" items={entry.creates} renderItem={renderCreate} />
                            <DiffSection title="Updated" items={entry.updates} renderItem={renderUpdate} />
                            <DiffSection title="Deleted" items={entry.deletes} renderItem={renderDelete} />
                            <DiffSection title="Renamed / Moved" items={entry.renamesOrMoves} renderItem={renderRename} />
                            <DiffSection title="Ambiguous" items={entry.ambiguous} renderItem={renderAmbiguous} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function DiffSection<T>({ title, items, renderItem }: { title: string; items: T[]; renderItem: (item: T) => JSX.Element }) {
  if (!items.length) return null
  return (
    <div>
      <h4 className="typography-label text-gray-900 dark:text-gray-100">{title}</h4>
      <div className="mt-2 space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 typography-body text-gray-900 dark:text-gray-100">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  )
}

function renderCreate(item: DiffCreate) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{item.key}</span>
      <span className="text-gray-600 dark:text-gray-400">Type: {item.entityType} • Plant: {item.plantKey}</span>
      {item.suggestedName && <span className="text-gray-500 dark:text-gray-400">Suggested: {item.suggestedName}</span>}
    </div>
  )
}

function renderUpdate(item: DiffUpdate) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{item.key}</span>
      <span className="text-gray-600 dark:text-gray-400">Type: {item.entityType} • Plant: {item.plantKey}</span>
      {item.changedFields.length > 0 && (
        <span className="text-gray-500 dark:text-gray-400">Changed fields: {item.changedFields.join(', ')}</span>
      )}
    </div>
  )
}

function renderDelete(item: DiffDelete) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{item.key}</span>
      <span className="text-gray-600 dark:text-gray-400">Type: {item.entityType} • Plant: {item.plantKey}</span>
      <span className="text-gray-500 dark:text-gray-400">Last seen: {item.lastSeen}</span>
    </div>
  )
}

function renderRename(item: DiffRenameOrMove) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{item.oldKey || 'Unknown'} → {item.newKey}</span>
      <span className="text-gray-600 dark:text-gray-400">
        Type: {item.entityType} • Plant: {item.plantKey} • Confidence: {item.confidence}%
      </span>
      {item.matchReasons?.length ? (
        <span className="text-gray-500 dark:text-gray-400">Reasons: {item.matchReasons.join(', ')}</span>
      ) : null}
    </div>
  )
}

function renderAmbiguous(item: DiffAmbiguous) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <span className="font-medium">{item.newKey}</span>
        <span className="text-gray-600 dark:text-gray-400 ml-2">Type: {item.entityType} • Plant: {item.plantKey}</span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">Candidates:</div>
      <ul className="text-sm list-disc list-inside space-y-1 text-gray-900 dark:text-gray-100">
        {item.candidates.map(candidate => (
          <li key={candidate.uid}>
            <span className="font-medium">{candidate.key}</span> — score {candidate.matchScore}% ({candidate.reasons.join(', ')})
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatTimestamp(ts: string) {
  const date = new Date(ts)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}
