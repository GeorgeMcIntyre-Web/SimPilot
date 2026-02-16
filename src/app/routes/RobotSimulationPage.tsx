import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, X, Bot } from 'lucide-react'
import { EmptyState } from '../../ui/components/EmptyState'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'
import { log } from '../../lib/log'
import {
  PanelType,
  PanelMilestones,
  calculateOverallCompletion,
} from '../../ingestion/simulationStatus/simulationStatusTypes'
import { StatCard } from '../../ui/components/StatCard'
import { Activity, Layers, Target, ChevronRight } from 'lucide-react'

const formatRobotLabel = (cell: CellSnapshot): string => {
  const robotCaptions = (cell.robots || []).map((r) => r.caption || r.robotKey).filter(Boolean)
  if (robotCaptions.length > 0) {
    return Array.from(new Set(robotCaptions)).join(', ')
  }

  const rawRobot =
    (cell.simulationStatus?.raw as any)?.robotName ||
    (cell.simulationStatus?.raw as any)?.ROBOT ||
    ''
  const trimmed = typeof rawRobot === 'string' ? rawRobot.trim() : ''
  if (trimmed) return trimmed

  return '-'
}

/**
 * Get completion percentage for a specific panel from panelMilestones
 */
const getPanelCompletion = (
  panelMilestones: PanelMilestones | undefined,
  panelType: PanelType,
): number | null => {
  if (!panelMilestones) return null
  const group = panelMilestones[panelType]
  if (!group) return null

  // Prefer explicit completion if present
  if (typeof group.completion === 'number' && Number.isFinite(group.completion)) {
    return group.completion
  }
  const coerced = Number(group.completion)
  if (Number.isFinite(coerced)) return coerced

  // Fallback: derive from milestone values (allow numeric strings)
  const values = Object.values(group.milestones)
  const numericValues = values
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => Number.isFinite(v))

  if (numericValues.length === 0) return null
  const avg = numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length
  return Math.round(avg)
}

/**
 * Get overall completion for a specific robot row by averaging its panel completions.
 * Uses per-robot panel milestones when available, falls back to station-level.
 */
const getRowOverallCompletion = (row: StationRow): string => {
  const perRobotPanels = row.cell.simulationStatus?.robotPanelMilestones
  if (perRobotPanels) {
    let robotPanels = perRobotPanels[row.label]
    if (!robotPanels) {
      const upperLabel = row.label.toUpperCase()
      const matchKey = Object.keys(perRobotPanels).find((k) => k.toUpperCase() === upperLabel)
      if (matchKey) robotPanels = perRobotPanels[matchKey]
    }
    if (!robotPanels) return '-'
    const result = calculateOverallCompletion(robotPanels)
    return result !== null ? `${result}%` : '-'
  }
  // Fallback to station-level panel milestones
  const panelMilestones = row.cell.simulationStatus?.panelMilestones
  if (panelMilestones) {
    const result = calculateOverallCompletion(panelMilestones)
    return result !== null ? `${result}%` : '-'
  }
  // Final fallback to firstStageCompletion
  const value = row.cell.simulationStatus?.firstStageCompletion
  if (typeof value !== 'number') return '-'
  return `${Math.round(value)}%`
}

const getRowPanelMilestones = (row: StationRow, panelType: PanelType): number | null => {
  // Prefer per-robot milestones if available
  const perRobotPanels = row.cell.simulationStatus?.robotPanelMilestones
  if (perRobotPanels) {
    let robotPanels = perRobotPanels[row.label]
    if (!robotPanels) {
      // Try case-insensitive match
      const upperLabel = row.label.toUpperCase()
      const matchKey = Object.keys(perRobotPanels).find((k) => k.toUpperCase() === upperLabel)
      if (matchKey) robotPanels = perRobotPanels[matchKey]
    }
    // If robotPanelMilestones exist but this robot has none, treat as N/A
    if (!robotPanels) return null
    return getPanelCompletion(robotPanels, panelType)
  }
  // Fallback only when per-robot data not provided at all
  return getPanelCompletion(row.cell.simulationStatus?.panelMilestones, panelType)
}

/**
 * Panel configuration for the aspect buttons
 * Maps display title to panel type and URL slug
 */
const PANEL_CONFIGS: { title: string; panelType: PanelType; slug: string }[] = [
  { title: 'Robot Simulation', panelType: 'robotSimulation', slug: 'robot-simulation' },
  { title: 'Spot Welding', panelType: 'spotWelding', slug: 'spot-welding' },
  {
    title: 'Alternative Joining Applications',
    panelType: 'alternativeJoining',
    slug: 'alternative-joining-applications',
  },
  { title: 'Sealer', panelType: 'sealer', slug: 'sealer' },
  { title: 'Fixture', panelType: 'fixture', slug: 'fixture' },
  { title: 'Gripper', panelType: 'gripper', slug: 'gripper' },
  { title: 'Multi Resource Simulation', panelType: 'mrs', slug: 'mrs' },
  { title: 'OLP', panelType: 'olp', slug: 'olp' },
  { title: 'Documentation', panelType: 'documentation', slug: 'documentation' },
  { title: 'Layout', panelType: 'layout', slug: 'layout' },
  { title: 'Safety', panelType: 'safety', slug: 'safety' },
]

type StationRow = { cell: CellSnapshot; label: string; application: string; assetId?: string }

/**
 * Station table is defined outside the page component to avoid remounting on parent state changes,
 * which would reset scroll and selection.
 */
function RobotSimulationStationsTable({
  cells,
  onSelect,
}: {
  cells: CellSnapshot[]
  onSelect: (row: StationRow) => void
}) {
  type SortKey = 'robot' | 'area' | 'application' | 'simulator' | 'completion'

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('robot')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [areaFilter, setAreaFilter] = useState<string>('ALL')
  const [applicationFilter, setApplicationFilter] = useState<string>('ALL')
  const [simulatorFilter, setSimulatorFilter] = useState<string>('ALL')
  const [completionFilter, setCompletionFilter] = useState<
    'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'
  >('ALL')

  const hasActiveFilters =
    areaFilter !== 'ALL' ||
    applicationFilter !== 'ALL' ||
    simulatorFilter !== 'ALL' ||
    completionFilter !== 'ALL' ||
    search.trim() !== ''

  const clearAllFilters = () => {
    setSearch('')
    setAreaFilter('ALL')
    setApplicationFilter('ALL')
    setSimulatorFilter('ALL')
    setCompletionFilter('ALL')
  }

  const robotRows = useMemo(() => {
    const rows: StationRow[] = []
    for (const cell of cells) {
      if (cell.robots && cell.robots.length > 0) {
        for (const robot of cell.robots) {
          const label = formatRobotLabel({ ...cell, robots: [robot] })
          const assetId = robot.robotKey || robot.caption
          const application =
            // Prefer metadata from robot asset
            (robot.raw as any)?.metadata?.application ??
            (robot.raw as any)?.metadata?.function ??
            // Simulation-status robots keep application at root, not metadata
            (robot.raw as any)?.application ??
            cell.simulationStatus?.application ??
            'Unknown'
          rows.push({ cell, label, assetId, application })
        }
      } else {
        const label = formatRobotLabel(cell)
        const assetId = cell.simulationStatus?.robotKey
        const application = cell.simulationStatus?.application ?? 'Unknown'
        rows.push({ cell, label, assetId, application })
      }
    }
    return rows
  }, [cells])

  // Build filter option lists
  const areaOptions = useMemo(() => {
    const set = new Set<string>()
    cells.forEach((c) => set.add(c.areaKey ?? 'Unknown'))
    return ['ALL', ...Array.from(set).sort()]
  }, [cells])

  const applicationOptions = useMemo(() => {
    const set = new Set<string>()
    cells.forEach((c) => {
      const app = c.simulationStatus?.application?.trim()
      set.add(app && app.length > 0 ? app : 'Unknown')
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [cells])

  const simulatorOptions = useMemo(() => {
    const set = new Set<string>()
    cells.forEach((c) => {
      const sim = c.simulationStatus?.engineer?.trim()
      set.add(sim && sim.length > 0 ? sim : 'UNASSIGNED')
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [cells])

  const filteredAndSorted = useMemo(() => {
    const term = search.trim().toLowerCase()

    const filtered = robotRows.filter((row) => {
      const robot = row.label.toLowerCase()
      const area = row.cell.areaKey ?? 'Unknown'
      const applicationRaw = row.cell.simulationStatus?.application?.trim() || 'Unknown'
      const simulatorRaw = row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'
      const simulator = simulatorRaw.toLowerCase()
      const completionVal = row.cell.simulationStatus?.firstStageCompletion
      const completion = typeof completionVal === 'number' ? completionVal : null

      const matchesSearch = term
        ? robot.includes(term) ||
          area.toLowerCase().includes(term) ||
          simulator.includes(term) ||
          applicationRaw.toLowerCase().includes(term)
        : true

      const matchesArea = areaFilter === 'ALL' || area === areaFilter
      const matchesApplication = applicationFilter === 'ALL' || applicationRaw === applicationFilter
      const matchesSimulator =
        simulatorFilter === 'ALL' ||
        (simulatorFilter === 'UNASSIGNED' && simulatorRaw.trim() === '') ||
        simulatorRaw === simulatorFilter

      const matchesCompletion =
        completionFilter === 'ALL'
          ? true
          : completionFilter === 'NOT_STARTED'
            ? completion === null || completion === 0
            : completionFilter === 'IN_PROGRESS'
              ? completion !== null && completion > 0 && completion < 100
              : completion === 100

      return (
        matchesSearch && matchesArea && matchesApplication && matchesSimulator && matchesCompletion
      )
    })

    const sorted = [...filtered].sort((a, b) => {
      const robotA = a.label
      const robotB = b.label
      const areaA = a.cell.areaKey ?? 'Unknown'
      const areaB = b.cell.areaKey ?? 'Unknown'
      const appA = a.application ?? 'Unknown'
      const appB = b.application ?? 'Unknown'
      const simA = a.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'
      const simB = b.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'
      const compA =
        typeof a.cell.simulationStatus?.firstStageCompletion === 'number'
          ? a.cell.simulationStatus.firstStageCompletion
          : -1
      const compB =
        typeof b.cell.simulationStatus?.firstStageCompletion === 'number'
          ? b.cell.simulationStatus.firstStageCompletion
          : -1

      let cmp = 0
      if (sortKey === 'robot') cmp = robotA.localeCompare(robotB)
      if (sortKey === 'area') cmp = areaA.localeCompare(areaB)
      if (sortKey === 'application') cmp = appA.localeCompare(appB)
      if (sortKey === 'simulator') cmp = simA.localeCompare(simB)
      if (sortKey === 'completion') cmp = compA - compB

      return sortDir === 'asc' ? cmp : -cmp
    })

    return sorted
  }, [
    robotRows,
    search,
    sortDir,
    sortKey,
    areaFilter,
    applicationFilter,
    simulatorFilter,
    completionFilter,
  ])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="inline h-3.5 w-3.5 ml-1 opacity-40" />
    return sortDir === 'asc' ? (
      <ArrowUp className="inline h-3.5 w-3.5 ml-1 text-blue-500" />
    ) : (
      <ArrowDown className="inline h-3.5 w-3.5 ml-1 text-blue-500" />
    )
  }

  if (cells.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
        No stations available. Load data to see results.
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search + reset */}
      <div className="flex items-center gap-2 pb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search units..."
          className="flex-1 text-xs font-bold uppercase tracking-widest rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
        />
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] px-4 py-3 text-gray-500 dark:text-gray-400 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-all shadow-sm"
            title="Clear all filters"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-6">
        {[
          { value: areaFilter, setter: setAreaFilter, options: areaOptions, label: 'Area' },
          {
            value: applicationFilter,
            setter: setApplicationFilter,
            options: applicationOptions,
            label: 'Application',
          },
          {
            value: simulatorFilter,
            setter: setSimulatorFilter,
            options: simulatorOptions,
            label: 'Simulator',
          },
        ].map((filter, idx) => (
          <select
            key={idx}
            className="text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:border-indigo-500 transition-all shadow-sm"
            value={filter.value}
            onChange={(e) => filter.setter(e.target.value)}
          >
            {filter.options.map((opt) => (
              <option
                key={opt}
                value={opt}
                className="bg-white dark:bg-[rgb(31,41,55)] text-gray-900 dark:text-white"
              >
                {opt === 'ALL' ? `All ${filter.label}s` : opt}
              </option>
            ))}
          </select>
        ))}
        <select
          className="text-[10px] font-black uppercase tracking-widest rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer hover:border-indigo-500 transition-all shadow-sm"
          value={completionFilter}
          onChange={(e) => setCompletionFilter(e.target.value as any)}
        >
          <option value="ALL" className="bg-white dark:bg-[rgb(31,41,55)]">
            All Sync Status
          </option>
          <option value="NOT_STARTED" className="bg-white dark:bg-[rgb(31,41,55)]">
            Pending (0%)
          </option>
          <option value="IN_PROGRESS" className="bg-white dark:bg-[rgb(31,41,55)]">
            Syncing (1-99%)
          </option>
          <option value="COMPLETE" className="bg-white dark:bg-[rgb(31,41,55)]">
            Complete (100%)
          </option>
        </select>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between pb-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Showing{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {filteredAndSorted.length}
          </span>
          {filteredAndSorted.length !== robotRows.length && (
            <>
              {' '}
              of{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">
                {robotRows.length}
              </span>
            </>
          )}{' '}
          robots
        </span>
        <span className="text-gray-400 dark:text-gray-500">
          Sorted by {sortKey} ({sortDir === 'asc' ? 'A\u2192Z' : 'Z\u2192A'})
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 max-h-[535px] overflow-auto custom-scrollbar">
        <table className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th
                className="py-3 pl-4 pr-3 sm:pl-6 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('robot')}
              >
                Robot <SortIcon column="robot" />
              </th>
              <th
                className="w-1 py-3 px-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('area')}
              >
                Area <SortIcon column="area" />
              </th>
              <th
                className="w-1 whitespace-nowrap py-3 px-0.5 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('application')}
              >
                Application <SortIcon column="application" />
              </th>
              <th
                className="w-1 whitespace-nowrap py-3 px-0.5 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('simulator')}
              >
                Simulator <SortIcon column="simulator" />
              </th>
              <th
                className="w-1 whitespace-nowrap py-3 px-0.5 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('completion')}
              >
                Sync <SortIcon column="completion" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500">
                  No robots match the current filters.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((row) => (
                <tr
                  key={`${row.cell.stationKey}-${row.label}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => onSelect(row)}
                >
                  <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                    {row.assetId ? (
                      <Link
                        to={`/assets/${encodeURIComponent(row.assetId)}`}
                        className="font-medium text-blue-600 dark:text-blue-400 block truncate max-w-[240px] hover:underline"
                        title={`Open asset ${row.assetId}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.label}
                      </Link>
                    ) : (
                      <span
                        className="font-medium text-gray-500 dark:text-gray-400 block truncate max-w-[240px]"
                        title="No matching asset found"
                      >
                        {row.label}
                      </span>
                    )}
                  </td>
                  <td className="w-1 whitespace-nowrap px-3 py-3 text-gray-500 dark:text-gray-400">
                    {row.cell.projectId ? (
                      <Link
                        to={`/projects/${row.cell.projectId}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.cell.areaKey ?? 'Unknown'}
                      </Link>
                    ) : (
                      (row.cell.areaKey ?? 'Unknown')
                    )}
                  </td>
                  <td className="w-1 whitespace-nowrap px-0.5 py-3 text-gray-500 dark:text-gray-400">
                    {row.application ?? 'Unknown'}
                  </td>
                  <td className="w-1 whitespace-nowrap px-0.5 py-3 text-gray-700 dark:text-gray-300">
                    <Link
                      to={`/engineers?highlightEngineer=${encodeURIComponent(row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED')}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      title={row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'}
                    </Link>
                  </td>
                  <td className="w-1 whitespace-nowrap px-0.5 py-3">
                    {typeof row.cell.simulationStatus?.firstStageCompletion === 'number' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              row.cell.simulationStatus.firstStageCompletion >= 90
                                ? 'bg-emerald-500'
                                : row.cell.simulationStatus.firstStageCompletion >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(0, row.cell.simulationStatus.firstStageCompletion))}%`,
                            }}
                          />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {Math.round(row.cell.simulationStatus.firstStageCompletion)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RobotSimulationPage() {
  const { cells, loading, hasData } = useCrossRefData()
  // Only show cells that have actual simulation status data (not equipment-only entries)
  const tableCells = useMemo(() => {
    if (!hasData) return []
    return cells.filter((c) => {
      const sim = c.simulationStatus
      if (!sim) return false
      return (
        sim.firstStageCompletion != null ||
        sim.panelMilestones != null ||
        (sim.application != null && sim.application.trim() !== '') ||
        (sim.engineer != null && sim.engineer.trim() !== '')
      )
    })
  }, [cells, hasData])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedRow, setSelectedRow] = useState<StationRow | null>(null)

  // Debug: Log panel milestones data when selection changes
  useEffect(() => {
    if (selectedRow) {
      const cell = selectedRow.cell
      log.debug('[RobotSimulationPage] Selected row:', {
        stationKey: cell.stationKey,
        displayCode: cell.displayCode,
        hasSimulationStatus: !!cell.simulationStatus,
        hasPanelMilestones: !!cell.simulationStatus?.panelMilestones,
        panelMilestones: cell.simulationStatus?.panelMilestones,
        robotSimulationCompletion:
          cell.simulationStatus?.panelMilestones?.robotSimulation?.completion,
      })
    }
  }, [selectedRow])

  // Debug: Log cells data on mount
  useEffect(() => {
    if (hasData && cells.length > 0) {
      const cellsWithPanelMilestones = cells.filter((c) => c.simulationStatus?.panelMilestones)
      log.debug('[RobotSimulationPage] Cells loaded:', {
        totalCells: cells.length,
        cellsWithSimulationStatus: cells.filter((c) => c.simulationStatus).length,
        cellsWithPanelMilestones: cellsWithPanelMilestones.length,
        sampleCell: cells[0]
          ? {
              stationKey: cells[0].stationKey,
              hasPanelMilestones: !!cells[0].simulationStatus?.panelMilestones,
            }
          : null,
      })
    }
  }, [hasData, cells])

  // Preselect row from query params (station & robot) after data loads
  useEffect(() => {
    if (!hasData || selectedRow) return
    const stationParam = searchParams.get('station')
    const robotParam = searchParams.get('robot')
    if (!stationParam || !robotParam) return

    // Find matching cell and robot label
    const matchCell = cells.find((c) => c.stationKey === stationParam)
    if (!matchCell) return

    const candidateLabels: string[] = []
    if (matchCell.robots && matchCell.robots.length > 0) {
      for (const robot of matchCell.robots) {
        candidateLabels.push(formatRobotLabel({ ...matchCell, robots: [robot] }))
      }
    } else {
      candidateLabels.push(formatRobotLabel(matchCell))
    }

    const labelMatch = candidateLabels.find((l) => l === robotParam)
    if (!labelMatch) return

    // Recreate StationRow minimal object
    const row: StationRow = {
      cell: matchCell,
      label: labelMatch,
      application: matchCell.simulationStatus?.application ?? 'Unknown',
    }
    setSelectedRow(row)
  }, [hasData, cells, selectedRow, searchParams])

  if (!loading && tableCells.length === 0) {
    return (
      <div className="space-y-8 pb-4">
        <div className="flex flex-col gap-4">
          <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 dark:text-gray-200">Robot Status</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1">
              <h2 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-1">
                Simulation Integrity
              </h2>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
                Robot <span className="text-indigo-600 dark:text-indigo-400">Status</span>
              </h1>
            </div>
          </div>
        </div>

        <EmptyState
          title="No Robot Data"
          message="Load simulation data from the Data Loader to see robot status here."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => navigate('/data-loader')}
          icon={<Bot className="h-7 w-7" />}
        />
      </div>
    )
  }

  const avgCompletion =
    tableCells.length > 0
      ? Math.round(
          tableCells.reduce((acc, c) => acc + (c.simulationStatus?.firstStageCompletion || 0), 0) /
            tableCells.length,
        )
      : 0

  return (
    <div className="space-y-8 pb-4">
      {/* Premium Header / Breadcrumbs */}
      <div className="flex flex-col gap-4">
        <nav className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-900 dark:text-gray-200">Robot Status</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
              Robot <span className="text-indigo-600 dark:text-indigo-400">Status</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 shadow-sm flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">
                  Sync Status
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                  Active Connection
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Total Units"
            value={tableCells.length}
            icon={<Bot className="h-6 w-6 text-indigo-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-indigo-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Work Nodes"
            value={new Set(tableCells.map((c) => c.stationKey)).size}
            icon={<Target className="h-6 w-6 text-emerald-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-emerald-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Avg Sync"
            value={`${avgCompletion}%`}
            icon={<Activity className="h-6 w-6 text-amber-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-amber-500/50 transition-colors"
          />
        </div>
        <div className="relative group cursor-default">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000" />
          <StatCard
            title="Project Areas"
            value={new Set(tableCells.map((c) => c.areaKey)).size}
            icon={<Layers className="h-6 w-6 text-purple-500" />}
            className="relative border border-gray-200 dark:border-white/10 bg-white dark:bg-[rgb(31,41,55)] shadow-sm group-hover:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        <section className="lg:basis-[65%] lg:max-w-[65%] bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm p-4 flex flex-col h-fit">
          <div className="overflow-hidden min-h-0">
            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading stations...</div>
            ) : (
              <RobotSimulationStationsTable
                cells={tableCells}
                onSelect={(row) => setSelectedRow(row)}
              />
            )}
          </div>
        </section>

        <section className="flex-1 lg:flex-none lg:basis-[35%] lg:max-w-[35%] bg-white dark:bg-[rgb(31,41,55)] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm p-4 flex flex-col min-h-0 h-full overflow-hidden">
          {selectedRow ? (
            <div className="space-y-4 flex-1 min-h-0 h-full">
              <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 p-4 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                      {selectedRow.label}
                    </h2>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
                        <Target className="h-3 w-3" />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                        Station {selectedRow.cell.stationKey}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    {(() => {
                      const completion = parseFloat(getRowOverallCompletion(selectedRow)) || 0
                      return (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-white text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                            completion >= 100
                              ? 'bg-green-500'
                              : completion >= 50
                                ? 'bg-indigo-500'
                                : completion > 0
                                  ? 'bg-amber-400'
                                  : 'bg-gray-400'
                          }`}
                        >
                          {getRowOverallCompletion(selectedRow)}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                <div className="my-4 border-t border-gray-200 dark:border-white/5" />

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                      Simulator
                    </span>
                    <Link
                      to={`/engineers?highlightEngineer=${encodeURIComponent(selectedRow.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED')}`}
                      className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight hover:underline flex items-center gap-1.5"
                    >
                      {selectedRow.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'}
                    </Link>
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                      Application
                    </span>
                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                      {selectedRow.cell.simulationStatus?.application ?? 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex-1 min-h-0 max-h-[535px] overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-1 gap-3">
                  {PANEL_CONFIGS.map(({ title, panelType, slug }) => {
                    const completion = getRowPanelMilestones(selectedRow, panelType)
                    const hasData = completion !== null
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() =>
                          navigate(
                            `/robot-simulation/${slug}?robot=${encodeURIComponent(selectedRow.label)}&station=${encodeURIComponent(selectedRow.cell.stationKey)}`,
                          )
                        }
                        className="w-full text-left rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/5 p-4 hover:border-indigo-500/50 hover:bg-white dark:hover:bg-white/10 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {title}
                          </span>
                          <span
                            className={
                              hasData
                                ? 'text-xs font-black tabular-nums text-gray-900 dark:text-white'
                                : 'text-xs font-black tabular-nums text-gray-400'
                            }
                          >
                            {hasData ? `${completion}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-200 dark:bg-white/5 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              hasData
                                ? completion >= 100
                                  ? 'bg-green-500'
                                  : completion >= 50
                                    ? 'bg-indigo-500'
                                    : completion > 0
                                      ? 'bg-amber-400'
                                      : 'bg-gray-300 dark:bg-gray-600'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                            style={{ width: hasData ? `${completion}%` : '0%' }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="p-4 rounded-full bg-gray-50 dark:bg-white/5 text-gray-300 mb-4">
                <Bot className="h-12 w-12 opacity-20" />
              </div>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">
                Select Robot
              </h3>
              <p className="text-[10px] font-bold text-gray-500 max-w-[200px] mt-2">
                Pick a robot from the registry to view its simulation status.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default RobotSimulationPage
