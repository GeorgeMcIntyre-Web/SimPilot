// Simulation Filters Bar
// Filter controls for Program, Plant, Unit hierarchy
// Uses derived selectors for filter options

import { Search, X, Filter, ArrowUpDown, Maximize2, Minimize2 } from 'lucide-react'
import { usePrograms, usePlants, useUnits } from '../simulationStore'
import type { SimulationFilters } from '../simulationSelectors'
import { cn } from '../../../ui/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

export type SortOption = 'line-asc' | 'line-desc' | 'stations-asc' | 'stations-desc' | 'robots-asc' | 'robots-desc'

interface SimulationFiltersBarProps {
  filters: SimulationFilters
  onFiltersChange: (filters: SimulationFilters) => void
  sortBy?: SortOption
  onSortChange?: (sortBy: SortOption) => void
  onExpandAll?: () => void
  onCollapseAll?: () => void
  allExpanded?: boolean
  allCollapsed?: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'line-asc', label: 'Line (A-Z)' },
  { value: 'line-desc', label: 'Line (Z-A)' },
  { value: 'stations-asc', label: 'Stations (Low-High)' },
  { value: 'stations-desc', label: 'Stations (High-Low)' },
  { value: 'robots-asc', label: 'Robots (Low-High)' },
  { value: 'robots-desc', label: 'Robots (High-Low)' }
]

export function SimulationFiltersBar({
  filters,
  onFiltersChange,
  sortBy = 'line-asc',
  onSortChange,
  onExpandAll,
  onCollapseAll,
  allExpanded = false,
  allCollapsed = false
}: SimulationFiltersBarProps) {
  const programs = usePrograms()
  const plants = usePlants(filters.program)
  const units = useUnits(filters.program, filters.plant)

  const handleProgramChange = (program: string | null) => {
    onFiltersChange({
      ...filters,
      program,
      plant: null,
      unit: null
    })
  }

  const handlePlantChange = (plant: string | null) => {
    onFiltersChange({
      ...filters,
      plant,
      unit: null
    })
  }

  const handleUnitChange = (unit: string | null) => {
    onFiltersChange({
      ...filters,
      unit
    })
  }

  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({
      ...filters,
      searchTerm
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      program: null,
      plant: null,
      unit: null,
      searchTerm: ''
    })
  }

  const hasActiveFilters = filters.program !== null ||
    filters.plant !== null ||
    filters.unit !== null ||
    filters.searchTerm !== ''

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="ml-auto text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Main Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        {/* Search */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Station, line..."
              className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Program Select */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Program
          </label>
          <select
            value={filters.program ?? ''}
            onChange={(e) => handleProgramChange(e.target.value === '' ? null : e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Programs</option>
            {programs.map(program => (
              <option key={program} value={program}>{program}</option>
            ))}
          </select>
        </div>

        {/* Plant Select */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Plant
          </label>
          <select
            value={filters.plant ?? ''}
            onChange={(e) => handlePlantChange(e.target.value === '' ? null : e.target.value)}
            disabled={filters.program === null}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Plants</option>
            {plants.map(plant => (
              <option key={plant} value={plant}>{plant}</option>
            ))}
          </select>
        </div>

        {/* Unit Select */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Unit
          </label>
          <select
            value={filters.unit ?? ''}
            onChange={(e) => handleUnitChange(e.target.value === '' ? null : e.target.value)}
            disabled={filters.plant === null}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Units</option>
            {units.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sort & Expand Controls Row */}
      {onSortChange && onExpandAll && onCollapseAll && (
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            <label htmlFor="sort-select" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Sort:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className={cn(
                "text-xs rounded-md border-gray-300 dark:border-gray-600",
                "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
                "focus:ring-blue-500 focus:border-blue-500",
                "px-2.5 py-1"
              )}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Expand/Collapse All Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onExpandAll}
              disabled={allExpanded}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                allExpanded
                  ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              )}
            >
              <Maximize2 className="h-3 w-3" />
              Expand All
            </button>
            <button
              onClick={onCollapseAll}
              disabled={allCollapsed}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                allCollapsed
                  ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              )}
            >
              <Minimize2 className="h-3 w-3" />
              Collapse All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
