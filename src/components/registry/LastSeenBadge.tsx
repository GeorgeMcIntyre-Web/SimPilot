import { formatDistanceToNow } from 'date-fns'
import { useCoreStore } from '../../domain/coreStore'

interface LastSeenBadgeProps {
  lastSeenImportRunId?: string
  status: 'active' | 'inactive'
}

/**
 * Display relative timestamp for when an entity was last seen in an import.
 * Shows warning badge for inactive entities not seen in 30+ days.
 */
export function LastSeenBadge({ lastSeenImportRunId, status }: LastSeenBadgeProps) {
  const { importRuns } = useCoreStore()

  // If no lastSeenImportRunId, entity has never been seen in an import
  if (!lastSeenImportRunId) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        Never seen
      </span>
    )
  }

  // Find the import run
  const importRun = importRuns.find(run => run.id === lastSeenImportRunId)

  if (!importRun) {
    // Import run not found (may have been deleted or old data)
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        Unknown
      </span>
    )
  }

  // Calculate days since last seen
  const importDate = new Date(importRun.importedAt)
  const daysSinceLastSeen = Math.floor((Date.now() - importDate.getTime()) / (1000 * 60 * 60 * 24))
  const isStale = status === 'inactive' && daysSinceLastSeen >= 30

  // Format relative time
  const relativeTime = formatDistanceToNow(importDate, { addSuffix: true })

  if (isStale) {
    // Warning badge for inactive entities not seen in 30+ days
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {relativeTime}
        </span>
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Stale
        </span>
      </div>
    )
  }

  // Normal display
  return (
    <span className="text-xs text-gray-600 dark:text-gray-400">
      {relativeTime}
    </span>
  )
}
