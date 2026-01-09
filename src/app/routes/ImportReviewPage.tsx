import { useNavigate, useParams } from 'react-router-dom'
import { useCoreStore, coreStore } from '../../domain/coreStore'
import { PageHeader } from '../../ui/components/PageHeader'
import { createAliasRule } from '../../ingestion/uidResolver'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { DiffDelete, DiffRenameOrMove, DiffUpdate, DiffCreate } from '../../domain/uidTypes'

export default function ImportReviewPage() {
  const { importRunId } = useParams<{ importRunId: string }>()
  const navigate = useNavigate()
  const { diffResults, importRuns } = useCoreStore()
  const [resolving, setResolving] = useState(false)

  const diffResult = diffResults.find(d => d.importRunId === importRunId)
  const importRun = importRuns.find(r => r.id === importRunId)

  if (!diffResult || !importRun) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Import not found</p>
      </div>
    )
  }

  const ambiguousItems = diffResult.ambiguous
  const creates = diffResult.creates
  const updates = diffResult.updates
  const deletes = diffResult.deletes
  const renames = diffResult.renamesOrMoves

  const summaryItems = useMemo(
    () => [
      { label: 'Created', value: creates.length },
      { label: 'Updated', value: updates.length },
      { label: 'Deleted', value: deletes.length },
      { label: 'Renamed', value: renames.length },
      { label: 'Ambiguous', value: ambiguousItems.length }
    ],
    [creates.length, updates.length, deletes.length, renames.length, ambiguousItems.length]
  )

  const handleReactivate = (item: DiffDelete) => {
    setResolving(true)
    if (item.entityType === 'station') {
      coreStore.reactivateStation(item.uid)
    } else if (item.entityType === 'tool') {
      coreStore.reactivateTool(item.uid)
    } else if (item.entityType === 'robot') {
      coreStore.reactivateRobot(item.uid)
    }
    setResolving(false)
  }

  const handleLinkToCandidate = (ambiguousKey: string, candidateUid: string, entityType: string) => {
    setResolving(true)

    const rule = createAliasRule(
      ambiguousKey,
      candidateUid,
      entityType as any,
      `User linked ${ambiguousKey} to ${candidateUid} via Import Review`,
      'local-user'
    )

    coreStore.createAliasRule(rule)

    // Remove this ambiguous item from the diff
    const updatedAmbiguous = ambiguousItems.filter(a => a.newKey !== ambiguousKey)
    coreStore.updateDiffResult(importRunId!, {
      ambiguous: updatedAmbiguous,
      summary: {
        ...diffResult.summary,
        ambiguous: updatedAmbiguous.length
      }
    })

    setResolving(false)
  }

  const handleCreateNew = (ambiguousKey: string) => {
    setResolving(true)

    // Simply remove from ambiguous list - will be created as new entity
    const updatedAmbiguous = ambiguousItems.filter(a => a.newKey !== ambiguousKey)
    coreStore.updateDiffResult(importRunId!, {
      ambiguous: updatedAmbiguous,
      summary: {
        ...diffResult.summary,
        ambiguous: updatedAmbiguous.length
      }
    })

    setResolving(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Import"
        subtitle={`${importRun.sourceFileName} - ${ambiguousItems.length} ambiguous items`}
      />

      {ambiguousItems.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-400">
            No ambiguous items detected in this import. Review changes below or return to history.
          </p>
        </div>
      )}

      <SummaryGrid items={summaryItems} />

      <DiffSection title="Created" items={creates} renderItem={renderCreate} />
      <DiffSection title="Updated" items={updates} renderItem={renderUpdate} />
      <DiffSection title="Renamed / Moved" items={renames} renderItem={renderRename} />
      <DeleteSection items={deletes} onReactivate={handleReactivate} resolving={resolving} />

      {ambiguousItems.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-400">
            <strong>No silent guessing:</strong> The following items have multiple possible matches.
            You must decide whether to link to an existing entity or create a new one.
          </p>
        </div>
      )}

      {ambiguousItems.length > 0 && (
        <div className="space-y-4">
          {ambiguousItems.map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {item.newKey}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.entityType} • Plant: {item.plantKey}
                </p>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Possible matches ({item.candidates.length}):
                </h4>
                <div className="space-y-2">
                  {item.candidates.map((candidate, cidx) => (
                    <div
                      key={cidx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex-1">
                        <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                          {candidate.key}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Score: {candidate.matchScore} • {candidate.reasons.join(', ')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleLinkToCandidate(item.newKey, candidate.uid, item.entityType)}
                        disabled={resolving}
                        className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Link to this
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleCreateNew(item.newKey)}
                  disabled={resolving}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Create as new entity
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {ambiguousItems.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-400">
            ✓ All ambiguous items resolved!
          </p>
          <button
            onClick={() => navigate('/import-history')}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Import History
          </button>
        </div>
      )}
    </div>
  )
}

function SummaryGrid({ items }: { items: Array<{ label: string; value: number }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map(item => (
        <div key={item.label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{item.label}</div>
          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

function DiffSection<T>({ title, items, renderItem }: { title: string; items: T[]; renderItem: (item: T) => ReactNode }) {
  if (!items.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  )
}

function renderCreate(item: DiffCreate) {
  return (
    <div className="flex flex-col gap-1 text-sm text-gray-900 dark:text-gray-100">
      <span className="font-medium">{item.key}</span>
      <span className="text-gray-600 dark:text-gray-400">Type: {item.entityType} • Plant: {item.plantKey}</span>
      {item.suggestedName && <span className="text-gray-500 dark:text-gray-400">Suggested: {item.suggestedName}</span>}
    </div>
  )
}

function renderUpdate(item: DiffUpdate) {
  return (
    <div className="flex flex-col gap-1 text-sm text-gray-900 dark:text-gray-100">
      <span className="font-medium">{item.key}</span>
      <span className="text-gray-600 dark:text-gray-400">Type: {item.entityType} • Plant: {item.plantKey}</span>
      {item.changedFields.length > 0 && (
        <span className="text-gray-500 dark:text-gray-400">Changed fields: {item.changedFields.join(', ')}</span>
      )}
    </div>
  )
}

function renderRename(item: DiffRenameOrMove) {
  return (
    <div className="flex flex-col gap-1 text-sm text-gray-900 dark:text-gray-100">
      <span className="font-medium">{item.oldKey || 'Unknown'} → {item.newKey}</span>
      <span className="text-gray-600 dark:text-gray-400">
        Type: {item.entityType} • Plant: {item.plantKey} • Confidence: {item.confidence}%
      </span>
      {item.matchReasons.length > 0 && (
        <span className="text-gray-500 dark:text-gray-400">Reasons: {item.matchReasons.join(', ')}</span>
      )}
    </div>
  )
}

function DeleteSection({ items, onReactivate, resolving }: { items: DiffDelete[]; onReactivate: (item: DiffDelete) => void; resolving: boolean }) {
  if (!items.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Deleted</h3>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
            <div className="flex flex-col text-sm text-gray-900 dark:text-gray-100">
              <span className="font-medium">{item.key}</span>
              <span className="text-gray-600 dark:text-gray-400">Type: {item.entityType} • Plant: {item.plantKey}</span>
              <span className="text-gray-500 dark:text-gray-400">Last seen: {item.lastSeen}</span>
            </div>
            <button
              onClick={() => onReactivate(item)}
              disabled={resolving}
              className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
            >
              Reactivate
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
