import { useState, useMemo } from 'react';
import { CellSnapshot } from '../../../domain/crossRef/CrossRefTypes';
import {
  filterBySeverity,
  filterByArea,
  filterBySearch,
  sortCells,
  SortKey,
  SortDirection,
  SeverityFilter,
} from '../dashboardUtils';

const PAGE_SIZE = 10;

export function useStationsFiltering(cells: CellSnapshot[], selectedArea: string | null) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const density: 'compact' = 'compact';

  // Apply filters and sorting
  const filteredCells = useMemo(() => {
    let result = cells;

    // Apply area filter
    result = filterByArea(result, selectedArea);

    // Apply severity filter
    result = filterBySeverity(result, severityFilter);

    // Apply search filter
    result = filterBySearch(result, searchTerm);

    // Apply sorting
    result = sortCells(result, sortKey, sortDirection);

    setPage(1); // reset page when filters change
    return result;
  }, [cells, selectedArea, severityFilter, searchTerm, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredCells.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCells = filteredCells.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (direction: 'prev' | 'next') => {
    setPage((prev) => {
      if (direction === 'prev') return Math.max(1, prev - 1);
      return Math.min(totalPages, prev + 1);
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('desc');
  };

  return {
    // State
    searchTerm,
    severityFilter,
    sortKey,
    sortDirection,
    currentPage,
    totalPages,

    // Setters
    setSearchTerm,
    setSeverityFilter,

    // Handlers
    handleSort,
    handlePageChange,

    // Filtered data
    filteredCells,
    pagedCells,
  };
}
