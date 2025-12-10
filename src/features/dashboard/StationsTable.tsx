// Stations Table
// Filterable, sortable table of all stations

import { useState, useMemo } from 'react'
import { Search, ArrowUpDown, Filter, X } from 'lucide-react'
import { cn } from '../../ui/lib/utils'
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes'
import { RiskBadge } from '../../ui/components/BadgePill'
import { EmptyState } from '../../ui/components/EmptyState'
import {
  getRiskLevel,
  getCompletionPercent,
  filterBySeverity,
  filterByArea,
  filterBySearch,
  sortCells,
  SortKey,
  SortDirection,
  SeverityFilter
} from './dashboardUtils'

// ============================================================================
// TYPES
// ============================================================================

interface StationsTableProps {
  cells: CellSnapshot[]
  selectedArea: string | null
  onSelectStation: (cell: CellSnapshot) => void
  onClearAreaFilter?: () => void
  variant?: 'card' | 'plain'
}

type Density = 'comfortable' | 'compact'

// ============================================================================
// FILTER CONTROLS
// ============================================================================

interface FilterControlsProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  severityFilter: SeverityFilter
  onSeverityChange: (filter: SeverityFilter) => void
  selectedArea: string | null
  onClearAreaFilter?: () => void
  resultCount: number
  totalCount: number
  density: Density
  onDensityChange: (density: Density) => void
}

function FilterControls({
  searchTerm,
  onSearchChange,
  severityFilter,
  onSeverityChange,
  selectedArea,
  onClearAreaFilter,
  resultCount,
  totalCount,
  density,
  onDensityChange
}: FilterControlsProps) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search stations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={severityFilter}
              onChange={(e) => onSeverityChange(e.target.value as SeverityFilter)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Stations</option>
              <option value="error">Critical Only</option>
              <option value="warning">At Risk Only</option>
              <option value="none">On Track Only</option>
            </select>
          </div>

          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <button
              onClick={() => onDensityChange('comfortable')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold transition-colors',
                density === 'comfortable'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              Comfy
            </button>
            <button
              onClick={() => onDensityChange('compact')}
              className={cn(
                'px-3 py-1.5 text-xs font-semibold border-l border-gray-200 dark:border-gray-700 transition-colors',
                density === 'compact'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {/* Active area filter badge */}
      {selectedArea && onClearAreaFilter && (
        <button
          onClick={onClearAreaFilter}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
        >
          <span>Area: {selectedArea}</span>
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Result count */}
      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
        Showing {resultCount} of {totalCount}
      </div>
    </div>
  )
}

// ============================================================================
// SORTABLE HEADER
// ============================================================================

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  direction: SortDirection
  onSort: (key: SortKey) => void
  className?: string
}

function SortableHeader({
  label,
  sortKey,
  currentSort,
  direction,
  onSort,
  className
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-1 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors',
        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white',
        className
      )}
    >
      <span>{label}</span>
      <ArrowUpDown className={cn(
        'h-3.5 w-3.5',
        isActive ? 'opacity-100' : 'opacity-50'
      )} />
      {isActive && (
        <span className="text-xs text-gray-400">
          {direction === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// MAIN TABLE COMPONENT
// ============================================================================

export function StationsTable({
  cells,
  selectedArea,
  onSelectStation,
  onClearAreaFilter,
  variant = 'card'
}: StationsTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('risk')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [page, setPage] = useState(1)
  const [density, setDensity] = useState<Density>('comfortable')
  const pageSize = 10

  // Apply filters and sorting
  const filteredCells = useMemo(() => {
    let result = cells

    // Apply area filter
    result = filterByArea(result, selectedArea)

    // Apply severity filter
    result = filterBySeverity(result, severityFilter)

    // Apply search filter
    result = filterBySearch(result, searchTerm)

    // Apply sorting
    result = sortCells(result, sortKey, sortDirection)

    setPage(1) // reset page when filters change
    return result
  }, [cells, selectedArea, severityFilter, searchTerm, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredCells.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedCells = filteredCells.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handlePageChange = (direction: 'prev' | 'next') => {
    setPage(prev => {
      if (direction === 'prev') return Math.max(1, prev - 1)
      return Math.min(totalPages, prev + 1)
    })
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(key)
    setSortDirection('desc')
  }

  // Empty state
  if (cells.length === 0) {
    return (
      <EmptyState
        title="No station data available"
        message="Load data in the Data Loader to see stations and risks."
      />
    )
  }

  return (
    <div className="space-y-4">
      <FilterControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        selectedArea={selectedArea}
        onClearAreaFilter={onClearAreaFilter}
        resultCount={filteredCells.length}
        totalCount={cells.length}
        density={density}
        onDensityChange={setDensity}
      />

      <div className={cn(
        variant === 'card' &&
          'overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      )}>
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm sm:pl-6">
                  <SortableHeader
                    label="Station"
                    sortKey="station"
                    currentSort={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm">
                  <SortableHeader
                    label="Area"
                    sortKey="area"
                    currentSort={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">Application</span>
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm">
                  <SortableHeader
                    label="Completion"
                    sortKey="completion"
                    currentSort={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm">
                  <SortableHeader
                    label="Flags"
                    sortKey="flags"
                    currentSort={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm">
                  <SortableHeader
                    label="Status"
                    sortKey="risk"
                    currentSort={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCells.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No stations match the current filters
                  </td>
                </tr>
              ) : (
                pagedCells.map(cell => (
                  <StationRow
                    key={cell.stationKey}
                    cell={cell}
                    density={density}
                    onClick={() => onSelectStation(cell)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
          <span>
            Page {currentPage} of {totalPages} • Showing {pagedCells.length} of {filteredCells.length} rows
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange('prev')}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition"
            >
              Prev
            </button>
            <button
              onClick={() => handlePageChange('next')}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TABLE ROW
// ============================================================================

interface StationRowProps {
  cell: CellSnapshot
  density: Density
  onClick: () => void
}

function StationRow({ cell, onClick, density }: StationRowProps) {
  const riskLevel = getRiskLevel(cell.flags)
  const completion = getCompletionPercent(cell)
  const application = cell.simulationStatus?.application ?? '-'
  const rowPad = density === 'compact' ? 'py-3' : 'py-4'
  const textSize = density === 'compact' ? 'text-xs' : 'text-sm'

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <td className={cn('whitespace-nowrap pl-4 pr-3 sm:pl-6', rowPad, textSize)}>
        <span className="font-medium text-gray-900 dark:text-white block truncate max-w-[200px]">
          {cell.stationKey}
        </span>
      </td>
      <td className={cn('whitespace-nowrap px-3 text-gray-500 dark:text-gray-400', rowPad, textSize)}>
        {cell.areaKey ?? 'Unknown'}
      </td>
      <td className={cn('whitespace-nowrap px-3 text-gray-500 dark:text-gray-400', rowPad, textSize)}>
        {application}
      </td>
      <td className={cn('whitespace-nowrap px-3', rowPad, textSize)}>
        {completion !== null ? (
          <div className="flex items-center gap-2">
            <div className={cn('rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden', density === 'compact' ? 'w-14 h-1.5' : 'w-16 h-1.5')}>
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  completion >= 90 ? 'bg-emerald-500' :
                  completion >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                )}
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {completion}%
            </span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className={cn('whitespace-nowrap px-3', rowPad, textSize)}>
        {cell.flags.length > 0 ? (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
            {cell.flags.length}
          </span>
        ) : (
          <span className="text-gray-400">0</span>
        )}
      </td>
      <td className={cn('whitespace-nowrap px-3', rowPad, textSize)}>
        <RiskBadge riskLevel={riskLevel} />
      </td>
    </tr>
  )
}
