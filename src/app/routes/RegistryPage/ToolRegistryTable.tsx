import { useState } from 'react'
import { CanonicalIdDisplay } from '../../components/registry/CanonicalIdDisplay'
import { LastSeenBadge } from '../../components/registry/LastSeenBadge'
import { ToolRecord } from '../../domain/uidTypes'

type ToolRegistryTableProps = {
  tools: ToolRecord[]
  searchTerm: string
  onToggleActive: (tool: ToolRecord, reason?: string | null) => void
  onAddAlias: (tool: ToolRecord, alias: string, reason?: string) => void
}

export function ToolRegistryTable({
  tools,
  searchTerm,
  onToggleActive,
  onAddAlias,
}: ToolRegistryTableProps) {
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [aliasInput, setAliasInput] = useState('')
  const [reasonInput, setReasonInput] = useState('')

  if (tools.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchTerm
            ? 'No tools match your search.'
            : 'No tools yet. Import an Excel file to populate the registry.'}
        </p>
      </div>
    )
  }

  const handleToggleClick = (tool: ToolRecord) => {
    const reason = prompt(
      tool.status === 'active'
        ? 'Reason for deactivation (optional):'
        : 'Reason for reactivation (optional):',
    )
    if (reason === null) return
    onToggleActive(tool, reason)
  }

  const handleAddAliasClick = (tool: ToolRecord) => {
    if (!aliasInput.trim()) return
    onAddAlias(tool, aliasInput.trim(), reasonInput.trim() || undefined)
    setAliasInput('')
    setReasonInput('')
    setEditingUid(null)
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              UID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Canonical Key
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Plant
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Labels
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Last Seen
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {tools.map((tool) => (
            <tr key={tool.uid} className={tool.status === 'inactive' ? 'opacity-50' : ''}>
              <td className="px-4 py-3 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full
                  ${
                    tool.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}
                >
                  {tool.status}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <code className="text-xs text-gray-600 dark:text-gray-400">{tool.uid}</code>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <CanonicalIdDisplay plantKey={tool.plantKey} uid={tool.uid} entityKey={tool.key} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {tool.plantKey}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {tool.labels.toolName || tool.labels.toolCode || '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <LastSeenBadge
                  lastSeenImportRunId={tool.lastSeenImportRunId}
                  status={tool.status}
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleClick(tool)}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {tool.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                  {editingUid === tool.uid ? (
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        value={aliasInput}
                        onChange={(e) => setAliasInput(e.target.value)}
                        placeholder="Old key"
                        className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                      <input
                        type="text"
                        value={reasonInput}
                        onChange={(e) => setReasonInput(e.target.value)}
                        placeholder="Reason (optional)"
                        className="px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAddAliasClick(tool)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingUid(null)
                            setAliasInput('')
                            setReasonInput('')
                          }}
                          className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingUid(tool.uid)}
                      className="text-gray-600 dark:text-gray-400 hover:underline"
                    >
                      Add Alias
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
