import { useMemo, useState } from 'react'
import { PageHeader } from '../../ui/components/PageHeader'
import { useCoreStore, coreStore } from '../../domain/coreStore'
import { StationRecord, ToolRecord } from '../../domain/uidTypes'
import { createAliasRule } from '../../ingestion/uidResolver'
import {
  createActivateAuditEntry,
  createAddAliasAuditEntry,
  createDeactivateAuditEntry,
} from '../../domain/auditLog'
import { FiltersBar } from './FiltersBar'
import { StationRegistryTable } from './StationRegistryTable'
import { ToolRegistryTable } from './ToolRegistryTable'
import { RobotRegistryTable } from './RobotRegistryTable'

type Tab = 'stations' | 'tools' | 'robots'

const isEntityStale = (
  lastSeenImportRunId: string | undefined,
  status: 'active' | 'inactive',
  importRuns: ReturnType<typeof useCoreStore>['importRuns'],
): boolean => {
  if (status === 'active') return false
  if (!lastSeenImportRunId) return true

  const importRun = importRuns.find((run) => run.id === lastSeenImportRunId)
  if (!importRun) return true

  const daysSinceLastSeen = Math.floor(
    (Date.now() - new Date(importRun.importedAt).getTime()) / (1000 * 60 * 60 * 24),
  )
  return daysSinceLastSeen >= 30
}

export default function RegistryPage() {
  const { stationRecords, toolRecords, robotRecords, importRuns } = useCoreStore()

  const [activeTab, setActiveTab] = useState<Tab>('stations')
  const [searchTerm, setSearchTerm] = useState('')
  const [plantFilter, setPlantFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [staleFilter, setStaleFilter] = useState(false)

  const allPlants = useMemo(() => {
    const plants = new Set<string>()
    stationRecords.forEach((s) => plants.add(s.plantKey))
    toolRecords.forEach((t) => plants.add(t.plantKey))
    robotRecords.forEach((r) => plants.add(r.plantKey))
    return Array.from(plants).sort()
  }, [stationRecords, toolRecords, robotRecords])

  const filteredStations = stationRecords.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    const matchesPlant = plantFilter === 'all' || s.plantKey === plantFilter
    const matchesSearch =
      s.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.labels.fullLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.labels.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.uid.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStale = !staleFilter || isEntityStale(s.lastSeenImportRunId, s.status, importRuns)
    return matchesStatus && matchesPlant && matchesSearch && matchesStale
  })

  const filteredTools = toolRecords.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    const matchesPlant = plantFilter === 'all' || t.plantKey === plantFilter
    const matchesSearch =
      t.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.labels.toolCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.labels.toolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.uid.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStale = !staleFilter || isEntityStale(t.lastSeenImportRunId, t.status, importRuns)
    return matchesStatus && matchesPlant && matchesSearch && matchesStale
  })

  const filteredRobots = robotRecords.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesPlant = plantFilter === 'all' || r.plantKey === plantFilter
    const matchesSearch =
      r.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.labels.robotCaption?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.labels.robotName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.uid.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStale = !staleFilter || isEntityStale(r.lastSeenImportRunId, r.status, importRuns)
    return matchesStatus && matchesPlant && matchesSearch && matchesStale
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entity Registry"
        subtitle="Manage stations, tools, and robots with stable UIDs"
      />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <TabButton
              label={`Stations (${filteredStations.length})`}
              isActive={activeTab === 'stations'}
              onClick={() => setActiveTab('stations')}
            />
            <TabButton
              label={`Tools (${filteredTools.length})`}
              isActive={activeTab === 'tools'}
              onClick={() => setActiveTab('tools')}
            />
            <TabButton
              label={`Robots (${filteredRobots.length})`}
              isActive={activeTab === 'robots'}
              onClick={() => setActiveTab('robots')}
            />
          </nav>
        </div>

        <div className="p-6">
          <FiltersBar
            searchTerm={searchTerm}
            plantFilter={plantFilter}
            statusFilter={statusFilter}
            staleFilter={staleFilter}
            allPlants={allPlants}
            onSearchChange={setSearchTerm}
            onPlantChange={setPlantFilter}
            onStatusChange={(value) => setStatusFilter(value)}
            onStaleToggle={setStaleFilter}
          />

          {activeTab === 'stations' && (
            <StationRegistryTable
              stations={filteredStations}
              searchTerm={searchTerm}
              onToggleActive={(station, reason) => handleStationToggle(station, reason)}
              onAddAlias={(station, alias, reason) =>
                handleAddAlias('station', station, alias, reason)
              }
            />
          )}

          {activeTab === 'tools' && (
            <ToolRegistryTable
              tools={filteredTools}
              searchTerm={searchTerm}
              onToggleActive={(tool, reason) => handleToolToggle(tool, reason)}
              onAddAlias={(tool, alias, reason) => handleAddAlias('tool', tool, alias, reason)}
            />
          )}

          {activeTab === 'robots' && (
            <RobotRegistryTable robots={filteredRobots} searchTerm={searchTerm} />
          )}
        </div>
      </div>
    </div>
  )

  // ---- Event handlers
  function handleStationToggle(station: StationRecord, reason?: string | null) {
    if (station.status === 'active') {
      coreStore.deactivateStation(station.uid)
      const audit = createDeactivateAuditEntry(
        station.uid,
        'station',
        station.key,
        reason || undefined,
      )
      coreStore.addAuditEntry(audit)
    } else {
      coreStore.reactivateStation(station.uid)
      const audit = createActivateAuditEntry(
        station.uid,
        'station',
        station.key,
        reason || undefined,
      )
      coreStore.addAuditEntry(audit)
    }
  }

  function handleToolToggle(tool: ToolRecord, reason?: string | null) {
    if (tool.status === 'active') {
      coreStore.deactivateTool(tool.uid)
      const audit = createDeactivateAuditEntry(tool.uid, 'tool', tool.key, reason || undefined)
      coreStore.addAuditEntry(audit)
    } else {
      coreStore.reactivateTool(tool.uid)
      const audit = createActivateAuditEntry(tool.uid, 'tool', tool.key, reason || undefined)
      coreStore.addAuditEntry(audit)
    }
  }

  function handleAddAlias(
    entityType: 'station' | 'tool',
    record: StationRecord | ToolRecord,
    aliasInput: string,
    reasonInput?: string,
  ) {
    const rule = createAliasRule(
      aliasInput.trim(),
      record.uid,
      entityType,
      reasonInput?.trim() || 'Manual alias mapping via Registry UI',
      undefined,
    )

    coreStore.addAliasRules([rule])

    const auditEntry = createAddAliasAuditEntry(
      record.uid,
      entityType,
      record.key,
      aliasInput.trim(),
      reasonInput?.trim() || undefined,
    )
    coreStore.addAuditEntry(auditEntry)
  }
}

type TabButtonProps = {
  label: string
  isActive: boolean
  onClick: () => void
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors
        ${
          isActive
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
    >
      {label}
    </button>
  )
}
