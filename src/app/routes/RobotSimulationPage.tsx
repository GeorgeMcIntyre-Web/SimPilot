import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'
import { PageHeader } from '../../ui/components/PageHeader'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'
import {
  PanelType,
  PanelMilestones,
} from '../../ingestion/simulationStatus/simulationStatusTypes'

const formatRobotLabel = (cell: CellSnapshot): string => {
  const robotCaptions = (cell.robots || [])
    .map(r => r.caption || r.robotKey)
    .filter(Boolean)
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

const formatCompletionValue = (cell: CellSnapshot): string => {
  const value = cell.simulationStatus?.firstStageCompletion
  if (typeof value !== 'number') return '-'
  return `${Math.round(value)}%`
}

/**
 * Get completion percentage for a specific panel from panelMilestones
 */
const getPanelCompletion = (
  panelMilestones: PanelMilestones | undefined,
  panelType: PanelType
): number | null => {
  if (!panelMilestones) return null
  const group = panelMilestones[panelType]
  if (!group) return null
  const values = Object.values(group.milestones)
  const hasNumeric = values.some(v => typeof v === 'number')
  if (!hasNumeric) return null
  return group.completion
}

const getRowPanelMilestones = (row: StationRow, panelType: PanelType): number | null => {
  // Prefer per-robot milestones if available
  const perRobotPanels = row.cell.simulationStatus?.robotPanelMilestones
  if (perRobotPanels) {
    let robotPanels = perRobotPanels[row.label]
    if (!robotPanels) {
      // Try case-insensitive match
      const upperLabel = row.label.toUpperCase()
      const matchKey = Object.keys(perRobotPanels).find(k => k.toUpperCase() === upperLabel)
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
  { title: 'Alternative Joining Applications', panelType: 'alternativeJoining', slug: 'alternative-joining-applications' },
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
function RobotSimulationStationsTable({ cells, onSelect }: { cells: CellSnapshot[]; onSelect: (row: StationRow) => void }) {
  type SortKey = 'robot' | 'area' | 'application' | 'simulator' | 'completion'

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('robot')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [areaFilter, setAreaFilter] = useState<string>('ALL')
  const [applicationFilter, setApplicationFilter] = useState<string>('ALL')
  const [simulatorFilter, setSimulatorFilter] = useState<string>('ALL')
  const [completionFilter, setCompletionFilter] = useState<'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'>('ALL')

  const hasActiveFilters = areaFilter !== 'ALL' || applicationFilter !== 'ALL' || simulatorFilter !== 'ALL' || completionFilter !== 'ALL' || search.trim() !== ''

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
            ((robot.raw as any)?.metadata?.application ??
              (robot.raw as any)?.metadata?.function ??
              // Simulation-status robots keep application at root, not metadata
              (robot.raw as any)?.application ??
              cell.simulationStatus?.application ??
              'Unknown')
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
    cells.forEach(c => set.add(c.areaKey ?? 'Unknown'))
    return ['ALL', ...Array.from(set).sort()]
  }, [cells])

  const applicationOptions = useMemo(() => {
    const set = new Set<string>()
    cells.forEach(c => {
      const app = c.simulationStatus?.application?.trim()
      set.add(app && app.length > 0 ? app : 'Unknown')
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [cells])

  const simulatorOptions = useMemo(() => {
    const set = new Set<string>()
    cells.forEach(c => {
      const sim = c.simulationStatus?.engineer?.trim()
      set.add(sim && sim.length > 0 ? sim : 'UNASSIGNED')
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [cells])

  const filteredAndSorted = useMemo(() => {
    const term = search.trim().toLowerCase()

    const filtered = robotRows.filter(row => {
      const robot = row.label.toLowerCase()
      const area = (row.cell.areaKey ?? 'Unknown')
      const applicationRaw = row.cell.simulationStatus?.application?.trim() || 'Unknown'
      const simulatorRaw = row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'
      const simulator = simulatorRaw.toLowerCase()
      const completionVal = row.cell.simulationStatus?.firstStageCompletion
      const completion = typeof completionVal === 'number' ? completionVal : null

      const matchesSearch = term
        ? robot.includes(term) || area.toLowerCase().includes(term) || simulator.includes(term) || applicationRaw.toLowerCase().includes(term)
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

      return matchesSearch && matchesArea && matchesApplication && matchesSimulator && matchesCompletion
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
      const compA = typeof a.cell.simulationStatus?.firstStageCompletion === 'number'
        ? a.cell.simulationStatus.firstStageCompletion
        : -1
      const compB = typeof b.cell.simulationStatus?.firstStageCompletion === 'number'
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
  }, [robotRows, search, sortDir, sortKey, areaFilter, applicationFilter, simulatorFilter, completionFilter])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="inline h-3.5 w-3.5 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="inline h-3.5 w-3.5 ml-1 text-blue-500" />
      : <ArrowDown className="inline h-3.5 w-3.5 ml-1 text-blue-500" />
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
      <div className="flex items-center gap-2 pb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search robot, area, simulator, application..."
          className="flex-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
            title="Clear all filters"
          >
            <X className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Filter dropdowns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pb-3">
        <select
          className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2"
          value={areaFilter}
          onChange={e => setAreaFilter(e.target.value)}
        >
          {areaOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt === 'ALL' ? 'All Areas' : opt}
            </option>
          ))}
        </select>
        <select
          className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2"
          value={applicationFilter}
          onChange={e => setApplicationFilter(e.target.value)}
        >
          {applicationOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt === 'ALL' ? 'All Applications' : opt}
            </option>
          ))}
        </select>
        <select
          className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2"
          value={simulatorFilter}
          onChange={e => setSimulatorFilter(e.target.value)}
        >
          {simulatorOptions.map(opt => (
            <option key={opt} value={opt}>
              {opt === 'ALL' ? 'All Simulators' : opt}
            </option>
          ))}
        </select>
        <select
          className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-2"
          value={completionFilter}
          onChange={e => setCompletionFilter(e.target.value as any)}
        >
          <option value="ALL">All Completion</option>
          <option value="NOT_STARTED">Not Started (0%)</option>
          <option value="IN_PROGRESS">In Progress (1-99%)</option>
          <option value="COMPLETE">Complete (100%)</option>
        </select>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between pb-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Showing <span className="font-semibold text-gray-700 dark:text-gray-200">{filteredAndSorted.length}</span>
          {filteredAndSorted.length !== robotRows.length && (
            <> of <span className="font-semibold text-gray-700 dark:text-gray-200">{robotRows.length}</span></>
          )} robots
        </span>
        <span className="text-gray-400 dark:text-gray-500">
          Sorted by {sortKey} ({sortDir === 'asc' ? 'A\u2192Z' : 'Z\u2192A'})
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto max-h-[680px] custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th
                className="py-3 pl-4 pr-3 sm:pl-6 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('robot')}
              >
                Robot <SortIcon column="robot" />
              </th>
              <th
                className="py-3 px-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('area')}
              >
                Area <SortIcon column="area" />
              </th>
              <th
                className="py-3 px-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('application')}
              >
                Application <SortIcon column="application" />
              </th>
              <th
                className="py-3 px-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('simulator')}
              >
                Simulator <SortIcon column="simulator" />
              </th>
              <th
                className="py-3 px-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                onClick={() => toggleSort('completion')}
              >
                Completion <SortIcon column="completion" />
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
            filteredAndSorted.map(row => (
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
                    onClick={e => e.stopPropagation()}
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
                <td className="whitespace-nowrap px-3 py-3 text-gray-500 dark:text-gray-400">
                  {row.cell.areaKey ?? 'Unknown'}
                </td>
              <td className="whitespace-nowrap px-3 py-3 text-gray-500 dark:text-gray-400">
                {row.application ?? 'Unknown'}
              </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-700 dark:text-gray-300">
                  {row.cell.simulationStatus?.engineer?.trim() ? (
                    <Link
                      to={`/engineers?highlightEngineer=${encodeURIComponent(row.cell.simulationStatus.engineer.trim())}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      title={row.cell.simulationStatus.engineer.trim()}
                    >
                      {row.cell.simulationStatus.engineer.trim()}
                    </Link>
                  ) : (
                    'UNASSIGNED'
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-700 dark:text-gray-300">
                  {formatCompletionValue(row.cell)}
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
  const tableCells = hasData ? cells : []
  const navigate = useNavigate()
  const [selectedRow, setSelectedRow] = useState<{ cell: CellSnapshot; label: string } | null>(null)

  // Debug: Log panel milestones data when selection changes
  useEffect(() => {
    if (selectedRow) {
      const cell = selectedRow.cell
      console.log('[RobotSimulationPage] Selected row:', {
        stationKey: cell.stationKey,
        displayCode: cell.displayCode,
        hasSimulationStatus: !!cell.simulationStatus,
        hasPanelMilestones: !!cell.simulationStatus?.panelMilestones,
        panelMilestones: cell.simulationStatus?.panelMilestones,
        robotSimulationCompletion: cell.simulationStatus?.panelMilestones?.robotSimulation?.completion,
      })
    }
  }, [selectedRow])

  // Debug: Log cells data on mount
  useEffect(() => {
    if (hasData && cells.length > 0) {
      const cellsWithPanelMilestones = cells.filter(c => c.simulationStatus?.panelMilestones)
      console.log('[RobotSimulationPage] Cells loaded:', {
        totalCells: cells.length,
        cellsWithSimulationStatus: cells.filter(c => c.simulationStatus).length,
        cellsWithPanelMilestones: cellsWithPanelMilestones.length,
        sampleCell: cells[0] ? {
          stationKey: cells[0].stationKey,
          hasPanelMilestones: !!cells[0].simulationStatus?.panelMilestones
        } : null
      })
    }
  }, [hasData, cells])

  return (
    <div className="space-y-6">
      <PageHeader title="Robot Status" />

      <div className="flex flex-col lg:flex-row gap-6">
        <section className="flex-1 lg:flex-none lg:basis-[65%] lg:max-w-[65%] bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col">
          <div className="flex-1 overflow-hidden">
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

        <section className="flex-1 lg:flex-none lg:basis-[35%] lg:max-w-[35%] bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col min-h-0 h-full overflow-hidden">
          {selectedRow ? (
              <div className="space-y-3 flex-1 min-h-0 h-full">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm">
                {/* Top row: Robot name + badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight truncate">
                      {selectedRow.label}
                    </h2>
                    <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Station {selectedRow.cell.stationKey}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 ring-1 ring-inset ring-blue-200 dark:ring-blue-700">
                      {selectedRow.cell.areaKey ?? 'Unknown'}
                    </span>
                    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 ring-1 ring-inset ring-amber-200 dark:ring-amber-700">
                      {selectedRow.cell.simulationStatus?.application ?? 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-3 border-t border-gray-200 dark:border-gray-700" />

                {/* Metadata row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Simulator</span>
                    {selectedRow.cell.simulationStatus?.engineer?.trim() ? (
                      <Link
                        to={`/engineers?highlightEngineer=${encodeURIComponent(selectedRow.cell.simulationStatus.engineer.trim())}`}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {selectedRow.cell.simulationStatus.engineer.trim()}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Unassigned</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Completion</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCompletionValue(selectedRow.cell)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex-1 min-h-0 flex flex-col overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                  {PANEL_CONFIGS.map(({ title, panelType, slug }) => {
                    const completion = getRowPanelMilestones(selectedRow, panelType)
                    const hasData = completion !== null
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() => navigate(`/robot-simulation/${slug}?robot=${encodeURIComponent(selectedRow.label)}&station=${encodeURIComponent(selectedRow.cell.stationKey)}`)}
                        className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:border-blue-300 dark:hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <div className="flex items-start justify-between text-sm font-semibold text-gray-900 dark:text-white gap-2">
                          <span className="whitespace-normal leading-tight">{title}</span>
                          <span className={hasData ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}>
                            {hasData ? `${completion}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              hasData
                                ? completion === 100
                                  ? 'bg-green-500'
                                  : completion > 0
                                    ? 'bg-blue-500'
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
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a station to see details here.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export default RobotSimulationPage
