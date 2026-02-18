import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'
import { StationRow } from './robotSimulationTypes'
import { formatRobotLabel } from './robotSimulationUtils'

type SortKey = 'robot' | 'area' | 'application' | 'simulator' | 'completion'

type Props = {
  cells: CellSnapshot[]
  onSelect: (row: StationRow) => void
}

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: SortKey
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
}) {
  if (sortKey !== column) return <ArrowUpDown className="inline h-3.5 w-3.5 ml-1 opacity-40" />
  return sortDir === 'asc' ? (
    <ArrowUp className="inline h-3.5 w-3.5 ml-1 text-blue-500" />
  ) : (
    <ArrowDown className="inline h-3.5 w-3.5 ml-1 text-blue-500" />
  )
}

export function RobotSimulationStationsTable({ cells, onSelect }: Props) {
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
          const applicationShort =
            cell.simulationStatus?.application ??
            (robot.raw as any)?.metadata?.applicationCode ??
            (robot.raw as any)?.metadata?.application ??
            (robot.raw as any)?.metadata?.function ??
            (robot.raw as any)?.application ??
            'Unknown'
          const applicationFull =
            (robot.raw as any)?.metadata?.application ??
            (robot.raw as any)?.metadata?.function ??
            (robot.raw as any)?.application ??
            cell.simulationStatus?.application ??
            applicationShort

          rows.push({ cell, label, assetId, application: applicationShort, applicationFull })
        }
      } else {
        const label = formatRobotLabel(cell)
        const assetId = cell.simulationStatus?.robotKey
        const applicationShort = cell.simulationStatus?.application ?? 'Unknown'
        rows.push({
          cell,
          label,
          assetId,
          application: applicationShort,
          applicationFull: applicationShort,
        })
      }
    }
    return rows
  }, [cells])

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

  if (cells.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
        No stations available. Load data to see results.
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
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
          Sorted by {sortKey} ({sortDir === 'asc' ? 'A→Z' : 'Z→A'})
        </span>
      </div>

      <div className="flex-1 min-h-0 max-h-[535px] overflow-auto custom-scrollbar">
        <table className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900 text-sm w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th
                className="py-3 px-3 pl-4 sm:pl-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm font-semibold"
                onClick={() => toggleSort('robot')}
              >
                Robot <SortIcon column="robot" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className="py-3 px-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm font-semibold"
                onClick={() => toggleSort('area')}
              >
                Area <SortIcon column="area" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className="py-3 px-3 whitespace-nowrap w-44 max-w-[180px] cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm font-semibold"
                onClick={() => toggleSort('application')}
              >
                Application <SortIcon column="application" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className="py-3 px-3 whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm font-semibold"
                onClick={() => toggleSort('simulator')}
              >
                Simulator <SortIcon column="simulator" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th
                className="py-3 px-3 whitespace-nowrap cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm font-semibold"
                onClick={() => toggleSort('completion')}
              >
                Sync <SortIcon column="completion" sortKey={sortKey} sortDir={sortDir} />
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
                  <td className="whitespace-nowrap py-3 px-3 pl-3 sm:pl-3">
                    {row.assetId ? (
                      <Link
                        to={`/assets/${encodeURIComponent(row.assetId)}`}
                        className="font-medium text-blue-600 dark:text-blue-400 block truncate max-w-[200px] hover:underline"
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
                  <td className="whitespace-nowrap py-3 px-3 text-gray-500 dark:text-gray-400">
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
                  <td className="whitespace-nowrap py-3 px-3 text-gray-500 dark:text-gray-400 w-44 max-w-[180px]">
                    <span
                      className="block truncate"
                      title={row.applicationFull ?? row.application ?? 'Unknown'}
                    >
                      {row.application ?? 'Unknown'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 px-3 text-gray-700 dark:text-gray-300">
                    <Link
                      to={`/engineers?highlightEngineer=${encodeURIComponent(row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED')}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      title={row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED'}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap py-3 px-3">
                    {typeof row.cell.simulationStatus?.firstStageCompletion === 'number' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
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

export default RobotSimulationStationsTable
