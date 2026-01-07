import { useState } from 'react'
import { useCoreStore, coreStore } from '../../domain/coreStore'
import { PageHeader } from '../../ui/components/PageHeader'
import { StationRecord, ToolRecord, PlantKey } from '../../domain/uidTypes'
import { formatDistanceToNow } from 'date-fns'
import { createAliasRule } from '../../ingestion/uidResolver'

export default function RegistryPage() {
  const { stationRecords, toolRecords } = useCoreStore()
  const [activeTab, setActiveTab] = useState<'stations' | 'tools'>('stations')
  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredStations = stationRecords.filter(s => {
    const matchesStatus = showInactive || s.status === 'active'
    const matchesSearch = s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.labels.fullLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.labels.area?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const filteredTools = toolRecords.filter(t => {
    const matchesStatus = showInactive || t.status === 'active'
    const matchesSearch = t.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.labels.toolCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.labels.toolName?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entity Registry"
        description="Manage stations, tools, and robots with stable UIDs"
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('stations')}
              className={`
                px-6 py-3 border-b-2 font-medium text-sm
                ${activeTab === 'stations'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              Stations ({filteredStations.length})
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`
                px-6 py-3 border-b-2 font-medium text-sm
                ${activeTab === 'tools'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              Tools ({filteredTools.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by key, label, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              Show inactive
            </label>
          </div>

          {activeTab === 'stations' && (
            <StationRegistryTable stations={filteredStations} searchTerm={searchTerm} />
          )}

          {activeTab === 'tools' && (
            <ToolRegistryTable tools={filteredTools} searchTerm={searchTerm} />
          )}
        </div>
      </div>
    </div>
  )
}

interface StationRegistryTableProps {
  stations: StationRecord[]
  searchTerm: string
}

function StationRegistryTable({ stations, searchTerm }: StationRegistryTableProps) {
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [aliasInput, setAliasInput] = useState('')

  const handleToggleActive = (uid: string, currentStatus: 'active' | 'inactive') => {
    if (currentStatus === 'active') {
      coreStore.deactivateStation(uid)
    } else {
      coreStore.reactivateStation(uid)
    }
  }

  const handleAddAlias = (station: StationRecord) => {
    if (!aliasInput.trim()) return

    const rule = createAliasRule(
      aliasInput.trim(),
      station.uid,
      'station',
      `Manual alias mapping via Registry UI`,
      undefined
    )

    coreStore.addAliasRules([rule])
    setAliasInput('')
    setEditingUid(null)
  }

  if (stations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchTerm ? 'No stations match your search.' : 'No stations yet. Import an Excel file to populate the registry.'}
        </p>
      </div>
    )
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
              Last Updated
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {stations.map((station) => (
            <tr key={station.uid} className={station.status === 'inactive' ? 'opacity-50' : ''}>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`
                  px-2 py-1 text-xs font-medium rounded-full
                  ${station.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }
                `}>
                  {station.status}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <code className="text-xs text-gray-600 dark:text-gray-400">
                  {station.uid}
                </code>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                  {generateCanonicalDisplay(station.plantKey, station.uid, station.key)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {station.plantKey}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {station.labels.fullLabel || station.labels.area || '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-500">
                {formatDistanceToNow(new Date(station.updatedAt), { addSuffix: true })}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(station.uid, station.status)}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {station.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                  {editingUid === station.uid ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={aliasInput}
                        onChange={(e) => setAliasInput(e.target.value)}
                        placeholder="Old key"
                        className="px-2 py-1 text-xs border rounded"
                      />
                      <button
                        onClick={() => handleAddAlias(station)}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUid(null)}
                        className="px-2 py-1 text-xs bg-gray-300 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingUid(station.uid)}
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

interface ToolRegistryTableProps {
  tools: ToolRecord[]
  searchTerm: string
}

function ToolRegistryTable({ tools, searchTerm }: ToolRegistryTableProps) {
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [aliasInput, setAliasInput] = useState('')

  const handleToggleActive = (uid: string, currentStatus: 'active' | 'inactive') => {
    if (currentStatus === 'active') {
      coreStore.deactivateTool(uid)
    } else {
      coreStore.reactivateTool(uid)
    }
  }

  const handleAddAlias = (tool: ToolRecord) => {
    if (!aliasInput.trim()) return

    const rule = createAliasRule(
      aliasInput.trim(),
      tool.uid,
      'tool',
      `Manual alias mapping via Registry UI`,
      undefined
    )

    coreStore.addAliasRules([rule])
    setAliasInput('')
    setEditingUid(null)
  }

  if (tools.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchTerm ? 'No tools match your search.' : 'No tools yet. Import an Excel file to populate the registry.'}
        </p>
      </div>
    )
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
              Last Updated
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
                <span className={`
                  px-2 py-1 text-xs font-medium rounded-full
                  ${tool.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }
                `}>
                  {tool.status}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <code className="text-xs text-gray-600 dark:text-gray-400">
                  {tool.uid}
                </code>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                  {generateCanonicalDisplay(tool.plantKey, tool.uid, tool.key)}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {tool.plantKey}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {tool.labels.toolName || tool.labels.toolCode || '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-500">
                {formatDistanceToNow(new Date(tool.updatedAt), { addSuffix: true })}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(tool.uid, tool.status)}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {tool.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                  {editingUid === tool.uid ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={aliasInput}
                        onChange={(e) => setAliasInput(e.target.value)}
                        placeholder="Old key"
                        className="px-2 py-1 text-xs border rounded"
                      />
                      <button
                        onClick={() => handleAddAlias(tool)}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUid(null)}
                        className="px-2 py-1 text-xs bg-gray-300 rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
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

/**
 * Generate canonical display string for human readability
 * Format: PlantKey-UIDShort-Key
 */
function generateCanonicalDisplay(plantKey: PlantKey, uid: string, key: string): string {
  // Extract short UID (last 8 chars)
  const uidShort = uid.split('_')[1]?.slice(-8) || uid.slice(-8)

  return `${plantKey}-${uidShort}-${key}`
}
