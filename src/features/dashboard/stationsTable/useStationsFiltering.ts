import { useState, useMemo } from 'react'
import { CellSnapshot } from '../../../domain/crossRef/CrossRefTypes'
import {
  filterByStatus,
  filterByArea,
  filterBySearch,
  sortCells,
  SortKey,
  SortDirection,
  StatusFilter,
} from '../dashboardUtils'

export function useStationsFiltering(cells: CellSnapshot[], selectedArea: string | null) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('risk')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Apply filters and sorting
  const filteredCells = useMemo(() => {
    let result = cells

    // Apply area filter
    result = filterByArea(result, selectedArea)

    // Apply status filter
    result = filterByStatus(result, statusFilter)

    // Apply search filter
    result = filterBySearch(result, searchTerm)

    // Apply sorting
    result = sortCells(result, sortKey, sortDirection)

    return result
  }, [cells, selectedArea, statusFilter, searchTerm, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection('desc')
  }

  return {
    // State
    searchTerm,
    statusFilter,
    sortKey,
    sortDirection,

    // Setters
    setSearchTerm,
    setStatusFilter,

    // Handlers
    handleSort,

    // Filtered data
    filteredCells,
  }
}
