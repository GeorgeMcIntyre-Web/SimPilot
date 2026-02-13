import { useState, useMemo } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { PageHeader } from '../../ui/components/PageHeader'
import { DataTable, Column } from '../../ui/components/DataTable'
import { StatusPill } from '../../ui/components/StatusPill'
import { Tag } from '../../ui/components/Tag'
import {
  useCells,
  useRobotsByCell,
  useToolsByCell,
  useAllEngineerMetrics,
} from '../../ui/hooks/useDomainData'
import { coreStore, useCoreStore } from '../../domain/coreStore'
import { Tool } from '../../domain/core'
import { createCellEngineerAssignmentChange } from '../../domain/changeLog'
import { AlertTriangle, Check, X, MonitorPlay } from 'lucide-react'
import { InfoPill } from '../../ui/components/InfoPill'
import { CellChaosHint } from '../../ui/components/CellChaosHint'
import { simBridgeClient } from '../../integrations/simbridge/SimBridgeClient'
import { useGlobalBusy } from '../../ui/GlobalBusyContext'
import { log } from '../../lib/log'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { normalizeStationId } from '../../domain/crossRef/CrossRefUtils'
import { FlagsList } from '../../ui/components/FlagBadge'

export function CellDetailPage() {
  const { cellId } = useParams<{ cellId: string }>()
  const location = useLocation()
  const decodedCellId = cellId ? decodeURIComponent(cellId) : undefined

  // Robust lookup: Try by ID first, then fall back to code/name matching
  const allCells = useCells()
  const cell = useMemo(() => {
    if (!decodedCellId) return undefined

    // 1. Precise match by ID
    const matchById = allCells.find((c) => c.id === decodedCellId)
    if (matchById) return matchById

    // 2. Match by station ID (canonical)
    const matchByStationId = allCells.find((c) => c.stationId === decodedCellId)
    if (matchByStationId) return matchByStationId

    // 3. Match by normalized code or name
    const normalizedTarget = decodedCellId.toUpperCase().trim()

    // 3a. Try exact code match
    const matchByCode = allCells.find((c) => c.code?.toUpperCase() === normalizedTarget)
    if (matchByCode) return matchByCode

    // 3b. Try exact name match
    const matchByName = allCells.find((c) => c.name?.toUpperCase() === normalizedTarget)
    if (matchByName) return matchByName

    // 4. Try normalized station code (e.g. "010" matching "10")
    if (/^\d+$/.test(normalizedTarget)) {
      // identifying simplistic numeric codes
      const matchByNumeric = allCells.find((c) => {
        const numericCode = c.code?.replace(/^0+/, '')
        const numericTarget = normalizedTarget.replace(/^0+/, '')
        return numericCode === numericTarget
      })
      if (matchByNumeric) return matchByNumeric
    }

    return undefined
  }, [allCells, decodedCellId])

  const legacyRobots = useRobotsByCell(cell?.id || '')
  const tools = useToolsByCell(cell?.id || '')
  const allEngineers = useAllEngineerMetrics()
  const { pushBusy, popBusy } = useGlobalBusy()

  // Get robots from CrossRef data (includes robots from simulation status)
  const { cells: crossRefCells } = useCrossRefData()

  // Find matching CrossRef cell to get robots from simulation status
  const crossRefCell = useMemo(() => {
    if (!cell?.code) return undefined

    const normalizedCode = normalizeStationId(cell.code)
    return crossRefCells.find((c) => c.stationKey === normalizedCode)
  }, [cell?.code, crossRefCells])

  const crossRefFlags = crossRefCell?.flags || []

  const { assets } = useCoreStore()

  const normalizeRobotNumber = (value: string | null | undefined) =>
    (value ?? '')
      .toString()
      .toLowerCase()
      .replace(/[\s_-]+/g, '')

  const coerceRobotLabel = (value: unknown, fallback: string): string => {
    if (value === null || value === undefined) return fallback
    if (typeof value === 'boolean') return fallback
    const text = String(value).trim()
    if (text.length === 0) return fallback
    return text
  }

  // Use robots from the equipment list only (not simulation status) and align link target to matching asset number
  const robots = useMemo(() => {
    const normalizedStation = normalizeRobotNumber(cell?.code)

    return legacyRobots.map((r) => {
      const displayNumberCandidate =
        r.metadata?.['Robo No. New'] ??
        r.metadata?.['ROBO NO. NEW'] ??
        r.metadata?.robotNumber ??
        r.name
      const displayNumber = coerceRobotLabel(displayNumberCandidate, r.name)
      const normalizedDisplay = normalizeRobotNumber(displayNumber)

      const matchedAsset = assets.find((a) => {
        if (a.kind !== 'ROBOT') return false

        const candidateLabelCandidate =
          a.metadata?.robotNumber ??
          a.metadata?.['Robo No. New'] ??
          a.metadata?.['ROBO NO. NEW'] ??
          a.name
        const candidateNumber = normalizeRobotNumber(
          coerceRobotLabel(candidateLabelCandidate, a.name),
        )

        const sameNumber = normalizedDisplay.length > 0 && candidateNumber === normalizedDisplay
        if (!sameNumber) return false

        if (!normalizedStation) return true
        return normalizeRobotNumber(a.stationNumber) === normalizedStation
      })

      return {
        ...r,
        name: displayNumber,
        linkAssetId: matchedAsset?.id ?? r.id,
      }
    })
  }, [legacyRobots, assets, cell?.code])

  const [isEditingEngineer, setIsEditingEngineer] = useState(false)
  const [selectedEngineer, setSelectedEngineer] = useState<string>('')

  const { from: fromPath, fromLabel } = (location.state || {}) as {
    from?: string
    fromLabel?: string
  }
  const breadcrumbRootHref = fromPath || '/projects'
  const breadcrumbRootLabel = fromLabel || 'Projects'

  if (!cell) {
    return (
      <div>
        <PageHeader title="Station Not Found" />
        <p className="text-gray-500">The station you are looking for does not exist.</p>
      </div>
    )
  }

  const isAtRisk =
    cell.simulation?.hasIssues ||
    (cell.simulation?.percentComplete &&
      cell.simulation.percentComplete > 0 &&
      cell.simulation.percentComplete < 100 &&
      cell.status === 'Blocked')

  const handleEditEngineer = () => {
    setSelectedEngineer(cell.assignedEngineer || '')
    setIsEditingEngineer(true)
  }

  const handleSaveEngineer = () => {
    if (selectedEngineer !== cell.assignedEngineer) {
      const change = createCellEngineerAssignmentChange(
        cell.id,
        cell.assignedEngineer,
        selectedEngineer,
        cell.projectId,
        cell.areaId,
      )
      coreStore.addChange(change)
      coreStore.updateCellEngineer(cell.id, selectedEngineer)
    }
    setIsEditingEngineer(false)
  }

  const handleOpenSimulation = async () => {
    if (!cell.simulation?.studyPath) return

    pushBusy('Opening simulation in Tecnomatix...')
    try {
      const connected = await simBridgeClient.connect()
      if (!connected) {
        alert(
          "We couldn't reach the simulation server right now. It's safe to continue your planning – the data in SimPilot is still valid.",
        )
        return
      }

      const success = await simBridgeClient.loadStudy(cell.simulation.studyPath)
      if (success !== true) {
        alert('Failed to load the study. Please check if the file exists on the server.')
      }
    } catch (e) {
      log.error('Failed to open simulation', e)
      alert('An error occurred while trying to open the simulation.')
    } finally {
      popBusy()
    }
  }

  // Use a flexible type for robot columns since we merge CrossRef and legacy robots
  type RobotDisplay = {
    id?: string
    linkAssetId?: string
    name: string
    oemModel?: string
    stationCode?: string
    sourceFile?: string
    sheetName?: string
    rowIndex?: number
    metadata?: Record<string, unknown>
  }
  const robotColumns: Column<RobotDisplay>[] = [
    {
      header: 'Name',
      accessor: (r) => {
        const robotLabel = r.name
        const assetId = r.linkAssetId || r.id
        if (!assetId) return robotLabel
        const searchParams = new URLSearchParams()
        searchParams.set('assetId', assetId)
        if (robotLabel) {
          searchParams.set('robotNumber', robotLabel)
        }
        return (
          <Link
            to={`/assets?${searchParams.toString()}`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {robotLabel}
          </Link>
        )
      },
    },
    { header: 'Model', accessor: (r) => r.oemModel || '-' },
    { header: 'Station', accessor: (r) => r.stationCode || '-' },
    {
      header: 'Comment',
      accessor: (r) => {
        const comment =
          (r.metadata?.comment as string) ||
          (r.metadata?.Comment as string) ||
          (r.metadata?.esowComment as string) ||
          (r.metadata?.['ESOW Comment'] as string) ||
          null
        return comment && comment.toString().trim().length > 0 ? comment : '—'
      },
    },
  ]

  const toolColumns: Column<Tool>[] = [
    { header: 'Name', accessor: (t) => t.name },
    { header: 'Type', accessor: (t) => <Tag label={t.toolType} color="blue" /> },
    { header: 'Model', accessor: (t) => t.oemModel || '-' },
    { header: 'Mount', accessor: (t) => t.mountType },
    {
      header: 'Source',
      accessor: (t) =>
        t.sourceFile ? (
          <span
            className="text-xs text-gray-500"
            title={`${t.sourceFile} (Sheet: ${t.sheetName}, Row: ${t.rowIndex})`}
          >
            {t.sourceFile}
          </span>
        ) : (
          '-'
        ),
    },
  ]

  return (
    <div className="space-y-4" data-testid="cell-detail-root">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
        <Link to={breadcrumbRootHref} className="hover:text-blue-600 dark:hover:text-blue-400">
          {breadcrumbRootLabel}
        </Link>
        <span>/</span>
        {cell.projectId && (
          <Link
            to={`/projects/${cell.projectId}`}
            className="hover:text-blue-600 dark:hover:text-blue-400"
          >
            Project
          </Link>
        )}
        <span>/</span>
        <span className="text-gray-900 dark:text-white font-medium">{cell.name}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  Station {cell.code || '-'}
                </p>
                {isAtRisk && (
                  <span className="inline-flex items-center gap-1 rounded border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-200">
                    <AlertTriangle className="h-3 w-3" />
                    At Risk
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  {cell.name}
                </h1>
                <StatusPill status={cell.status} />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-400 flex-wrap mt-2">
                {cell.areaId &&
                  (cell.projectId ? (
                    <Link
                      to={`/projects/${cell.projectId}`}
                      className="rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5 hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    >
                      Area {cell.areaId}
                    </Link>
                  ) : (
                    <span className="rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5">
                      Area {cell.areaId}
                    </span>
                  ))}
                {cell.lineCode && (
                  <span className="rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5">
                    Line {cell.lineCode}
                  </span>
                )}
                {cell.oemRef && (
                  <span className="rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5">
                    OEM: {cell.oemRef}
                  </span>
                )}
                {cell.simulation?.sourceFile && (
                  <span className="rounded-full bg-white/50 dark:bg-gray-800/50 px-2 py-0.5 truncate">
                    Src: {cell.simulation.sourceFile}
                  </span>
                )}
              </div>
            </div>
            {cell.simulation?.studyPath && (
              <button
                onClick={handleOpenSimulation}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <MonitorPlay className="h-4 w-4" />
                Open Simulation
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <InfoPill
              label="Engineer"
              value={isEditingEngineer ? undefined : cell.assignedEngineer || 'Unassigned'}
              onEdit={isEditingEngineer ? undefined : handleEditEngineer}
              editing={isEditingEngineer}
              editContent={
                <div className="space-y-2">
                  <input
                    type="text"
                    list="engineers-list"
                    value={selectedEngineer}
                    onChange={(e) => setSelectedEngineer(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter engineer name..."
                  />
                  <datalist id="engineers-list">
                    {allEngineers.map((e) => (
                      <option key={e.name} value={e.name} />
                    ))}
                  </datalist>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEngineer}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
                      title="Save"
                      data-testid="save-engineer-button"
                    >
                      <Check className="h-3 w-3" />
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingEngineer(false)}
                      className="px-2 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded text-[11px] hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                      title="Cancel"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              }
            />
            <InfoPill
              label="Completion"
              value={cell.simulation ? `${cell.simulation.percentComplete}%` : 'No data'}
            />
            <InfoPill
              label="Issues"
              value={
                cell.simulation ? (cell.simulation.hasIssues ? 'Flagged' : 'Clear') : 'Not linked'
              }
              tone={cell.simulation?.hasIssues ? 'warn' : cell.simulation ? 'ok' : 'muted'}
            />
            <InfoPill
              label="Updated"
              value={
                cell.lastUpdated
                  ? new Date(cell.lastUpdated).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Unknown'
              }
            />
          </div>
          <CellChaosHint cell={cell} />
        </div>
      </div>

      {/* Tools and Robots side by side with matched heights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
          <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                Robots ({robots.length})
              </h3>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">Station assets</div>
            </div>
          </div>
          <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
            <DataTable
              data={robots}
              columns={robotColumns}
              emptyMessage="No robots assigned to this cell."
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
          <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                Tools ({tools.length})
              </h3>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                Guns, grippers, others
              </div>
            </div>
          </div>
          <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
            <DataTable
              data={tools}
              columns={toolColumns}
              emptyMessage="No tools assigned to this cell."
            />
          </div>
        </div>
      </div>

      {/* Issues */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
            Issues ({crossRefFlags.length})
          </h3>
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
            Flags from cross-reference checks
          </div>
        </div>
        <div className="p-3">
          <FlagsList flags={crossRefFlags} />
        </div>
      </div>
    </div>
  )
}

export default CellDetailPage
