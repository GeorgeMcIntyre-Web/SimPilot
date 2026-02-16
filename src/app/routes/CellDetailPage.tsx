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
import {
  AlertTriangle,
  Check,
  MonitorPlay,
  ArrowRight,
  Package,
  FileSpreadsheet,
} from 'lucide-react'
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

  // Build combined robot list (Legacy + Cross-Ref fallback)
  const robots = useMemo(() => {
    // 1. Start with explicitly linked robots from CoreStore
    let baseRobots: RobotDisplay[] = legacyRobots.map((r) => ({ ...r }))

    // 2. If legacy list is empty, try mapping from Cross-Ref snapshots
    if (baseRobots.length === 0 && crossRefCell?.robots) {
      baseRobots = crossRefCell.robots.map((snap) => ({
        id: snap.robotKey,
        name: snap.caption || snap.robotKey,
        oemModel: snap.oemModel,
        metadata: (snap.raw as any)?.metadata || {},
        stationCode: snap.stationKey,
      }))
    }

    const normalizedStation = normalizeRobotNumber(cell?.code)

    // 3. Enrich and link to unified assets
    return baseRobots.map((r) => {
      const displayNumberCandidate =
        r.metadata?.['Robo No. New'] ??
        r.metadata?.['ROBO NO. NEW'] ??
        r.metadata?.robotNumber ??
        r.name
      const displayNumber = coerceRobotLabel(displayNumberCandidate, r.name || 'Unknown Robot')
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
  }, [legacyRobots, crossRefCell?.robots, assets, cell?.code])

  // Build combined tool list
  const mergedTools = useMemo(() => {
    if (tools.length > 0) return tools

    // Fallback to cross-ref tool snapshots
    return (crossRefCell?.tools || []).map((snap) => ({
      id: snap.toolId || `tr-${snap.stationKey}`,
      name: snap.toolId || 'Unknown Tool',
      toolType: (snap.toolType as any) || 'OTHER',
      mountType: 'UNKNOWN' as const,
      raw: snap.raw,
    }))
  }, [tools, crossRefCell?.tools])

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
    {
      header: 'Application Code',
      accessor: (r) => {
        const rawApp =
          (r.metadata?.application as string) ||
          (r.metadata?.['Robot Function'] as string) ||
          (r.metadata?.['Application'] as string) ||
          (r.metadata?.robotType as string) ||
          (r.metadata?.['Robot Type'] as string) ||
          '—'

        const appMap: Record<string, string> = {
          'SELF PIERCE RIVET': 'SPR',
          'SELF PIERCE RIVETING': 'SPR',
          'SPOT WELD': 'SW',
          'SPOT WELDING': 'SW',
          'MATERIAL HANDLING': 'MH',
          'STUD WELDING': 'STUD',
          'STUD WELD': 'STUD',
          'ARC WELDING': 'AW',
          SEALER: 'SEA',
          SEALING: 'SEA',
          ADHESIVE: 'ADH',
          'FLOW DRILL SCREW': 'FDS',
          PROCESS: 'PROC',
        }

        const normalized = rawApp.toUpperCase().trim()
        const app = appMap[normalized] || rawApp

        return (
          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 text-[10px] font-bold uppercase tracking-wider">
            {app}
          </span>
        )
      },
    },
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
    <div className="space-y-6" data-testid="cell-detail-root">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          <Link
            to={breadcrumbRootHref}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {breadcrumbRootLabel}
          </Link>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          {cell.projectId && (
            <>
              <Link
                to={`/projects/${cell.projectId}`}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                Project
              </Link>
              <span className="text-gray-300 dark:text-gray-700">/</span>
            </>
          )}
          <span className="text-gray-900 dark:text-gray-300">{cell.name || 'Station'}</span>
        </nav>

        <div className="flex items-center gap-2">
          {isAtRisk && (
            <span className="inline-flex items-center gap-1.5 rounded bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 uppercase">
              <AlertTriangle className="h-3 w-3" />
              At Risk
            </span>
          )}
          <StatusPill status={cell.status} />
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-4 max-w-3xl">
              <div>
                <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                  {cell.name || 'Unnamed Station'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium max-w-xl">
                  {cell.oemRef ? `OEM Reference ${cell.oemRef} • ` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-y-3 gap-x-8 pt-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Assembly Line
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
                      {cell.lineCode || '—'}
                    </p>
                  </div>
                </div>

                <div className="h-10 w-px bg-gray-100 dark:bg-gray-700 hidden sm:block" />

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      OEM Partner
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-200">
                      {cell.oemRef || 'Standard'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3">
              {cell.simulation?.studyPath && (
                <button
                  onClick={handleOpenSimulation}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                >
                  <MonitorPlay className="h-4 w-4" />
                  Launch Project
                </button>
              )}
              <div className="text-right">
                <div
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${isAtRisk ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800' : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800'}`}
                >
                  {isAtRisk ? 'CRITICAL PATH' : 'DEVELOPMENT'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Essential Metrics Bar */}
        <div className="bg-gray-50/50 dark:bg-gray-900/20 px-4 md:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <InfoPill
              label="Lead Engineer"
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
                    placeholder="Search engineer..."
                  />
                  <datalist id="engineers-list">
                    {allEngineers.map((e) => (
                      <option key={e.name} value={e.name} />
                    ))}
                  </datalist>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEngineer}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 transition-colors uppercase tracking-tight"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setIsEditingEngineer(false)}
                      className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-[10px] font-bold hover:bg-gray-300 transition-colors uppercase tracking-tight"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              }
            />
            <InfoPill
              label="Simulation Progress"
              value={cell.simulation ? `${cell.simulation.percentComplete}%` : '0%'}
              tone={cell.simulation?.percentComplete === 100 ? 'ok' : undefined}
            />
            <InfoPill
              label="Integrity Check"
              value={
                cell.simulation
                  ? cell.simulation.hasIssues
                    ? 'Issues Found'
                    : 'Validation Clear'
                  : 'Link Pending'
              }
              tone={cell.simulation?.hasIssues ? 'warn' : cell.simulation ? 'ok' : 'muted'}
            />
            <InfoPill
              label="Last Activity"
              value={
                cell.lastUpdated
                  ? new Date(cell.lastUpdated).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—'
              }
            />
          </div>
          <div className="mt-2">
            <CellChaosHint cell={cell} />
          </div>
        </div>
      </div>

      {/* Secondary Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets & Hardware Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Robots section */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/30 dark:bg-transparent flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <Package className="h-4 w-4 text-blue-500" />
                Robot Assets ({robots.length})
              </h3>
            </div>
            <div className="p-2 overflow-x-auto">
              <DataTable
                data={robots}
                columns={robotColumns}
                emptyMessage="No robots assigned to this production node."
              />
            </div>
          </section>

          {/* Tools section */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/30 dark:bg-transparent flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                <MonitorPlay className="h-4 w-4 text-indigo-500" />
                Integrated Tooling ({tools.length})
              </h3>
            </div>
            <div className="p-2 overflow-x-auto">
              <DataTable
                data={mergedTools as any}
                columns={toolColumns}
                emptyMessage="No specialized tooling detected for this station."
              />
            </div>
          </section>
        </div>

        {/* Intelligence & Quality Column */}
        <div className="space-y-6">
          {/* Active Issues / Flags */}
          <section className="bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-900/40 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-900/10 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-bold text-rose-800 dark:text-rose-400 uppercase tracking-tight">
                Issues of concern ({crossRefFlags.length})
              </h3>
            </div>
            <div className="p-5 max-h-[480px] overflow-y-auto custom-scrollbar">
              <FlagsList flags={crossRefFlags} compact />
              {crossRefFlags.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 mb-3">
                    <Check className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 italic">
                    No flags reported
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Cross-reference validation is clear.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Data Provenance Card */}
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Data Traceability
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                    Primary Manifest
                  </span>
                  <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 truncate break-all">
                    {cell.simulation?.sourceFile || 'N/A'}
                  </span>
                </div>
                {cell.simulation?.studyPath && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
                      Simulation Path
                    </span>
                    <span className="text-[10px] font-mono text-gray-600 dark:text-gray-400 line-clamp-2 italic">
                      {cell.simulation.studyPath}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-50 dark:border-gray-700/50">
                <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                  <span>System Objects</span>
                  <span className="text-gray-300">/</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
                    <span className="block text-[8px] text-gray-400 uppercase font-black mb-0.5">
                      Static ID
                    </span>
                    <span className="text-[10px] font-mono font-bold dark:text-gray-300">
                      {cell.id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-100 dark:border-gray-800">
                    <span className="block text-[8px] text-gray-400 uppercase font-black mb-0.5">
                      Project
                    </span>
                    <span className="text-[10px] font-bold dark:text-gray-300 truncate">
                      {cell.projectId || 'Global'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default CellDetailPage
