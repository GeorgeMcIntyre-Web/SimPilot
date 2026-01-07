import { useState, useMemo } from 'react'
import { useCoreStore } from '../../domain/coreStore'
import { PageHeader } from '../../ui/components/PageHeader'
import { filterAuditLog, formatAuditEntry, type AuditAction } from '../../domain/auditLog'
import { EntityType } from '../../domain/uidTypes'
import { formatDistanceToNow, format } from 'date-fns'

export default function AuditTrailPage() {
  const { auditLog } = useCoreStore()
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | 'all'>('all')
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Filter audit log
  const filteredEntries = useMemo(() => {
    let entries = auditLog

    // Apply filter utility
    entries = filterAuditLog(entries, {
      entityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
      action: actionFilter === 'all' ? undefined : actionFilter,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined
    })

    // Search filter (UID or key)
    if (searchTerm) {
      entries = entries.filter(e =>
        e.entityUid.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.entityKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.user?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [auditLog, entityTypeFilter, actionFilter, searchTerm, fromDate, toDate])

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'Entity Type', 'Entity Key', 'Action', 'Old Value', 'New Value', 'Reason', 'User']
    const rows = filteredEntries.map(e => [
      e.timestamp,
      e.entityType,
      e.entityKey,
      e.action,
      JSON.stringify(e.oldValue),
      JSON.stringify(e.newValue),
      e.reason || '',
      e.user || ''
    ])

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-trail-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        description="Complete history of all registry changes"
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="text"
              placeholder="Search by UID, key, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value as EntityType | 'all')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Entity Types</option>
              <option value="station">Stations</option>
              <option value="tool">Tools</option>
              <option value="robot">Robots</option>
            </select>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as AuditAction | 'all')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Actions</option>
              <option value="activate">Activate</option>
              <option value="deactivate">Deactivate</option>
              <option value="add_alias">Add Alias</option>
              <option value="override_label">Override Label</option>
              <option value="update_attributes">Update Attributes</option>
              <option value="create_entity">Create Entity</option>
              <option value="delete_entity">Delete Entity</option>
            </select>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">From:</label>
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">To:</label>
              <input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={handleExportCSV}
              disabled={filteredEntries.length === 0}
              className="ml-auto px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV ({filteredEntries.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                {auditLog.length === 0
                  ? 'No audit entries yet. Registry actions will appear here.'
                  : 'No entries match your filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${entry.action === 'activate' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            entry.action === 'deactivate' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            entry.action === 'add_alias' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}
                        `}>
                          {entry.action.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          {entry.entityType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">
                        {formatAuditEntry(entry)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span title={entry.timestamp}>
                          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                        </span>
                        <code className="text-xs">{entry.entityUid}</code>
                        {entry.user && <span>by {entry.user}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
