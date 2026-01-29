import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
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

/**
 * Panel configuration for the aspect buttons
 * Maps display title to panel type and URL slug
 */
const PANEL_CONFIGS: { title: string; panelType: PanelType; slug: string }[] = [
  { title: 'Robot Simulation', panelType: 'robotSimulation', slug: 'robot-simulation' },
  { title: 'Spot Welding', panelType: 'spotWelding', slug: 'spot-welding' },
  { title: 'Sealer', panelType: 'sealer', slug: 'sealer' },
  { title: 'Alternative Joining Applications', panelType: 'alternativeJoining', slug: 'alternative-joining-applications' },
  { title: 'Gripper', panelType: 'gripper', slug: 'gripper' },
  { title: 'Fixture', panelType: 'fixture', slug: 'fixture' },
  { title: 'Multi Resource Simulation', panelType: 'mrs', slug: 'mrs' },
  { title: 'OLP', panelType: 'olp', slug: 'olp' },
  { title: 'Documentation', panelType: 'documentation', slug: 'documentation' },
  { title: 'Layout', panelType: 'layout', slug: 'layout' },
  { title: 'Safety', panelType: 'safety', slug: 'safety' },
]

type StationRow = { cell: CellSnapshot; label: string }

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
  const [simulatorFilter, setSimulatorFilter] = useState<string>('ALL')
  const [completionFilter, setCompletionFilter] = useState<'ALL' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'>('ALL')

  const robotRows = useMemo(() => {
    const rows: StationRow[] = []
    for (const cell of cells) {
      if (cell.robots && cell.robots.length > 0) {
        for (const robot of cell.robots) {
          const label = formatRobotLabel({ ...cell, robots: [robot] })
          rows.push({ cell, label })
        }
      } else {
        const label = formatRobotLabel(cell)
        rows.push({ cell, label })
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
      const simulatorRaw = row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'
      const simulator = simulatorRaw.toLowerCase()
      const completionVal = row.cell.simulationStatus?.firstStageCompletion
      const completion = typeof completionVal === 'number' ? completionVal : null

      const matchesSearch = term
        ? robot.includes(term) || area.toLowerCase().includes(term) || simulator.includes(term)
        : true

      const matchesArea = areaFilter === 'ALL' || area === areaFilter
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

      return matchesSearch && matchesArea && matchesSimulator && matchesCompletion
    })

    const sorted = [...filtered].sort((a, b) => {
      const robotA = a.label
      const robotB = b.label
      const areaA = a.cell.areaKey ?? 'Unknown'
      const areaB = b.cell.areaKey ?? 'Unknown'
      const appA = a.cell.simulationStatus?.application ?? 'Unknown'
      const appB = b.cell.simulationStatus?.application ?? 'Unknown'
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
  }, [robotRows, search, sortDir, sortKey])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
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
      <div className="flex items-center justify-between gap-3 pb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search robot, area, simulator, application..."
          className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pb-3">
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
          <option value="ALL">All Completion States</option>
          <option value="NOT_STARTED">Not Started (0% / blank)</option>
          <option value="IN_PROGRESS">In Progress (1-99%)</option>
          <option value="COMPLETE">Complete (100%)</option>
        </select>
      </div>
      <div className="flex-1 overflow-auto max-h-[680px] custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th
                className="py-3 pl-4 pr-3 sm:pl-6 cursor-pointer select-none"
                onClick={() => toggleSort('robot')}
              >
                Robot
              </th>
              <th
                className="py-3 px-3 cursor-pointer select-none"
                onClick={() => toggleSort('area')}
              >
                Area
              </th>
              <th
                className="py-3 px-3 cursor-pointer select-none"
                onClick={() => toggleSort('application')}
              >
                Application
              </th>
              <th
                className="py-3 px-3 cursor-pointer select-none"
                onClick={() => toggleSort('simulator')}
              >
                Simulator
              </th>
              <th
                className="py-3 px-3 cursor-pointer select-none"
                onClick={() => toggleSort('completion')}
              >
                Completion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
          {filteredAndSorted.map(row => (
            <tr
              key={`${row.cell.stationKey}-${row.label}`}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={() => onSelect(row)}
            >
              <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                <span className="font-medium text-blue-600 dark:text-blue-400 block truncate max-w-[240px]">
                  {row.label}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-gray-500 dark:text-gray-400">
                {row.cell.areaKey ?? 'Unknown'}
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-gray-500 dark:text-gray-400">
                {row.cell.simulationStatus?.application ?? 'Unknown'}
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
          ))}
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
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedRow.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Station {selectedRow.cell.stationKey}{' '}
                      <span className="mx-1">•</span>
                      Application{' '}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {selectedRow.cell.simulationStatus?.application ?? 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-100 dark:border-blue-800">
                      {selectedRow.cell.areaKey ?? 'Unknown'}
                    </div>
                    <div className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-100 dark:border-amber-800">
                      {selectedRow.cell.simulationStatus?.application ?? 'Unknown'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Simulator</span>
                    {selectedRow.cell.simulationStatus?.engineer?.trim() ? (
                      <Link
                        to={`/engineers?highlightEngineer=${encodeURIComponent(selectedRow.cell.simulationStatus.engineer.trim())}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {selectedRow.cell.simulationStatus.engineer.trim()}
                      </Link>
                    ) : (
                      <span className="text-gray-500">UNASSIGNED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Completion</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCompletionValue(selectedRow.cell)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex-1 min-h-0 flex flex-col overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                  {PANEL_CONFIGS.map(({ title, panelType, slug }) => {
                    const panelMilestones = selectedRow.cell.simulationStatus?.panelMilestones
                    const completion = getPanelCompletion(panelMilestones, panelType)
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
