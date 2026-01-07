import { useCoreStore } from '../../domain/coreStore'
import { PageHeader } from '../../ui/components/PageHeader'
import { ImportRun, DiffResult } from '../../domain/uidTypes'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

export default function ImportHistoryPage() {
  const { importRuns, diffResults } = useCoreStore()
  const [selectedImportRunId, setSelectedImportRunId] = useState<string | null>(null)

  const selectedDiff = diffResults.find(d => d.importRunId === selectedImportRunId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import History"
        subtitle="View all Excel imports and their diff results"
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Recent Imports
          </h3>

          {importRuns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No imports yet. Upload an Excel file to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {importRuns.slice().reverse().map((run) => (
                <ImportRunCard
                  key={run.id}
                  run={run}
                  isSelected={selectedImportRunId === run.id}
                  onClick={() => setSelectedImportRunId(run.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDiff && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Diff Result
            </h3>
            <DiffResultView diff={selectedDiff} />
          </div>
        </div>
      )}
    </div>
  )
}

interface ImportRunCardProps {
  run: ImportRun
  isSelected: boolean
  onClick: () => void
}

function ImportRunCard({ run, isSelected, onClick }: ImportRunCardProps) {
  const hasWarnings = (run.warnings?.length ?? 0) > 0 || run.counts.ambiguous > 0
  const status = hasWarnings ? 'needs resolution' : 'clean'

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-lg border transition-colors
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">
              {run.sourceFileName}
            </h4>
            <span className={`
              px-2 py-0.5 text-xs font-medium rounded-full
              ${status === 'clean'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }
            `}>
              {status}
            </span>
          </div>

          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {run.sourceType} • Plant: {run.plantKey} ({run.plantKeySource})
            {run.modelKey && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                Model: {run.modelKey}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="text-green-600 dark:text-green-400">
              +{run.counts.created} created
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              ~{run.counts.updated} updated
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              ↔{run.counts.renamed} renamed
            </span>
            <span className="text-red-600 dark:text-red-400">
              -{run.counts.deleted} deleted
            </span>
            {run.counts.ambiguous > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400">
                ?{run.counts.ambiguous} ambiguous
              </span>
            )}
          </div>

          <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {formatDistanceToNow(new Date(run.importedAt), { addSuffix: true })}
          </div>
        </div>
      </div>

      {run.warnings && run.warnings.length > 0 && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200 dark:border-yellow-800">
          <ul className="text-xs text-yellow-800 dark:text-yellow-400 space-y-1">
            {run.warnings.map((warning, idx) => (
              <li key={idx}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </button>
  )
}

interface DiffResultViewProps {
  diff: DiffResult
}

function DiffResultView({ diff }: DiffResultViewProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Created" value={diff.summary.created} color="green" />
        <StatCard label="Updated" value={diff.summary.updated} color="blue" />
        <StatCard label="Renamed" value={diff.summary.renamed} color="gray" />
        <StatCard label="Deleted" value={diff.summary.deleted} color="red" />
        <StatCard label="Ambiguous" value={diff.summary.ambiguous} color="yellow" />
      </div>

      {diff.creates.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Creates ({diff.creates.length})
          </h4>
          <div className="space-y-2">
            {diff.creates.slice(0, 10).map((create, idx) => (
              <div key={idx} className="p-2 bg-green-50 dark:bg-green-900/10 rounded text-sm">
                <span className="font-mono text-green-700 dark:text-green-400">
                  {create.key}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  ({create.entityType})
                </span>
                {create.suggestedName && (
                  <span className="text-gray-500 dark:text-gray-500 ml-2">
                    "{create.suggestedName}"
                  </span>
                )}
              </div>
            ))}
            {diff.creates.length > 10 && (
              <p className="text-xs text-gray-500">
                ...and {diff.creates.length - 10} more
              </p>
            )}
          </div>
        </div>
      )}

      {diff.updates.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Updates ({diff.updates.length})
          </h4>
          <div className="space-y-2">
            {diff.updates.slice(0, 10).map((update, idx) => (
              <div key={idx} className="p-2 bg-blue-50 dark:bg-blue-900/10 rounded text-sm">
                <span className="font-mono text-blue-700 dark:text-blue-400">
                  {update.key}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  ({update.entityType})
                </span>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Changed: {update.changedFields.join(', ')}
                </div>
              </div>
            ))}
            {diff.updates.length > 10 && (
              <p className="text-xs text-gray-500">
                ...and {diff.updates.length - 10} more
              </p>
            )}
          </div>
        </div>
      )}

      {diff.renamesOrMoves.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Renames/Moves ({diff.renamesOrMoves.length})
          </h4>
          <div className="space-y-2">
            {diff.renamesOrMoves.slice(0, 10).map((rename, idx) => (
              <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-900/10 rounded text-sm">
                <span className="font-mono text-gray-700 dark:text-gray-400">
                  {rename.oldKey ?? '(new)'} → {rename.newKey}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  ({rename.entityType})
                </span>
                {rename.requiresUserDecision && (
                  <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs rounded">
                    Needs resolution
                  </span>
                )}
              </div>
            ))}
            {diff.renamesOrMoves.length > 10 && (
              <p className="text-xs text-gray-500">
                ...and {diff.renamesOrMoves.length - 10} more
              </p>
            )}
          </div>
        </div>
      )}

      {diff.ambiguous.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Ambiguous ({diff.ambiguous.length})
          </h4>
          <div className="space-y-2">
            {diff.ambiguous.map((amb, idx) => (
              <div key={idx} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200 dark:border-yellow-800">
                <div className="font-mono text-yellow-800 dark:text-yellow-400 text-sm mb-2">
                  {amb.newKey} ({amb.entityType})
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mb-2">
                  {amb.candidates.length} possible matches:
                </div>
                <ul className="space-y-1 text-xs">
                  {amb.candidates.map((cand, cidx) => (
                    <li key={cidx} className="text-gray-600 dark:text-gray-400">
                      • {cand.key} (score: {cand.matchScore}) - {cand.reasons.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {diff.warnings && diff.warnings.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Warnings
          </h4>
          <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-400">
            {diff.warnings.map((warning, idx) => (
              <li key={idx} className="p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded">
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: number
  color: 'green' | 'blue' | 'gray' | 'red' | 'yellow'
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400',
    blue: 'bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400',
    gray: 'bg-gray-50 dark:bg-gray-900/10 text-gray-700 dark:text-gray-400',
    red: 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400'
  }

  return (
    <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm">{label}</div>
    </div>
  )
}
