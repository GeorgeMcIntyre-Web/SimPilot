import { useState, useMemo } from 'react'
import { useCoreStore, coreStore } from '../../domain/coreStore'
import { PageHeader } from '../../ui/components/PageHeader'
import { StationRecord, ToolRecord, RobotRecord, PlantKey } from '../../domain/uidTypes'
import { formatDistanceToNow } from 'date-fns'
import { createAliasRule } from '../../ingestion/uidResolver'
import { CanonicalIdDisplay } from '../../components/registry/CanonicalIdDisplay'
import {
  createActivateAuditEntry,
  createDeactivateAuditEntry,
  createAddAliasAuditEntry,
  createOverrideLabelAuditEntry
} from '../../domain/auditLog'

export default function RegistryPage() {
  const { stationRecords, toolRecords, robotRecords } = useCoreStore()
  const [activeTab, setActiveTab] = useState<'stations' | 'tools' | 'robots'>('stations')
  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [plantFilter, setPlantFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')

  // Get unique plant keys
  const allPlants = useMemo(() => {
    const plants = new Set<string>()
    stationRecords.forEach(s => plants.add(s.plantKey))
    toolRecords.forEach(t => plants.add(t.plantKey))
    robotRecords.forEach(r => plants.add(r.plantKey))
    return Array.from(plants).sort()
  }, [stationRecords, toolRecords, robotRecords])

  const filteredStations = stationRecords.filter(s => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    const matchesPlant = plantFilter === 'all' || s.plantKey === plantFilter
    const matchesSearch = s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.labels.fullLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.labels.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.uid.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesPlant && matchesSearch
  })

  const filteredTools = toolRecords.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    const matchesPlant = plantFilter === 'all' || t.plantKey === plantFilter
    const matchesSearch = t.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.labels.toolCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.labels.toolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.uid.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesPlant && matchesSearch
  })

  const filteredRobots = robotRecords.filter(r => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesPlant = plantFilter === 'all' || r.plantKey === plantFilter
    const matchesSearch = r.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.labels.robotCaption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.labels.robotName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.uid.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesPlant && matchesSearch
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
            <button
              onClick={() => setActiveTab('robots')}
              className={`
                px-6 py-3 border-b-2 font-medium text-sm
                ${activeTab === 'robots'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              Robots ({filteredRobots.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by UID, key, label, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <select
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Plants</option>
              {allPlants.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {activeTab === 'stations' && (
            <StationRegistryTable stations={filteredStations} searchTerm={searchTerm} />
          )}

          {activeTab === 'tools' && (
            <ToolRegistryTable tools={filteredTools} searchTerm={searchTerm} />
          )}

          {activeTab === 'robots' && (
            <RobotRegistryTable robots={filteredRobots} searchTerm={searchTerm} />
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
  const [reasonInput, setReasonInput] = useState('')

  const handleToggleActive = (station: StationRecord) => {
    if (station.status === 'active') {
      const reason = prompt('Reason for deactivation (optional):')
      if (reason === null) return // User cancelled

      coreStore.deactivateStation(station.uid)

      const auditEntry = createDeactivateAuditEntry(
        station.uid,
        'station',
        station.key,
        reason || undefined
      )
      coreStore.addAuditEntry(auditEntry)
    } else {
      const reason = prompt('Reason for reactivation (optional):')
      if (reason === null) return // User cancelled

      coreStore.reactivateStation(station.uid)

      const auditEntry = createActivateAuditEntry(
        station.uid,
        'station',
        station.key,
        reason || undefined
      )
      coreStore.addAuditEntry(auditEntry)
    }
  }

  const handleAddAlias = (station: StationRecord) => {
    if (!aliasInput.trim()) return

    const rule = createAliasRule(
      aliasInput.trim(),
      station.uid,
      'station',
      reasonInput.trim() || `Manual alias mapping via Registry UI`,
      undefined
    )

    coreStore.addAliasRules([rule])

    const auditEntry = createAddAliasAuditEntry(
      station.uid,
      'station',
      station.key,
      aliasInput.trim(),
      reasonInput.trim() || undefined
    )
    coreStore.addAuditEntry(auditEntry)

    setAliasInput('')
    setReasonInput('')
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
                <CanonicalIdDisplay
                  plantKey={station.plantKey}
                  uid={station.uid}
                  key={station.key}
                />
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
                    onClick={() => handleToggleActive(station)}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {station.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </button>
                  {editingUid === station.uid ? (
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
                          onClick={() => handleAddAlias(station)}
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
  const [reasonInput, setReasonInput] = useState('')

  const handleToggleActive = (tool: ToolRecord) => {
    if (tool.status === 'active') {
      const reason = prompt('Reason for deactivation (optional):')
      if (reason === null) return

      coreStore.deactivateTool(tool.uid)

      const auditEntry = createDeactivateAuditEntry(
        tool.uid,
        'tool',
        tool.key,
        reason || undefined
      )
      coreStore.addAuditEntry(auditEntry)
    } else {
      const reason = prompt('Reason for reactivation (optional):')
      if (reason === null) return

      coreStore.reactivateTool(tool.uid)

      const auditEntry = createActivateAuditEntry(
        tool.uid,
        'tool',
        tool.key,
        reason || undefined
      )
      coreStore.addAuditEntry(auditEntry)
    }
  }

  const handleAddAlias = (tool: ToolRecord) => {
    if (!aliasInput.trim()) return

    const rule = createAliasRule(
      aliasInput.trim(),
      tool.uid,
      'tool',
      reasonInput.trim() || `Manual alias mapping via Registry UI`,
      undefined
    )

    coreStore.addAliasRules([rule])

    const auditEntry = createAddAliasAuditEntry(
      tool.uid,
      'tool',
      tool.key,
      aliasInput.trim(),
      reasonInput.trim() || undefined
    )
    coreStore.addAuditEntry(auditEntry)

    setAliasInput('')
    setReasonInput('')
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
                <CanonicalIdDisplay
                  plantKey={tool.plantKey}
                  uid={tool.uid}
                  key={tool.key}
                />
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
                    onClick={() => handleToggleActive(tool)}
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
                          onClick={() => handleAddAlias(tool)}
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

interface RobotRegistryTableProps {
  robots: RobotRecord[]
  searchTerm: string
}

function RobotRegistryTable({ robots, searchTerm }: RobotRegistryTableProps) {
  if (robots.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {searchTerm ? 'No robots match your search.' : 'No robots yet. Import an Excel file to populate the registry.'}
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
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {robots.map((robot) => (
            <tr key={robot.uid} className={robot.status === 'inactive' ? 'opacity-50' : ''}>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`
                  px-2 py-1 text-xs font-medium rounded-full
                  ${robot.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }
                `}>
                  {robot.status}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <code className="text-xs text-gray-600 dark:text-gray-400">
                  {robot.uid}
                </code>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <CanonicalIdDisplay
                  plantKey={robot.plantKey}
                  uid={robot.uid}
                  key={robot.key}
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                {robot.plantKey}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {robot.labels.robotName || robot.labels.robotCaption || '-'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-500">
                {formatDistanceToNow(new Date(robot.updatedAt), { addSuffix: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
