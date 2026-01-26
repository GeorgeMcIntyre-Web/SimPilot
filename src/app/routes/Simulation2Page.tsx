import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { PageHeader } from '../../ui/components/PageHeader'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'
import { normalizeStationId } from '../../domain/crossRef/CrossRefUtils'
import { coreStore } from '../../domain/coreStore'

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

function Simulation2Page() {
  const { cells, loading, hasData } = useCrossRefData()
  const tableCells = hasData ? cells : []
  const navigate = useNavigate()
  const [selectedRow, setSelectedRow] = useState<{ cell: CellSnapshot; label: string } | null>(null)

  const handleStationNavigate = (cell: CellSnapshot) => {
    const normalizedStationKey = normalizeStationId(cell.stationKey)
    if (!normalizedStationKey) return

    const { cells: legacyCells } = coreStore.getState()
    const matchingCell = legacyCells.find(c => normalizeStationId(c.code) === normalizedStationKey)
    if (matchingCell) {
      navigate(`/cells/${encodeURIComponent(matchingCell.id)}`)
    }
  }

  const Simulation2StationsTable = ({ cells, onSelect }: { cells: CellSnapshot[]; onSelect: (row: { cell: CellSnapshot; label: string }) => void }) => {
    type SortKey = 'robot' | 'area' | 'simulator' | 'completion'

    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('robot')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    const robotRows = useMemo(() => {
      const rows: { cell: CellSnapshot; label: string }[] = []
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

    const filteredAndSorted = useMemo(() => {
      const term = search.trim().toLowerCase()

      const filtered = term
        ? robotRows.filter(row => {
            const robot = row.label.toLowerCase()
            const area = (row.cell.areaKey ?? 'unknown').toLowerCase()
            const simulator = (row.cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED').toLowerCase()
            return robot.includes(term) || area.includes(term) || simulator.includes(term)
          })
        : robotRows

      const sorted = [...filtered].sort((a, b) => {
        const robotA = a.label
        const robotB = b.label
        const areaA = a.cell.areaKey ?? 'Unknown'
        const areaB = b.cell.areaKey ?? 'Unknown'
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
        if (sortKey === 'simulator') cmp = simA.localeCompare(simB)
        if (sortKey === 'completion') cmp = compA - compB

        return sortDir === 'asc' ? cmp : -cmp
      })

      return sorted
    }, [cells, search, sortDir, sortKey])

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
            placeholder="Search station, area, simulator..."
            className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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

  return (
    <div className="space-y-6">
      <PageHeader title="Simulation-2" />

      <div className="flex flex-col lg:flex-row gap-6">
        <section className="flex-1 lg:flex-none lg:basis-[40%] lg:max-w-[40%] bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Panel A</h2>
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading stations...</div>
            ) : (
              <Simulation2StationsTable
                cells={tableCells}
                onSelect={(row) => setSelectedRow(row)}
              />
            )}
          </div>
        </section>

        <section className="flex-1 lg:flex-none lg:basis-[60%] lg:max-w-[60%] bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          {selectedRow ? (
            <div className="space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedRow.label}
                </div>
                <div className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                  {selectedRow.cell.areaKey ?? 'Unknown'}
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Simulator:</span>
                  {selectedRow.cell.simulationStatus?.engineer?.trim() ? (
                    <Link
                      to={`/engineers?highlightEngineer=${encodeURIComponent(selectedRow.cell.simulationStatus.engineer.trim())}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {selectedRow.cell.simulationStatus.engineer.trim()}
                    </Link>
                  ) : (
                    'UNASSIGNED'
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Completion:</span>
                  <span className="font-semibold">{formatCompletionValue(selectedRow.cell)}</span>
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

export default Simulation2Page
