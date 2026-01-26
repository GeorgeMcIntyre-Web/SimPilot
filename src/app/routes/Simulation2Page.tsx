import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { PageHeader } from '../../ui/components/PageHeader'
import { useCrossRefData } from '../../hooks/useCrossRefData'
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'
import { normalizeStationId } from '../../domain/crossRef/CrossRefUtils'
import { coreStore } from '../../domain/coreStore'

function Simulation2Page() {
  const { cells, loading, hasData } = useCrossRefData()
  const tableCells = hasData ? cells : []
  const navigate = useNavigate()

  const handleStationNavigate = (cell: CellSnapshot) => {
    const normalizedStationKey = normalizeStationId(cell.stationKey)
    if (!normalizedStationKey) return

    const { cells: legacyCells } = coreStore.getState()
    const matchingCell = legacyCells.find(c => normalizeStationId(c.code) === normalizedStationKey)
    if (matchingCell) {
      navigate(`/cells/${encodeURIComponent(matchingCell.id)}`)
    }
  }

  const Simulation2StationsTable = ({ cells }: { cells: CellSnapshot[] }) => {
    type SortKey = 'station' | 'area' | 'simulator' | 'completion'

    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('station')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    const formatStationLabel = (cell: CellSnapshot): string => {
      const rawStation =
        (cell.simulationStatus?.raw as any)?.stationCode ||
        cell.displayCode ||
        cell.stationKey ||
        ''
      const trimmed = typeof rawStation === 'string' ? rawStation.trim() : ''
      if (!trimmed) return '-'
      return trimmed.replace(/_/g, '-')
    }

    const formatCompletion = (cell: CellSnapshot): string => {
      const value = cell.simulationStatus?.firstStageCompletion
      if (typeof value !== 'number') return '-'
      return `${Math.round(value)}%`
    }

    const filteredAndSorted = useMemo(() => {
      const term = search.trim().toLowerCase()

      const filtered = term
        ? cells.filter(cell => {
            const station = formatStationLabel(cell).toLowerCase()
            const area = (cell.areaKey ?? 'unknown').toLowerCase()
            const simulator = (cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED').toLowerCase()
            return station.includes(term) || area.includes(term) || simulator.includes(term)
          })
        : cells

      const sorted = [...filtered].sort((a, b) => {
        const stationA = formatStationLabel(a)
        const stationB = formatStationLabel(b)
        const areaA = a.areaKey ?? 'Unknown'
        const areaB = b.areaKey ?? 'Unknown'
        const simA = a.simulationStatus?.engineer?.trim() || 'UNASSIGNED'
        const simB = b.simulationStatus?.engineer?.trim() || 'UNASSIGNED'
        const compA = typeof a.simulationStatus?.firstStageCompletion === 'number'
          ? a.simulationStatus.firstStageCompletion
          : -1
        const compB = typeof b.simulationStatus?.firstStageCompletion === 'number'
          ? b.simulationStatus.firstStageCompletion
          : -1

        let cmp = 0
        if (sortKey === 'station') cmp = stationA.localeCompare(stationB)
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
      <div className="h-full overflow-auto max-h-[680px] custom-scrollbar">
        <div className="flex items-center justify-between gap-3 pb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search station, area, simulator..."
            className="w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900 text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th
                className="py-3 pl-4 pr-3 sm:pl-6 cursor-pointer select-none"
                onClick={() => toggleSort('station')}
              >
                Station
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
            {filteredAndSorted.map(cell => (
              <tr
                key={cell.stationKey}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                  <Link
                    to="#"
                    className="font-medium text-blue-600 dark:text-blue-400 block truncate max-w-[200px] hover:underline"
                    title={formatStationLabel(cell) === '-' ? undefined : formatStationLabel(cell)}
                    onClick={(e) => {
                      e.preventDefault()
                      handleStationNavigate(cell)
                    }}
                  >
                    {formatStationLabel(cell)}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-500 dark:text-gray-400">
                  {cell.areaKey ?? 'Unknown'}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-700 dark:text-gray-300">
                  {cell.simulationStatus?.engineer?.trim() ? (
                    <Link
                      to={`/engineers?highlightEngineer=${encodeURIComponent(cell.simulationStatus.engineer.trim())}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      title={cell.simulationStatus.engineer.trim()}
                    >
                      {cell.simulationStatus.engineer.trim()}
                    </Link>
                  ) : (
                    'UNASSIGNED'
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-gray-700 dark:text-gray-300">
                  {formatCompletion(cell)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulation-2"
        subtitle="Side-by-side workspace"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        <section className="flex-1 lg:flex-none lg:basis-[40%] lg:max-w-[40%] bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Panel A</h2>
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading stations...</div>
            ) : (
              <Simulation2StationsTable cells={tableCells} />
            )}
          </div>
        </section>

        <section className="flex-1 lg:flex-none lg:basis-[60%] lg:max-w-[60%] bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Panel B</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Right area (70%). Add primary simulation details or visualizations here.
          </p>
        </section>
      </div>
    </div>
  )
}

export default Simulation2Page
