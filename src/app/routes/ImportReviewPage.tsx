import { useNavigate, useParams } from 'react-router-dom'
import { useCoreStore, coreStore } from '../../domain/coreStore'
import { PageHeader } from '../../ui/components/PageHeader'
import { createAliasRule } from '../../ingestion/uidResolver'
import { useState } from 'react'

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

  if (ambiguousItems.length === 0) {
    return (
      <div className="p-6">
        <PageHeader title="Review Import" subtitle="No ambiguous items" />
        <button
          onClick={() => navigate('/import-history')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Import History
        </button>
      </div>
    )
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

      <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-400">
          <strong>No silent guessing:</strong> The following items have multiple possible matches.
          You must decide whether to link to an existing entity or create a new one.
        </p>
      </div>

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
