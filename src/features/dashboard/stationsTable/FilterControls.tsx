import { Search, Filter, X } from 'lucide-react';
import { SeverityFilter } from '../dashboardUtils';

interface FilterControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  severityFilter: SeverityFilter;
  onSeverityChange: (filter: SeverityFilter) => void;
  selectedArea: string | null;
  onClearAreaFilter?: () => void;
  resultCount: number;
  totalCount: number;
}

export function FilterControls({
  searchTerm,
  onSearchChange,
  severityFilter,
  onSeverityChange,
  selectedArea,
  onClearAreaFilter,
  resultCount,
  totalCount,
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
              <option value="all">All Statuses</option>
              <option value="Complete">Complete</option>
              <option value="Nearly Complete">Nearly Complete</option>
              <option value="On Track">On Track</option>
              <option value="In Progress">In Progress</option>
              <option value="Starting">Starting</option>
              <option value="Not Started">Not Started</option>
              <option value="No data">No data</option>
            </select>
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
      <div className="flex items-center typography-caption">
        Showing {resultCount} of {totalCount}
      </div>
    </div>
  );
}
