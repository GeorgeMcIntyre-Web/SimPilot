// Simulation Filters Bar
// Filter controls for Program, Plant, Unit hierarchy
// Uses derived selectors for filter options

import { Search, Filter, ArrowUpDown, Maximize2, Minimize2 } from 'lucide-react'
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header with View Controls */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Filters</h3>
          </div>

          {/* View Controls - Sort & Expand/Collapse */}
          {onSortChange && onExpandAll && onCollapseAll && (
            <>
              <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600" />

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value as SortOption)}
                  className={cn(
                    "text-[11px] rounded border-gray-300 dark:border-gray-600",
                    "bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
                    "focus:ring-1 focus:ring-blue-500 focus:border-blue-500",
                    "px-1.5 py-0.5"
                  )}
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-600" />

              {/* Expand/Collapse Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onExpandAll}
                  disabled={allExpanded}
                  className={cn(
                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded transition-colors",
                    allExpanded
                      ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  )}
                  title="Expand all lines"
                >
                  <Maximize2 className="h-2.5 w-2.5" />
                  <span className="hidden lg:inline">Expand</span>
                </button>
                <button
                  onClick={onCollapseAll}
                  disabled={allCollapsed}
                  className={cn(
                    "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium rounded transition-colors",
                    allCollapsed
                      ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  )}
                  title="Collapse all lines"
                >
                  <Minimize2 className="h-2.5 w-2.5" />
                  <span className="hidden lg:inline">Collapse</span>
                </button>
              </div>
            </>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Main Filters Row */}
      <div className="px-3 py-2.5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {/* Search */}
          <div>
            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Station, line..."
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Program Select */}
          <div>
            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
              Program
            </label>
            <select
              value={filters.program ?? ''}
              onChange={(e) => handleProgramChange(e.target.value === '' ? null : e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Programs</option>
              {programs.map(program => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>
          </div>

          {/* Plant Select */}
          <div>
            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
              Plant
            </label>
            <select
              value={filters.plant ?? ''}
              onChange={(e) => handlePlantChange(e.target.value === '' ? null : e.target.value)}
              disabled={filters.program === null}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">All Plants</option>
              {plants.map(plant => (
                <option key={plant} value={plant}>{plant}</option>
              ))}
            </select>
          </div>

          {/* Unit Select */}
          <div>
            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5 uppercase tracking-wide">
              Unit
            </label>
            <select
              value={filters.unit ?? ''}
              onChange={(e) => handleUnitChange(e.target.value === '' ? null : e.target.value)}
              disabled={filters.plant === null}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">All Units</option>
              {units.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
