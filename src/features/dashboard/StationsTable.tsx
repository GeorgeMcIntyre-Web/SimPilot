// Stations Table
// Filterable, sortable table of all stations

import { cn } from '../../ui/lib/utils';
import { CellSnapshot } from '../../domain/crossRef/CrossRefTypes';
import { EmptyState } from '../../ui/components/EmptyState';
import { FilterControls } from './stationsTable/FilterControls';
import { SortableHeader } from './stationsTable/SortableHeader';
import { StationRow } from './stationsTable/StationRow';
import { useStationsFiltering } from './stationsTable/useStationsFiltering';

interface StationsTableProps {
  cells: CellSnapshot[];
  selectedArea: string | null;
  onSelectStation: (cell: CellSnapshot) => void;
  onClearAreaFilter?: () => void;
  variant?: 'card' | 'plain';
}

export function StationsTable({
  cells,
  selectedArea,
  onSelectStation,
  onClearAreaFilter,
  variant = 'card',
}: StationsTableProps) {
  const {
    searchTerm,
    severityFilter,
    sortKey,
    sortDirection,
    setSearchTerm,
    setSeverityFilter,
    handleSort,
    filteredCells,
  } = useStationsFiltering(cells, selectedArea);

  // Empty state
  if (cells.length === 0) {
    return (
      <EmptyState
        title="No station data available"
        message="Load data in the Data Loader to see stations and risks."
      />
    );
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
      />

      <div
        className={cn(
          variant === 'card' &&
            'overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        )}
      >
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto custom-scrollbar">
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
                  <SortableHeader
                    label="Application"
                    sortKey="application"
                    currentSort={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm">
                  <SortableHeader
                    label="Simulator"
                    sortKey="simulator"
                    currentSort={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm">
                  <SortableHeader
                    label="Robots"
                    sortKey="robots"
                    currentSort={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
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
                    label="Status"
                    sortKey="completion"
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
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No stations match the current filters
                  </td>
                </tr>
              ) : (
                filteredCells.map((cell) => (
                  <StationRow
                    key={cell.stationKey}
                    cell={cell}
                    density="compact"
                    onClick={() => onSelectStation(cell)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
