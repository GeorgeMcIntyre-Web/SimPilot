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

export function useStationsFiltering(cells: CellSnapshot[], selectedArea: string | null) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

    return result;
  }, [cells, selectedArea, severityFilter, searchTerm, sortKey, sortDirection]);

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

    // Setters
    setSearchTerm,
    setSeverityFilter,

    // Handlers
    handleSort,

    // Filtered data
    filteredCells,
  };
}
